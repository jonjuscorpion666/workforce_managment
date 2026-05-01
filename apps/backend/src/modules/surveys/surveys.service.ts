import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey, SurveyStatus, ApprovalStatus } from './entities/survey.entity';
import { Question } from './entities/question.entity';
import { AuditService } from '../audit/audit.service';
import { Config } from '../admin/entities/config.entity';
import { Response as SurveyResponse } from '../responses/entities/response.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { Program } from '../programs/entities/program.entity';

// Roles that bypass the approval workflow
const FULL_AUTHORITY_ROLES = ['SVP', 'SUPER_ADMIN'];

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)          private readonly surveyRepo:   Repository<Survey>,
    @InjectRepository(Question)        private readonly questionRepo:  Repository<Question>,
    @InjectRepository(Config)          private readonly configRepo:   Repository<Config>,
    @InjectRepository(SurveyResponse)  private readonly responseRepo:  Repository<SurveyResponse>,
    @InjectRepository(OrgUnit)         private readonly orgUnitRepo:  Repository<OrgUnit>,
    @InjectRepository(Program)         private readonly programRepo:  Repository<Program>,
    private readonly auditService: AuditService,
  ) {}

  // ── Governance helpers ────────────────────────────────────────────────────

  private async getGovernanceConfig() {
    const keys = [
      'cno_survey_requires_svp_approval',
      'cno_must_use_template',
      'director_survey_requires_approval',
      'director_max_questions',
      'manager_survey_creation_enabled',
    ];
    const rows = await this.configRepo.find({ where: keys.map((k) => ({ key: k })) });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return {
      requiresSvpApproval:         byKey['cno_survey_requires_svp_approval']    ?? true,
      mustUseTemplate:             byKey['cno_must_use_template']                ?? false,
      directorRequiresApproval:    byKey['director_survey_requires_approval']    ?? true,
      directorMaxQuestions:        byKey['director_max_questions']               ?? 5,
      managerCreationEnabled:      byKey['manager_survey_creation_enabled']      ?? false,
    };
  }

  private needsApproval(role: string, governance: { requiresSvpApproval: boolean; directorRequiresApproval: boolean }) {
    if (FULL_AUTHORITY_ROLES.includes(role)) return false;
    if (role === 'CNO')      return governance.requiresSvpApproval;
    if (role === 'DIRECTOR') return governance.directorRequiresApproval;
    return false;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(data: any, createdById: string, createdByRole?: string) {
    const { questions, ...surveyData } = data;
    const governance = await this.getGovernanceConfig();

    // Directors are server-side limited to directorMaxQuestions
    if (createdByRole === 'DIRECTOR' && questions?.length > governance.directorMaxQuestions) {
      throw new BadRequestException(
        `Directors are limited to ${governance.directorMaxQuestions} questions per survey.`,
      );
    }

    const approvalStatus = createdByRole && this.needsApproval(createdByRole, governance)
      ? ApprovalStatus.PENDING
      : ApprovalStatus.NOT_REQUIRED;

    const survey: Survey = this.surveyRepo.create({
      ...surveyData,
      createdById,
      createdByRole,
      approvalStatus,
    }) as unknown as Survey;

    if (questions?.length) {
      survey.questions = questions.map((q: any, i: number) =>
        this.questionRepo.create({ ...q, orderIndex: q.orderIndex ?? i }),
      );
    }

    const saved = await this.surveyRepo.save(survey) as unknown as Survey;
    await this.auditService.log('surveys', saved.id, 'CREATE', createdById, null, saved, saved.title);
    return saved;
  }

  async findAll(query: any) {
    const qb = this.surveyRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.questions', 'q')
      .leftJoinAndSelect('s.targetOrgUnit', 'ou')
      .where('s.isTemplate = false')           // never show templates in the normal list
      .orderBy('s.createdAt', 'DESC');

    if (query.status)         qb.andWhere('s.status = :status',                   { status: query.status });
    if (query.type)           qb.andWhere('s.type = :type',                       { type: query.type });
    if (query.orgUnitId)      qb.andWhere('s.targetOrgUnitId = :orgUnitId',       { orgUnitId: query.orgUnitId });
    if (query.approvalStatus) qb.andWhere('s.approvalStatus = :approvalStatus',   { approvalStatus: query.approvalStatus });
    if (query.createdById)    qb.andWhere('s.createdById = :createdById',         { createdById: query.createdById });

    // Focus group filter: when userId is passed (portal), exclude surveys with a focus group
    // that doesn't include this user. Surveys without a focus group are always visible.
    if (query.userId) {
      qb.andWhere(
        '(s."focusGroupUserIds" IS NULL OR s."focusGroupUserIds" = \'[]\' OR s."focusGroupUserIds" @> :userIdJson)',
        { userIdJson: JSON.stringify([query.userId]) },
      );
    }

    return qb.getMany();
  }

  async getTemplates() {
    return this.surveyRepo.find({
      where: { isTemplate: true },
      relations: ['questions'],
      order: { createdAt: 'DESC' } as any,
    });
  }

  async saveAsTemplate(id: string, createdById: string) {
    const source = await this.findOne(id);
    const template = this.surveyRepo.create({
      title:        source.title,
      description:  source.description,
      objective:    source.objective,
      type:         source.type,
      isAnonymous:  source.isAnonymous,
      targetScope:  source.targetScope,
      targetRoles:  source.targetRoles,
      targetShifts: source.targetShifts,
      tags:         source.tags,
      isTemplate:   true,
      status:       SurveyStatus.DRAFT,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdById,
    }) as unknown as Survey;

    template.questions = (source.questions ?? [])
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((q) =>
        this.questionRepo.create({
          text: q.text, helpText: q.helpText, type: q.type,
          isRequired: q.isRequired, options: q.options,
          orderIndex: q.orderIndex, category: q.category, dimension: q.dimension,
        }),
      );

    const saved = await this.surveyRepo.save(template) as unknown as Survey;
    await this.auditService.log('surveys', saved.id, 'CREATE', createdById, null, saved, `[Template] ${saved.title}`);
    return saved;
  }

  async findOne(id: string) {
    const survey = await this.surveyRepo.findOne({
      where: { id },
      relations: ['questions', 'targetOrgUnit'],
      order: { questions: { orderIndex: 'ASC' } },
    });
    if (!survey) throw new NotFoundException(`Survey ${id} not found`);
    return survey;
  }

  async update(id: string, data: any) {
    const survey = await this.findOne(id);
    Object.assign(survey, data);
    const saved = await this.surveyRepo.save(survey);

    const hasScopeDefined = !!(
      (saved.targetRoles      && saved.targetRoles.length      > 0) ||
      (saved.targetOrgUnitIds && saved.targetOrgUnitIds.length > 0) ||
      (saved.focusGroupUserIds && saved.focusGroupUserIds.length > 0) ||
      (saved.targetShifts     && saved.targetShifts.length     > 0)
    );
    if (hasScopeDefined) {
      const linkedProgram = await this.programRepo.findOne({ where: { linkedSurveyId: id } });
      if (linkedProgram && !linkedProgram.setupChecklist?.employeeScopeDefined) {
        linkedProgram.setupChecklist = { ...linkedProgram.setupChecklist, employeeScopeDefined: true };
        await this.programRepo.save(linkedProgram);
      }
    }

    return saved;
  }

  async publish(id: string, publisherRole?: string) {
    const survey = await this.findOne(id);

    // CNO can only publish if approved (or governance is off)
    if (survey.createdByRole === 'CNO' && survey.approvalStatus === ApprovalStatus.PENDING) {
      throw new ForbiddenException('This survey requires SVP approval before it can be published.');
    }
    if (survey.createdByRole === 'CNO' && survey.approvalStatus === ApprovalStatus.REJECTED) {
      throw new ForbiddenException('This survey was rejected. Please revise and resubmit for approval.');
    }

    return this.surveyRepo.update(id, { status: SurveyStatus.ACTIVE });
  }

  async close(id: string) {
    return this.surveyRepo.update(id, { status: SurveyStatus.CLOSED });
  }

  // ── Approval workflow ─────────────────────────────────────────────────────

  /** CNO submits their draft for SVP review */
  async requestApproval(id: string, requestedById: string) {
    const survey = await this.findOne(id);
    if (survey.createdById !== requestedById) {
      throw new ForbiddenException('Only the survey creator can request approval.');
    }
    if (survey.approvalStatus === ApprovalStatus.APPROVED) {
      throw new BadRequestException('Survey is already approved.');
    }
    await this.surveyRepo.update(id, { approvalStatus: ApprovalStatus.PENDING });
    await this.auditService.log('surveys', id, 'REQUEST_APPROVAL', requestedById, null, { approvalStatus: ApprovalStatus.PENDING }, survey.title);
    return this.findOne(id);
  }

  /** SVP approves — CNO may now publish */
  async approve(id: string, reviewerId: string) {
    const survey = await this.findOne(id);
    if (survey.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Survey is not pending approval.');
    }
    await this.surveyRepo.update(id, {
      approvalStatus: ApprovalStatus.APPROVED,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    });
    await this.auditService.log('surveys', id, 'APPROVE', reviewerId, null, { approvalStatus: ApprovalStatus.APPROVED }, survey.title);
    return this.findOne(id);
  }

  /** SVP rejects with a reason */
  async reject(id: string, reviewerId: string, reason: string) {
    const survey = await this.findOne(id);
    if (survey.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Survey is not pending approval.');
    }
    await this.surveyRepo.update(id, {
      approvalStatus: ApprovalStatus.REJECTED,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });
    await this.auditService.log('surveys', id, 'REJECT', reviewerId, null, { approvalStatus: ApprovalStatus.REJECTED, reason }, survey.title);
    return this.findOne(id);
  }

  /** Returns all surveys pending SVP review — includes full question data for preview */
  async getPendingApprovals() {
    return this.surveyRepo.find({
      where: { approvalStatus: ApprovalStatus.PENDING },
      relations: ['questions'],
      order: { createdAt: 'ASC' },
    });
  }

  /** Returns governance configuration */
  async getGovernance() {
    return this.getGovernanceConfig();
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

  async getParticipation(surveyId: string) {
    const survey = await this.findOne(surveyId);
    return {
      surveyId,
      title: survey.title,
      targetCount: null,
      responseCount: 0,
      participationRate: 0,
    };
  }

  async remove(id: string) {
    return this.surveyRepo.delete(id);
  }

  async bulkSoftDelete(ids: string[]) {
    if (!ids?.length) return { deleted: 0 };
    await this.surveyRepo.softDelete(ids);
    return { deleted: ids.length };
  }

  // ── Granular results (question analysis + individual responses + open text) ─

  async getResults(surveyId: string) {
    const survey = await this.surveyRepo.findOne({
      where: { id: surveyId },
      relations: ['questions'],
      order: { questions: { orderIndex: 'ASC' } },
    });
    if (!survey) throw new NotFoundException('Survey not found');

    const questions: any[] = (survey as any).questions ?? [];
    const responses = await this.responseRepo.find({
      where: { surveyId },
      order: { submittedAt: 'DESC' },
    });

    // Resolve org unit names
    const orgUnitIds = [...new Set(responses.map((r) => r.orgUnitId).filter(Boolean))] as string[];
    const orgUnits   = orgUnitIds.length ? await this.orgUnitRepo.findByIds(orgUnitIds) : [];
    const orgMap     = new Map(orgUnits.map((u) => [u.id, (u as any).name]));

    const NUMERIC = ['LIKERT_5', 'LIKERT_10', 'NPS', 'RATING', 'YES_NO'];

    // ── Per-question analysis ─────────────────────────────────────────────────
    const questionAnalysis = questions.map((q) => {
      const distribution: Record<string, number> = {};
      const scores: number[] = [];

      for (const r of responses) {
        const ans = r.answers.find((a) => a.questionId === q.id);
        if (!ans) continue;

        const raw = ans.value;
        const key = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '');
        if (key) distribution[key] = (distribution[key] ?? 0) + 1;

        if (NUMERIC.includes(q.type)) {
          const num = Number(raw);
          if (!isNaN(num)) {
            let norm: number;
            if (q.type === 'LIKERT_5' || q.type === 'RATING') norm = ((num - 1) / 4) * 100;
            else if (q.type === 'LIKERT_10')                   norm = ((num - 1) / 9) * 100;
            else if (q.type === 'NPS')                         norm = (num / 10) * 100;
            else /* YES_NO */                                  norm = num ? 100 : 0;
            scores.push(norm);
          }
        }
      }

      return {
        questionId:    q.id,
        text:          q.text,
        type:          q.type,
        options:       q.options ?? [],
        responseCount: Object.values(distribution).reduce((a: number, b) => a + (b as number), 0),
        avgScore:      scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        distribution,
      };
    });

    // ── Anonymised individual responses ───────────────────────────────────────
    const anonymisedResponses = responses.map((r, idx) => ({
      index:       idx + 1,
      submittedAt: r.submittedAt,
      role:        r.role        ?? null,
      shift:       r.shift       ?? null,
      orgUnitName: r.orgUnitId   ? (orgMap.get(r.orgUnitId) ?? null) : null,
      answers: r.answers.map((ans) => {
        const q = questions.find((q) => q.id === ans.questionId);
        return {
          questionId:   ans.questionId,
          questionText: q?.text  ?? 'Unknown question',
          questionType: q?.type  ?? 'OPEN_TEXT',
          value:        ans.value,
          text:         (ans as any).text ?? null,
        };
      }).sort((a, b) => {
        const ai = questions.findIndex((q) => q.id === a.questionId);
        const bi = questions.findIndex((q) => q.id === b.questionId);
        return ai - bi;
      }),
    }));

    // ── Open-text answers grouped by question ─────────────────────────────────
    const openTextAnswers = questions
      .filter((q) => q.type === 'OPEN_TEXT')
      .map((q) => ({
        questionId:   q.id,
        questionText: q.text,
        answers: responses
          .map((r, idx) => {
            const ans = r.answers.find((a) => a.questionId === q.id);
            if (!ans?.value) return null;
            return { responseIndex: idx + 1, value: String(ans.value), submittedAt: r.submittedAt };
          })
          .filter(Boolean),
      }))
      .filter((q) => q.answers.length > 0);

    // ── Summary ───────────────────────────────────────────────────────────────
    const allScores = questionAnalysis.filter((q) => q.avgScore !== null).map((q) => q.avgScore as number);
    const dates     = responses.map((r) => r.submittedAt);

    return {
      survey: {
        id:     survey.id,
        title:  (survey as any).title,
        type:   (survey as any).type,
        status: survey.status,
      },
      summary: {
        responseCount: responses.length,
        avgScore:      allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null,
        dateRange:     dates.length ? { first: dates[dates.length - 1], last: dates[0] } : null,
      },
      questionAnalysis,
      responses: anonymisedResponses,
      openTextAnswers,
    };
  }
}
