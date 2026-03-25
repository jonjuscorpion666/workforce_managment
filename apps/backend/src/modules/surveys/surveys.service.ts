import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey, SurveyStatus, ApprovalStatus } from './entities/survey.entity';
import { Question } from './entities/question.entity';
import { AuditService } from '../audit/audit.service';
import { Config } from '../admin/entities/config.entity';

// Roles that bypass the approval workflow
const FULL_AUTHORITY_ROLES = ['SVP', 'SUPER_ADMIN'];

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)  private readonly surveyRepo:   Repository<Survey>,
    @InjectRepository(Question) private readonly questionRepo: Repository<Question>,
    @InjectRepository(Config)   private readonly configRepo:  Repository<Config>,
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
    if (role === 'CNP')      return governance.requiresSvpApproval;
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
      .orderBy('s.createdAt', 'DESC');

    if (query.status)         qb.andWhere('s.status = :status',                   { status: query.status });
    if (query.type)           qb.andWhere('s.type = :type',                       { type: query.type });
    if (query.orgUnitId)      qb.andWhere('s.targetOrgUnitId = :orgUnitId',       { orgUnitId: query.orgUnitId });
    if (query.approvalStatus) qb.andWhere('s.approvalStatus = :approvalStatus',   { approvalStatus: query.approvalStatus });
    if (query.createdById)    qb.andWhere('s.createdById = :createdById',         { createdById: query.createdById });

    return qb.getMany();
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
    return this.surveyRepo.save(survey);
  }

  async publish(id: string, publisherRole?: string) {
    const survey = await this.findOne(id);

    // CNO can only publish if approved (or governance is off)
    if (survey.createdByRole === 'CNP' && survey.approvalStatus === ApprovalStatus.PENDING) {
      throw new ForbiddenException('This survey requires SVP approval before it can be published.');
    }
    if (survey.createdByRole === 'CNP' && survey.approvalStatus === ApprovalStatus.REJECTED) {
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

  /** Returns all surveys pending SVP review */
  async getPendingApprovals() {
    return this.surveyRepo.find({
      where: { approvalStatus: ApprovalStatus.PENDING },
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
}
