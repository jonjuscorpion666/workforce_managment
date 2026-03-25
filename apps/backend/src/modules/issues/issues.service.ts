import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Issue, IssueStatus, IssueSeverity, IssuePriority, IssueSource } from './entities/issue.entity';
import { IssueHistory } from './entities/issue-history.entity';
import { ActionPlan, ActionPlanMilestone, ActionPlanStatus, MilestoneStatus } from './entities/action-plan.entity';
import { AuditService } from '../audit/audit.service';
import { Response } from '../responses/entities/response.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';

// ─── Survey dimension → representative question ID map ──────────────────────
const DIMENSIONS: Record<string, string> = {
  'Advocacy': '495e268f-0c96-4806-a0b0-d112f46140fd',
  'Organizational Pride': 'b08d970b-a15b-4509-a7b8-84d0e3dea07a',
  'Workload & Wellbeing': '0691315c-d67e-463e-a7a0-0efb90c89485',
  'Meaningful Work': '7a183bfe-fc02-45ea-b940-d6fad40e6918',
  'Recognition': 'a85e330e-2fa5-4d7b-a03b-44d01cb5a980',
  'Leadership Comms': '0d9702ae-3368-4b8d-99b4-28775a1353e8',
  'Psychological Safety': '27d98147-2dc1-422d-a2a8-69d84129e12f',
  'Manager Feedback': '3e68409f-e841-46bb-8c8d-6ffd7f41a520',
  'Professional Growth': '3ba99fad-5025-4cb9-b0c6-3bc1d5fe8663',
  'Overall Experience': '37f73d3f-cc15-44a1-b6ba-4a8360b9df09',
};

function favorableScore(answers: any[], questionId: string): number | null {
  const answer = answers.find((a: any) => a.questionId === questionId);
  if (!answer) return null;
  const val = answer.value;
  if (Array.isArray(val)) return val.length <= 1 ? 100 : 0;
  return null;
}

