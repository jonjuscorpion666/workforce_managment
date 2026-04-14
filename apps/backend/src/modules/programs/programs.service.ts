import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Program, ProgramApprovalStatus, ProgramScope,
  ProgramStageKey, ProgramStatus, SetupChecklist, ExecutionChecklist,
  RootCauseChecklist, RemediationChecklist,
} from './entities/program.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { User } from '../auth/entities/user.entity';

const STAGE_ORDER: ProgramStageKey[] = [
  ProgramStageKey.SETUP,
  ProgramStageKey.EXECUTION,
  ProgramStageKey.ROOT_CAUSE,
  ProgramStageKey.REMEDIATION,
  ProgramStageKey.COMMUNICATION,
  ProgramStageKey.VALIDATION,
];

const CHECKLIST_KEYS: (keyof SetupChecklist)[] = [
  'meetingScheduled',
  'questionsDrafted',
  'employeeScopeDefined',
  'communicationDrafted',
  'employeesNotified',
];

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program) private readonly repo: Repository<Program>,
    @InjectRepository(OrgUnit) private readonly orgUnitRepo: Repository<OrgUnit>,
    @InjectRepository(User)    private readonly userRepo: Repository<User>,
  ) {}

  // ── ID generation ──────────────────────────────────────────────────────────

  private async generateProgramId(): Promise<string> {
    const now    = new Date();
    const year   = now.getFullYear();
    const month  = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `ENG-${year}-${month}`;

    const existing = await this.repo
      .createQueryBuilder('p')
      .where('p."programId" LIKE :prefix', { prefix: `${prefix}-%` })
      .orderBy('p."programId"', 'DESC')
      .getOne();

    const seq = existing
      ? parseInt(existing.programId.split('-').pop() ?? '0', 10) + 1
      : 1;

    return `${prefix}-${String(seq).padStart(3, '0')}`;
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(data: any, createdById: string) {
    const programId = await this.generateProgramId();
    const program   = this.repo.create({
      ...data,
      programId,
      createdById,
      ownerId:        data.ownerId ?? createdById,
      status:         ProgramStatus.DRAFT,
      currentStage:   ProgramStageKey.SETUP,
      approvalStatus: ProgramApprovalStatus.NOT_REQUIRED,
      setupChecklist: {},
    });
    return this.repo.save(program);
  }

  async findAll(filters: {
    hospitalId?: string;
    status?: string;
    stage?: string;
    scope?: string;
  }) {
    const qb = this.repo.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');

    if (filters.status)     qb.andWhere('p.status = :status',           { status: filters.status });
    if (filters.stage)      qb.andWhere('p."currentStage" = :stage',    { stage: filters.stage });
    if (filters.scope)      qb.andWhere('p.scope = :scope',             { scope: filters.scope });
    if (filters.hospitalId) {
      qb.andWhere(
        `(p.scope = :global OR p."targetHospitalIds" @> :hid::jsonb)`,
        { global: ProgramScope.GLOBAL, hid: JSON.stringify([filters.hospitalId]) },
      );
    }

    const programs = await qb.getMany();
    return this.enrich(programs);
  }

  async findOne(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    const [enriched] = await this.enrich([p]);
    return enriched;
  }

  async update(id: string, data: any) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    if ([ProgramStatus.COMPLETED, ProgramStatus.CANCELLED].includes(p.status)) {
      throw new BadRequestException('Cannot edit a completed or cancelled program');
    }
    Object.assign(p, data);
    return this.repo.save(p);
  }

  async updateChecklist(id: string, checklist: Partial<SetupChecklist>) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    p.setupChecklist = { ...p.setupChecklist, ...checklist };
    return this.repo.save(p);
  }

  async updateExecutionChecklist(id: string, update: Partial<ExecutionChecklist>) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    p.executionChecklist = { ...p.executionChecklist, ...update };
    return this.repo.save(p);
  }

  async updateRootCauseChecklist(id: string, update: Partial<RootCauseChecklist>) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    p.rootCauseChecklist = { ...p.rootCauseChecklist, ...update };
    return this.repo.save(p);
  }

  async updateRemediationChecklist(id: string, update: Partial<RemediationChecklist>) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    p.remediationChecklist = { ...p.remediationChecklist, ...update };
    return this.repo.save(p);
  }

  async linkSurvey(id: string, surveyId: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    p.linkedSurveyId = surveyId;
    return this.repo.save(p);
  }

  // ── Approval workflow ──────────────────────────────────────────────────────

  async submitForApproval(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    if (p.status !== ProgramStatus.DRAFT) {
      throw new BadRequestException('Only draft programs can be submitted for approval');
    }
    p.status         = ProgramStatus.PENDING_APPROVAL;
    p.approvalStatus = ProgramApprovalStatus.PENDING;
    return this.repo.save(p);
  }

  async approve(id: string, approverId: string, userRoles: string[]) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    if (p.approvalStatus !== ProgramApprovalStatus.PENDING) {
      throw new BadRequestException('Program is not pending approval');
    }
    this.assertCanApprove(p, userRoles);

    p.approvalStatus = ProgramApprovalStatus.APPROVED;
    p.status         = ProgramStatus.ACTIVE;
    p.approverId     = approverId;
    p.approvedAt     = new Date();
    p.rejectionReason = null as any;
    return this.repo.save(p);
  }

  async reject(id: string, approverId: string, userRoles: string[], reason: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    if (p.approvalStatus !== ProgramApprovalStatus.PENDING) {
      throw new BadRequestException('Program is not pending approval');
    }
    this.assertCanApprove(p, userRoles);

    p.approvalStatus  = ProgramApprovalStatus.REJECTED;
    p.status          = ProgramStatus.REJECTED;
    p.approverId      = approverId;
    p.rejectionReason = reason;
    return this.repo.save(p);
  }

  private assertCanApprove(p: Program, userRoles: string[]) {
    const canApprove = p.scope === ProgramScope.GLOBAL
      ? userRoles.some((r) => ['SVP', 'SUPER_ADMIN'].includes(r))
      : userRoles.some((r) => ['CNO', 'SVP', 'SUPER_ADMIN'].includes(r));
    if (!canApprove) throw new ForbiddenException('Insufficient role to approve this program');
  }

  // ── Stage advancement ──────────────────────────────────────────────────────

  async advanceStage(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    if (p.status !== ProgramStatus.ACTIVE) {
      throw new BadRequestException('Program must be active to advance stages');
    }

    // ── Gate: SETUP → EXECUTION ────────────────────────────────────────────
    if (p.currentStage === ProgramStageKey.SETUP) {
      if (!p.linkedSurveyId) {
        throw new BadRequestException('Link a survey before advancing to Execution');
      }
      if (p.approvalStatus === ProgramApprovalStatus.PENDING) {
        throw new BadRequestException('Program is awaiting approval — cannot advance yet');
      }
      // Checklist completeness is enforced by the frontend only
    }

    // ── Gate: EXECUTION → ROOT_CAUSE ──────────────────────────────────────
    if (p.currentStage === ProgramStageKey.EXECUTION) {
      if (!p.executionChecklist?.surveyClosed) {
        throw new BadRequestException('Close the survey before advancing to Root Cause');
      }
    }

    // ── Gate: ROOT_CAUSE → REMEDIATION ────────────────────────────────────
    if (p.currentStage === ProgramStageKey.ROOT_CAUSE) {
      if (!p.rootCauseChecklist?.issuesCreated) {
        throw new BadRequestException('Create at least one issue before advancing to Remediation');
      }
      if (!p.rootCauseChecklist?.teamAgreed) {
        throw new BadRequestException('Get team agreement on root causes before advancing');
      }
    }

    // ── Gate: REMEDIATION → COMMUNICATION ────────────────────────────────
    if (p.currentStage === ProgramStageKey.REMEDIATION) {
      if (!p.remediationChecklist?.progressReviewed) {
        throw new BadRequestException('Mark progress as reviewed before advancing to Communication');
      }
    }

    const idx = STAGE_ORDER.indexOf(p.currentStage);
    if (idx === STAGE_ORDER.length - 1) {
      p.status = ProgramStatus.COMPLETED;
    } else {
      p.currentStage = STAGE_ORDER[idx + 1];
    }
    return this.repo.save(p);
  }

  // ── Enrichment ─────────────────────────────────────────────────────────────

  private async enrich(programs: Program[]): Promise<any[]> {
    if (!programs.length) return [];

    const hospitalIds = [...new Set(programs.flatMap((p) => p.targetHospitalIds ?? []))];
    const userIds = [
      ...new Set([
        ...programs.map((p) => p.ownerId),
        ...programs.map((p) => p.approverId),
        ...programs.map((p) => p.createdById),
      ].filter(Boolean)),
    ] as string[];

    const [hospitals, users] = await Promise.all([
      hospitalIds.length ? this.orgUnitRepo.find({ where: { id: In(hospitalIds) }, select: ['id', 'name'] as any }) : [],
      userIds.length     ? this.userRepo.find({ where: { id: In(userIds) }, select: ['id', 'firstName', 'lastName', 'jobTitle'] as any }) : [],
    ]);

    const hospitalMap = new Map(hospitals.map((h) => [h.id, h] as [string, typeof h]));
    const userMap     = new Map(users.map((u) => [u.id, u] as [string, typeof u]));

    return programs.map((p) => {
      const targetHospitals = (p.targetHospitalIds ?? []).map((id) => hospitalMap.get(id)).filter(Boolean);
      const owner    = p.ownerId    ? userMap.get(p.ownerId)    : null;
      const approver = p.approverId ? userMap.get(p.approverId) : null;

      const checklistProgress = {
        completed: CHECKLIST_KEYS.filter((k) => (p.setupChecklist as any)?.[k]).length,
        total:     CHECKLIST_KEYS.length,
      };

      const EXEC_KEYS: (keyof ExecutionChecklist)[]       = ['surveyLaunched', 'reminderSent', 'surveyClosed'];
      const RC_KEYS:   (keyof RootCauseChecklist)[]       = ['resultsReviewed', 'findingsDocumented', 'issuesCreated', 'teamAgreed'];
      const REM_KEYS:  (keyof RemediationChecklist)[]     = ['actionPlanDrafted', 'tasksAssigned', 'progressReviewed'];

      const executionProgress   = { completed: EXEC_KEYS.filter((k) => (p.executionChecklist   as any)?.[k]).length, total: EXEC_KEYS.length };
      const rootCauseProgress   = { completed: RC_KEYS.filter((k)   => (p.rootCauseChecklist   as any)?.[k]).length, total: RC_KEYS.length };
      const remediationProgress = { completed: REM_KEYS.filter((k)  => (p.remediationChecklist  as any)?.[k]).length, total: REM_KEYS.length };

      return {
        ...p,
        executionChecklist:   p.executionChecklist   ?? {},
        rootCauseChecklist:   p.rootCauseChecklist   ?? {},
        remediationChecklist: p.remediationChecklist ?? {},
        targetHospitals,
        ownerName:    owner    ? `${(owner as any).firstName} ${(owner as any).lastName}`    : null,
        approverName: approver ? `${(approver as any).firstName} ${(approver as any).lastName}` : null,
        stageIndex:   STAGE_ORDER.indexOf(p.currentStage),
        totalStages:  STAGE_ORDER.length,
        checklistProgress,
        executionProgress,
        rootCauseProgress,
        remediationProgress,
      };
    });
  }
}
