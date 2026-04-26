import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, BadGatewayException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import {
  Program, ProgramApprovalStatus, ProgramScope,
  ProgramStageKey, ProgramStatus, SetupChecklist, ExecutionChecklist,
  RootCauseChecklist, RemediationChecklist, CommunicationChecklist, ValidationChecklist,
} from './entities/program.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { User } from '../auth/entities/user.entity';
import { Issue } from '../issues/entities/issue.entity';
import { Task } from '../tasks/entities/task.entity';
import { Survey, SurveyStatus } from '../surveys/entities/survey.entity';
import { Question } from '../surveys/entities/question.entity';
import { Response as SurveyResponse } from '../responses/entities/response.entity';
import { AnnouncementsService } from '../announcements/announcements.service';
import { AnnouncementType, AnnouncementPriority, AudienceMode } from '../announcements/entities/announcement.entity';

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
  private _ai: Anthropic | null = null;
  private get ai(): Anthropic {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new BadGatewayException('AI features require ANTHROPIC_API_KEY to be configured');
    }
    if (!this._ai) this._ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return this._ai;
  }

  constructor(
    @InjectRepository(Program)         private readonly repo:         Repository<Program>,
    @InjectRepository(OrgUnit)         private readonly orgUnitRepo:  Repository<OrgUnit>,
    @InjectRepository(User)            private readonly userRepo:     Repository<User>,
    @InjectRepository(Issue)           private readonly issueRepo:    Repository<Issue>,
    @InjectRepository(Task)            private readonly taskRepo:     Repository<Task>,
    @InjectRepository(Survey)          private readonly surveyRepo:   Repository<Survey>,
    @InjectRepository(Question)        private readonly questionRepo:  Repository<Question>,
    @InjectRepository(SurveyResponse)  private readonly responseRepo:  Repository<SurveyResponse>,
    private readonly announcementsService: AnnouncementsService,
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

    // Descriptive fields (name, problem, objective, criteria, dates) are always editable.
    // Only block structural/status changes on completed/cancelled programs.
    const ALWAYS_EDITABLE = [
      'name', 'problemStatement', 'objective', 'successCriteria',
      'targetLaunchDate', 'targetCompletionDate', 'targetHospitalIds', 'scope',
    ];
    const hasNonEditableField = Object.keys(data).some((k) => !ALWAYS_EDITABLE.includes(k));
    if (hasNonEditableField && [ProgramStatus.COMPLETED, ProgramStatus.CANCELLED].includes(p.status)) {
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

  async updateCommunicationChecklist(id: string, update: Partial<CommunicationChecklist>) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    p.communicationChecklist = { ...p.communicationChecklist, ...update };
    return this.repo.save(p);
  }

  async updateValidationChecklist(id: string, update: Partial<ValidationChecklist>) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    p.validationChecklist = { ...p.validationChecklist, ...update };
    return this.repo.save(p);
  }

  async linkSurvey(id: string, surveyId: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');

    // Ensure this survey is not already linked to a different active program
    const existing = await this.repo.findOne({ where: { linkedSurveyId: surveyId } });
    if (existing && existing.id !== id && ![ProgramStatus.COMPLETED, ProgramStatus.CANCELLED].includes(existing.status)) {
      throw new BadRequestException(
        `This survey is already linked to program "${existing.name}". Unlink it there first.`,
      );
    }

    p.linkedSurveyId = surveyId;
    p.surveyToken    = uuidv4();

    // Auto-tick "Employee scope defined" if the survey has any targeting configured
    const survey = await this.surveyRepo.findOne({ where: { id: surveyId } });
    const hasScopeDefined = !!(
      survey &&
      (
        (survey.targetRoles      && survey.targetRoles.length      > 0) ||
        (survey.targetOrgUnitIds && survey.targetOrgUnitIds.length > 0) ||
        (survey.focusGroupUserIds && survey.focusGroupUserIds.length > 0) ||
        (survey.targetShifts     && survey.targetShifts.length     > 0)
      )
    );
    if (hasScopeDefined) {
      p.setupChecklist = { ...p.setupChecklist, employeeScopeDefined: true };
    }

    return this.repo.save(p);
  }

  async unlinkSurvey(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    p.linkedSurveyId = null as any;
    p.surveyToken    = null as any;
    p.setupChecklist = { ...p.setupChecklist, questionsDrafted: false, employeeScopeDefined: false };
    return this.repo.save(p);
  }

  async resolveToken(token: string) {
    // Try by surveyToken first, then fall back to direct survey ID lookup
    let p = await this.repo.findOne({ where: { surveyToken: token } });
    if (!p) p = await this.repo.findOne({ where: { linkedSurveyId: token } });
    if (!p || !p.linkedSurveyId) throw new NotFoundException('Survey link not found');
    return {
      programId:   p.id,
      programName: p.name,
      surveyId:    p.linkedSurveyId,
      surveyToken: token,
    };
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

  async cancel(id: string, reason?: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');
    if (p.status === ProgramStatus.COMPLETED)
      throw new BadRequestException('Cannot cancel a completed program');
    if (p.status === ProgramStatus.CANCELLED)
      throw new BadRequestException('Program is already cancelled');
    p.status = ProgramStatus.CANCELLED;
    if (reason) p.setupChecklist = { ...p.setupChecklist, cancellationReason: reason } as any;
    return this.repo.save(p);
  }

  private assertCanApprove(p: Program, userRoles: string[]) {
    const canApprove = p.scope === ProgramScope.GLOBAL
      ? userRoles.some((r) => ['SVP', 'SUPER_ADMIN'].includes(r))
      : userRoles.some((r) => ['CNO', 'SVP', 'SUPER_ADMIN'].includes(r));
    if (!canApprove) throw new ForbiddenException('Insufficient role to approve this program');
  }

  // ── Survey launch + employee notification (SETUP → EXECUTION) ─────────────

  private async launchSurveyAndNotify(p: Program) {
    const survey = await this.surveyRepo.findOne({ where: { id: p.linkedSurveyId } });
    if (!survey) return;

    // 1. Publish the survey so it appears in the employee portal
    if (survey.status !== SurveyStatus.ACTIVE) {
      survey.status = SurveyStatus.ACTIVE;
      await this.surveyRepo.save(survey);
    }

    // 2. Determine audience mode from survey scope
    let audienceMode = AudienceMode.SYSTEM;
    if (survey.targetRoles?.length && survey.targetOrgUnitIds?.length) {
      audienceMode = AudienceMode.COMBINATION;
    } else if (survey.targetOrgUnitIds?.length) {
      audienceMode = AudienceMode.UNIT;
    } else if (survey.targetRoles?.length) {
      audienceMode = AudienceMode.ROLE;
    }

    // 3. Build the full survey respond URL
    const baseUrl = (process.env.FRONTEND_URL ?? 'https://workforce-platform-frontend-production.up.railway.app').replace(/\/$/, '');
    const surveyUrl = p.surveyToken
      ? `${baseUrl}/surveys/respond/${p.surveyToken}`
      : `${baseUrl}/surveys/${survey.id}`;

    // 4. Create + publish a SURVEY_LAUNCH announcement targeting the same scope
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
    const ann = await this.announcementsService.create(
      {
        title:       `New Survey: ${survey.title}`,
        body:        `As part of the "${p.name}" program, you have been invited to complete a survey.\n\nPlease follow this link to respond: ${surveyUrl}\n\nYour feedback is important and helps us improve.`,
        type:        AnnouncementType.SURVEY_LAUNCH,
        priority:    AnnouncementPriority.HIGH,
        audienceMode,
        targetOrgUnitIds: survey.targetOrgUnitIds ?? null,
        targetRoles:      survey.targetRoles      ?? null,
        linkedSurveyId:   survey.id,
        requiresAcknowledgement: false,
      },
      SYSTEM_USER_ID,
      'SUPER_ADMIN', // bypass role permission check
    );
    await this.announcementsService.publish(ann.id, SYSTEM_USER_ID);

    // 5. Mark setup checklist — survey launched
    p.setupChecklist = { ...p.setupChecklist, employeesNotified: true } as any;
    p.executionChecklist = { ...p.executionChecklist, surveyLaunched: true } as any;
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

      // Auto-publish survey + notify targeted employees
      await this.launchSurveyAndNotify(p);
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

    // ── Gate: COMMUNICATION → VALIDATION ──────────────────────────────────────
    if (p.currentStage === ProgramStageKey.COMMUNICATION) {
      if (!p.communicationChecklist?.employeesUpdated) {
        throw new BadRequestException('Notify employees of outcomes before advancing to Validation');
      }
    }

    // ── Gate: VALIDATION → COMPLETE ───────────────────────────────────────────
    if (p.currentStage === ProgramStageKey.VALIDATION) {
      if (!p.validationChecklist?.successEvaluated) {
        throw new BadRequestException('Evaluate success criteria before completing the program');
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

  // ── Related work (issues + tasks) ──────────────────────────────────────────

  async getRelatedWork(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Program not found');

    // Gather issues linked by programId OR by the program's linked survey
    const conditions: any[] = [{ programId: id }];
    if (p.linkedSurveyId) conditions.push({ linkedSurveyId: p.linkedSurveyId });

    const issues = await this.issueRepo
      .createQueryBuilder('i')
      .where(
        conditions.map((_, idx) => idx === 0
          ? 'i."programId" = :programId'
          : 'i."linkedSurveyId" = :linkedSurveyId'
        ).join(' OR '),
        { programId: id, linkedSurveyId: p.linkedSurveyId },
      )
      .orderBy('i.createdAt', 'ASC')
      .getMany();

    if (!issues.length) return [];

    const issueIds = issues.map((i) => i.id);
    const tasks    = await this.taskRepo.find({ where: { issueId: In(issueIds) }, order: { createdAt: 'ASC' } });

    const tasksByIssue = new Map<string, Task[]>();
    for (const task of tasks) {
      const list = tasksByIssue.get(task.issueId) ?? [];
      list.push(task);
      tasksByIssue.set(task.issueId, list);
    }

    return issues.map((issue) => ({
      ...issue,
      tasks: tasksByIssue.get(issue.id) ?? [],
    }));
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
      const COMM_KEYS: (keyof CommunicationChecklist)[] = ['reportPrepared', 'leadershipBriefed', 'employeesUpdated', 'documentationSaved'];
      const VAL_KEYS:  (keyof ValidationChecklist)[]     = ['followUpPlanned', 'metricsReviewed', 'successEvaluated', 'outcomesDocumented'];

      const executionProgress   = { completed: EXEC_KEYS.filter((k) => (p.executionChecklist   as any)?.[k]).length, total: EXEC_KEYS.length };
      const rootCauseProgress   = { completed: RC_KEYS.filter((k)   => (p.rootCauseChecklist   as any)?.[k]).length, total: RC_KEYS.length };
      const remediationProgress = { completed: REM_KEYS.filter((k)  => (p.remediationChecklist  as any)?.[k]).length, total: REM_KEYS.length };
      const communicationProgress = { completed: COMM_KEYS.filter((k) => (p.communicationChecklist as any)?.[k]).length, total: COMM_KEYS.length };
      const validationProgress    = { completed: VAL_KEYS.filter((k)  => (p.validationChecklist    as any)?.[k]).length, total: VAL_KEYS.length };

      return {
        ...p,
        executionChecklist:   p.executionChecklist   ?? {},
        rootCauseChecklist:   p.rootCauseChecklist   ?? {},
        remediationChecklist: p.remediationChecklist ?? {},
        communicationChecklist: p.communicationChecklist ?? {},
        validationChecklist:    p.validationChecklist    ?? {},
        targetHospitals,
        ownerName:    owner    ? `${(owner as any).firstName} ${(owner as any).lastName}`    : null,
        approverName: approver ? `${(approver as any).firstName} ${(approver as any).lastName}` : null,
        stageIndex:   STAGE_ORDER.indexOf(p.currentStage),
        totalStages:  STAGE_ORDER.length,
        checklistProgress,
        executionProgress,
        rootCauseProgress,
        remediationProgress,
        communicationProgress,
        validationProgress,
      };
    });
  }

  // ── AI: suggest objective + success criteria from problem statement ─────────

  async aiSuggestObjective(problemStatement: string) {
    if (!problemStatement?.trim()) throw new BadRequestException('Problem statement cannot be empty');

    const prompt = `You are a healthcare workforce improvement program specialist.

A program manager has written the following problem statement:
"${problemStatement}"

Based on this problem statement, generate:
1. A clear, measurable OBJECTIVE (1-2 sentences) — what the program aims to achieve
2. 2-3 specific SUCCESS CRITERIA — how success will be measured (each on a new line, starting with "- ")

Format your response EXACTLY as valid JSON:
{
  "objective": "...",
  "successCriteria": "- criterion 1\\n- criterion 2\\n- criterion 3"
}

Return ONLY the JSON object, no explanation, no markdown fences.`;

    try {
      const msg = await this.ai.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = (msg.content[0] as any).text?.trim() ?? '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      let parsed: { objective: string; successCriteria: string };
      try { parsed = JSON.parse(cleaned); } catch { throw new BadRequestException('AI returned unexpected format. Please try again.'); }
      return { objective: parsed.objective?.trim() ?? '', successCriteria: parsed.successCriteria?.trim() ?? '' };
    } catch (err: any) {
      if (err?.status) throw err;
      throw new BadGatewayException(`AI error: ${err?.message ?? 'Unknown'}`);
    }
  }

  // ── AI: generate communication message ────────────────────────────────────

  async aiGenerateCommunicationMessage(programId: string) {
    const program = await this.repo.findOne({ where: { id: programId } });
    if (!program) throw new NotFoundException('Program not found');

    const { problemStatement, objective } = program;
    if (!problemStatement?.trim()) throw new BadRequestException('Program must have a problem statement before generating a communication message');

    const prompt = `You are a healthcare workforce communication specialist.

Write a warm, professional employee announcement message for a workforce improvement survey.

Program context:
- Problem being addressed: "${problemStatement}"
${objective?.trim() ? `- Program objective: "${objective}"` : ''}

The message should:
- Be addressed to "Dear Team," or similar
- Briefly explain why the survey is being conducted (link to the problem)
- Reassure employees their feedback is valued and confidential
- Encourage participation with a sense of urgency
- Close professionally
- Be 3-5 short paragraphs, plain prose (no bullet points)

Return ONLY the message text, no preamble, no labels.`;

    try {
      const msg = await this.ai.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });
      const message = (msg.content[0] as any).text?.trim() ?? '';
      return { message };
    } catch (err: any) {
      throw new BadGatewayException(`AI error: ${err?.message ?? 'Unknown'}`);
    }
  }

  // ── AI: enhance free-text field ────────────────────────────────────────────

  async aiEnhanceText(text: string, fieldContext: string) {
    if (!text?.trim()) throw new BadRequestException('Text cannot be empty');

    const prompt = `You are a professional healthcare workforce program writer.

The user has written rough notes for the following field: "${fieldContext}"

Their draft:
${text}

Rewrite this into clear, professional, well-structured sentences suitable for a healthcare leadership program document.
- Keep all the original facts and intent — do not add information that was not implied
- Fix grammar and structure
- Use concise, active language
- If it is already bullet points, convert to flowing prose unless bullets are clearly better
- Return ONLY the enhanced text, no preamble, no labels, no quotes`;

    try {
      const msg = await this.ai.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });
      const enhanced = (msg.content[0] as any).text?.trim() ?? text;
      return { enhanced };
    } catch (err: any) {
      throw new BadGatewayException(`AI error: ${err?.message ?? 'Unknown'}`);
    }
  }

  // ── Survey summary (for Root Cause Analysis card) ──────────────────────────

  async getSurveySummary(programId: string) {
    const program = await this.repo.findOne({ where: { id: programId } });
    if (!program?.linkedSurveyId) throw new NotFoundException('No survey linked to this program');

    const surveyId = program.linkedSurveyId;
    const [survey, responses, questions] = await Promise.all([
      this.surveyRepo.findOne({ where: { id: surveyId } }),
      this.responseRepo.find({ where: { surveyId } }),
      this.questionRepo.find({ where: { survey: { id: surveyId } }, relations: ['survey'] }),
    ]);
    if (!survey) throw new NotFoundException('Linked survey not found');

    const responseCount = responses.length;
    if (responseCount === 0) {
      return { responseCount: 0, avgScore: null, lowestQuestions: [], surveyId, surveyTitle: survey.title };
    }

    const NUMERIC = ['LIKERT_5', 'LIKERT_10', 'NPS', 'RATING', 'YES_NO'];
    const questionScores: { id: string; text: string; avg: number }[] = [];

    for (const q of questions) {
      if (!NUMERIC.includes(q.type)) continue;
      const scores: number[] = [];
      for (const r of responses) {
        const ans = r.answers.find((a) => a.questionId === q.id);
        if (!ans) continue;
        const val = Number(ans.value);
        if (isNaN(val)) continue;
        let norm: number;
        if (q.type === 'LIKERT_5' || q.type === 'RATING') norm = ((val - 1) / 4) * 100;
        else if (q.type === 'LIKERT_10')                   norm = ((val - 1) / 9) * 100;
        else if (q.type === 'NPS')                         norm = (val / 10) * 100;
        else /* YES_NO */                                  norm = val ? 100 : 0;
        scores.push(norm);
      }
      if (!scores.length) continue;
      questionScores.push({
        id: q.id,
        text: q.text,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      });
    }

    const avgScore = questionScores.length
      ? Math.round(questionScores.reduce((a, b) => a + b.avg, 0) / questionScores.length)
      : null;

    const lowestQuestions = [...questionScores].sort((a, b) => a.avg - b.avg).slice(0, 3);

    return { responseCount, avgScore, lowestQuestions, surveyId, surveyTitle: survey.title };
  }

  // ── AI: suggest root causes from survey data ────────────────────────────────

  async aiRootCauses(programId: string) {
    const [program, summary] = await Promise.all([
      this.repo.findOne({ where: { id: programId } }),
      this.getSurveySummary(programId).catch(() => null),
    ]);
    if (!program) throw new NotFoundException('Program not found');

    const surveyContext = summary
      ? `Survey results (${summary.responseCount} responses, avg score ${summary.avgScore ?? 'N/A'}/100):
${(summary.lowestQuestions as any[]).map((q: any) => `- "${q.text}" scored ${q.avg}/100`).join('\n')}`
      : 'No survey data available yet.';

    const prompt = `You are an expert healthcare workforce analyst.

Program: ${program.name}
Objective: ${program.objective ?? ''}
Problem Statement: ${program.problemStatement ?? ''}

${surveyContext}

Based on this data, identify 4-6 root causes that most likely explain the low engagement/performance scores.
Format as a bulleted list. Be specific and actionable. Focus on systemic issues, not individual blame.
Return ONLY the bullet list, no preamble or headers.`;

    try {
      const msg = await this.ai.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = (msg.content[0] as any).text?.trim() ?? '';
      return { suggestions: text };
    } catch (err: any) {
      throw new BadGatewayException(`AI error: ${err?.message ?? 'Unknown'}`);
    }
  }

  // ── AI: suggest issues from findings ───────────────────────────────────────

  async aiIssues(programId: string) {
    const program = await this.repo.findOne({ where: { id: programId } });
    if (!program) throw new NotFoundException('Program not found');

    const findings = program.rootCauseChecklist?.findings ?? '';
    if (!findings.trim()) throw new BadRequestException('Save your findings first before generating issue suggestions');

    const prompt = `You are a healthcare workforce improvement specialist.

Program: ${program.name}
Root cause findings: ${findings}

Generate 4-6 specific, actionable issues that should be tracked and resolved to address these root causes.
Return ONLY a valid JSON array, no explanation. Each item must have:
{
  "title": "<concise issue title, max 80 chars>",
  "description": "<1-2 sentence description of what needs to be fixed>",
  "severity": "<CRITICAL|HIGH|MEDIUM|LOW>"
}`;

    try {
      const msg = await this.ai.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = (msg.content[0] as any).text?.trim() ?? '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      let issues: any[];
      try { issues = JSON.parse(cleaned); } catch { throw new BadRequestException('AI returned unexpected format. Please try again.'); }
      return { issues };
    } catch (err: any) {
      if (err?.status) throw err; // re-throw HttpExceptions
      throw new BadGatewayException(`AI error: ${err?.message ?? 'Unknown'}`);
    }
  }
}