// ─── Valid status transitions ────────────────────────────────────────────────
const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [IssueStatus.OPEN]: [IssueStatus.ACTION_PLANNED, IssueStatus.IN_PROGRESS, IssueStatus.CLOSED],
  [IssueStatus.ACTION_PLANNED]: [IssueStatus.IN_PROGRESS, IssueStatus.OPEN],
  [IssueStatus.IN_PROGRESS]: [IssueStatus.AWAITING_VALIDATION, IssueStatus.BLOCKED, IssueStatus.ACTION_PLANNED],
  [IssueStatus.BLOCKED]: [IssueStatus.IN_PROGRESS, IssueStatus.ACTION_PLANNED, IssueStatus.OPEN],
  [IssueStatus.AWAITING_VALIDATION]: [IssueStatus.RESOLVED, IssueStatus.IN_PROGRESS],
  [IssueStatus.RESOLVED]: [IssueStatus.CLOSED, IssueStatus.REOPENED],
  [IssueStatus.CLOSED]: [IssueStatus.REOPENED],
  [IssueStatus.REOPENED]: [IssueStatus.ACTION_PLANNED, IssueStatus.IN_PROGRESS],
};

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue) private readonly repo: Repository<Issue>,
    @InjectRepository(IssueHistory) private readonly historyRepo: Repository<IssueHistory>,
    @InjectRepository(ActionPlan) private readonly actionPlanRepo: Repository<ActionPlan>,
    @InjectRepository(ActionPlanMilestone) private readonly milestoneRepo: Repository<ActionPlanMilestone>,
    @InjectRepository(Response) private readonly responseRepo: Repository<Response>,
    @InjectRepository(OrgUnit) private readonly orgUnitRepo: Repository<OrgUnit>,
    private readonly auditService: AuditService,
  ) {}

  async create(data: any, createdById: string) {
    const issue = this.repo.create({ ...data, createdById });
    const saved = await this.repo.save(issue) as unknown as Issue;
    await this.auditService.log('issues', saved.id, 'CREATE', createdById, null, saved, saved.title);
    return saved;
  }

  findAll(query: any) {
    const qb = this.repo.createQueryBuilder('i')
      .leftJoinAndSelect('i.orgUnit', 'ou')
      .orderBy('i.createdAt', 'DESC');

    if (query.status) qb.andWhere('i.status = :status', { status: query.status });
    if (query.orgUnitId) qb.andWhere('i.orgUnitId = :orgUnitId', { orgUnitId: query.orgUnitId });
    if (query.severity) qb.andWhere('i.severity = :severity', { severity: query.severity });
    if (query.ownerId) qb.andWhere('i.ownerId = :ownerId', { ownerId: query.ownerId });

    return qb.getMany();
  }

  async findOne(id: string) {
    const issue = await this.repo.findOne({ where: { id }, relations: ['orgUnit'] });
    if (!issue) throw new NotFoundException(`Issue ${id} not found`);
    return issue;
  }

  async update(id: string, data: any, updatedById: string) {
    const issue = await this.findOne(id);
    const before = { ...issue };

    // ── Status transition validation ─────────────────────────────────────────
    if (data.status && data.status !== issue.status) {
      const allowed = VALID_TRANSITIONS[issue.status as IssueStatus] ?? [];
      if (!allowed.includes(data.status as IssueStatus)) {
        throw new BadRequestException(
          `Invalid status transition: ${issue.status} → ${data.status}. ` +
          `Allowed: ${allowed.join(', ') || 'none'}`,
        );
      }

      // REOPENED: require statusNote and increment reopenCount
      if (data.status === IssueStatus.REOPENED) {
        if (!data.statusNote && !issue.statusNote) {
          throw new BadRequestException('statusNote is required when reopening an issue');
        }
        data.reopenCount = (issue.reopenCount ?? 0) + 1;
      }

      // Record status change metadata
      data.lastStatusChangeAt = new Date();
    }

    // Track changed fields in history
    const changed = Object.keys(data).filter((key) => issue[key] !== data[key]);
    for (const field of changed) {
      await this.historyRepo.save(
        this.historyRepo.create({
          issueId: id,
          issue,
          field,
          oldValue: String(issue[field] ?? ''),
          newValue: String(data[field] ?? ''),
          changedById: updatedById,
          note: field === 'status' ? data.statusNote : undefined,
        }),
      );
    }

    Object.assign(issue, data);
    const saved = await this.repo.save(issue);
    await this.auditService.log('issues', id, 'UPDATE', updatedById, before, saved, saved.title);
    return saved;
  }

  getHistory(issueId: string) {
    return this.historyRepo.find({
      where: { issueId },
      order: { changedAt: 'DESC' },
    });
  }

  async validate(id: string, body: { newScore: number }) {
    const issue = await this.findOne(id);
    const threshold = issue.closureThreshold ?? 80;
    const passed = body.newScore >= threshold;

    if (passed) {
      await this.repo.update(id, { status: IssueStatus.RESOLVED, resolvedAt: new Date() });
    }

    return {
      issueId: id,
      baselineScore: issue.baselineScore,
      newScore: body.newScore,
      threshold,
      passed,
      recommendation: passed ? 'Issue can be closed' : 'Score below threshold — keep open',
    };
  }

  async reopen(id: string, body: any, userId: string) {
    const issue = await this.findOne(id);
    await this.repo.update(id, {
      status: IssueStatus.OPEN,
      cycleNumber: issue.cycleNumber + 1,
    });
    await this.historyRepo.save(
      this.historyRepo.create({
        issueId: id,
        issue,
        field: 'status',
        oldValue: issue.status,
        newValue: IssueStatus.OPEN,
        changedById: userId,
        note: body.reason || 'Score regressed — issue reopened',
      }),
    );
    return this.findOne(id);
  }

  // ─── Auto-create issues from survey analysis ────────────────────────────────
  async autoCreateFromSurvey(surveyId: string, createdById: string) {
    // Fetch all responses for the survey that have an orgUnitId
    const responses = await this.responseRepo.find({
      where: { surveyId },
    });
    const validResponses = responses.filter((r) => r.orgUnitId);

    if (validResponses.length === 0) {
      return { created: 0, skipped: 0, issues: [] };
    }

    // Group responses by orgUnitId
    const byUnit = new Map<string, typeof validResponses>();
    for (const r of validResponses) {
      const list = byUnit.get(r.orgUnitId) || [];
      list.push(r);
      byUnit.set(r.orgUnitId, list);
    }

    // Load org unit names
    const unitIds = Array.from(byUnit.keys());
    const orgUnits = await this.orgUnitRepo.find({ where: { id: In(unitIds) } });
    const unitNameMap = new Map(orgUnits.map((u) => [u.id, u.name]));

    // Compute per-unit per-dimension scores
    type UnitDimScore = { uid: string; dimension: string; score: number; hospitalId: string | null };
    const lowScores: UnitDimScore[] = [];

    for (const [uid, unitResponses] of byUnit.entries()) {
      for (const [dimension, questionId] of Object.entries(DIMENSIONS)) {
        const scores = unitResponses
          .map((r) => favorableScore(r.answers, questionId))
          .filter((s): s is number => s !== null);

        if (scores.length === 0) continue;

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg < 70) {
          lowScores.push({
            uid,
            dimension,
            score: Math.round(avg),
            hospitalId: unitResponses[0].hospitalId ?? null,
          });
        }
      }
    }

    // Determine issue level based on how many units have the same problem
    // For each dimension, count units below threshold
    const dimUnitCounts = new Map<string, string[]>();
    for (const ls of lowScores) {
      const list = dimUnitCounts.get(ls.dimension) || [];
      list.push(ls.uid);
      dimUnitCounts.set(ls.dimension, list);
    }

    // Count unique hospitals
    const allHospitalIds = new Set(validResponses.map((r) => r.hospitalId).filter(Boolean));
    const totalHospitals = allHospitalIds.size;

    const created: Issue[] = [];
    let skipped = 0;

    for (const { uid, dimension, score, hospitalId } of lowScores) {
      // Check if issue already exists
      const existing = await this.repo.findOne({
        where: {
          linkedSurveyId: surveyId,
          category: dimension,
          orgUnitId: uid,
          status: Not(In([IssueStatus.CLOSED, IssueStatus.RESOLVED])),
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Determine issue level
      const unitsWithSameProblem = dimUnitCounts.get(dimension) || [];
      const unitsInSameHospital = unitsWithSameProblem.filter((u) => {
        const uResponses = byUnit.get(u) || [];
        return uResponses[0]?.hospitalId === hospitalId;
      });

      let issueLevel = 'UNIT';
      if (unitsWithSameProblem.length >= unitIds.length && totalHospitals > 1) {
        issueLevel = 'SYSTEM';
      } else if (unitsInSameHospital.length >= 3) {
        issueLevel = 'HOSPITAL';
      } else if (unitsWithSameProblem.length >= 3) {
        issueLevel = 'DEPARTMENT';
      }

      const unitName = unitNameMap.get(uid) ?? uid;
      const severity = score < 40 ? IssueSeverity.CRITICAL : score < 55 ? IssueSeverity.HIGH : IssueSeverity.MEDIUM;
      const priority = score < 40 ? IssuePriority.P1 : score < 55 ? IssuePriority.P2 : IssuePriority.P3;

      const issue = this.repo.create({
        title: `Low ${dimension} — ${unitName}`,
        description: `Auto-generated from survey analysis. Favorable score: ${score}% (below 70% threshold).`,
        source: IssueSource.SURVEY_AUTO,
        linkedSurveyId: surveyId,
        linkedQuestionId: DIMENSIONS[dimension],
        linkedSurveyQuestionIds: [DIMENSIONS[dimension]],
        category: dimension,
        orgUnitId: uid,
        hospitalId: hospitalId ?? undefined,
        baselineScore: score,
        targetScore: 70,
        closureThreshold: 70,
        severity,
        priority,
        status: IssueStatus.OPEN,
        issueLevel,
        createdById,
      });

      const saved = await this.repo.save(issue) as unknown as Issue;
      await this.auditService.log('issues', saved.id, 'CREATE', createdById, null, saved, saved.title);
      created.push(saved);
    }

    return { created: created.length, skipped, issues: created };
  }

  // ─── Action Plan CRUD ────────────────────────────────────────────────────────
  async createActionPlan(issueId: string, data: any, createdById: string) {
    // Verify issue exists
    const issue = await this.findOne(issueId);

    const plan = this.actionPlanRepo.create({
      ...data,
      issueId,
      createdById,
    });
    const savedPlan = await this.actionPlanRepo.save(plan);

    // Advance issue status to ACTION_PLANNED if still OPEN or already ACTION_PLANNED
    if (issue.status === IssueStatus.OPEN || issue.status === IssueStatus.ACTION_PLANNED) {
      await this.repo.update(issueId, {
        status: IssueStatus.ACTION_PLANNED,
        lastStatusChangeAt: new Date(),
      });
    }

    return savedPlan;
  }

  async getActionPlans(issueId: string) {
    // Verify issue exists
    await this.findOne(issueId);
    return this.actionPlanRepo.find({
      where: { issueId },
      relations: ['milestones'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateActionPlan(planId: string, data: any, updatedById: string) {
    const plan = await this.actionPlanRepo.findOne({ where: { id: planId }, relations: ['milestones'] });
    if (!plan) throw new NotFoundException(`Action plan ${planId} not found`);

    // If milestones were updated externally, recalculate progressPercent
    if (plan.milestones && plan.milestones.length > 0) {
      const completed = plan.milestones.filter((m) => m.status === MilestoneStatus.COMPLETED).length;
      data.progressPercent = Math.round((completed / plan.milestones.length) * 100);
    }

    Object.assign(plan, data);
    return this.actionPlanRepo.save(plan);
  }

  async addMilestone(planId: string, data: any) {
    const plan = await this.actionPlanRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Action plan ${planId} not found`);

    const milestone = this.milestoneRepo.create({
      ...data,
      actionPlanId: planId,
    });
    return this.milestoneRepo.save(milestone);
  }

  async deleteMilestone(milestoneId: string) {
    const milestone = await this.milestoneRepo.findOne({ where: { id: milestoneId } });
    if (!milestone) throw new NotFoundException(`Milestone ${milestoneId} not found`);
    await this.milestoneRepo.remove(milestone);
  }

  async updateMilestone(milestoneId: string, data: any) {
    const milestone = await this.milestoneRepo.findOne({ where: { id: milestoneId } });
    if (!milestone) throw new NotFoundException(`Milestone ${milestoneId} not found`);

    Object.assign(milestone, data);

    // Auto-mark OVERDUE if past dueDate and not completed
    if (
      milestone.dueDate &&
      milestone.status !== MilestoneStatus.COMPLETED &&
      new Date(milestone.dueDate) < new Date()
    ) {
      milestone.status = MilestoneStatus.OVERDUE;
    }

    return this.milestoneRepo.save(milestone);
  }

  async getOverdueActionPlans() {
    const now = new Date();

    // Auto-update milestone statuses to OVERDUE where past due
    const pendingMilestones = await this.milestoneRepo
      .createQueryBuilder('m')
      .where('m.dueDate < :now', { now })
      .andWhere('m.status = :status', { status: MilestoneStatus.PENDING })
      .getMany();

    for (const m of pendingMilestones) {
      m.status = MilestoneStatus.OVERDUE;
      await this.milestoneRepo.save(m);
    }

    // Return action plans where endDate < now and status = ACTIVE
    return this.actionPlanRepo
      .createQueryBuilder('ap')
      .leftJoinAndSelect('ap.milestones', 'milestones')
      .where('ap.endDate < :now', { now })
      .andWhere('ap.status = :status', { status: ActionPlanStatus.ACTIVE })
      .orderBy('ap.endDate', 'ASC')
      .getMany();
  }
}
