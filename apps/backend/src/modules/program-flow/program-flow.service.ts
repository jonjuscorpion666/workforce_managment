import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProgramCycle } from './entities/program-cycle.entity';
import { CycleStageStatus, ProgramStage, StageState } from './entities/cycle-stage-status.entity';
import { OrgUnit, OrgLevel } from '../org/entities/org-unit.entity';
import { Survey, SurveyStatus } from '../surveys/entities/survey.entity';
import { Response } from '../responses/entities/response.entity';
import { Issue, IssueStatus } from '../issues/entities/issue.entity';
import { ActionPlan, ActionPlanStatus } from '../issues/entities/action-plan.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';

const STAGE_ORDER: ProgramStage[] = [
  ProgramStage.SURVEY_SETUP,
  ProgramStage.SURVEY_EXECUTION,
  ProgramStage.ROOT_CAUSE,
  ProgramStage.REMEDIATION,
  ProgramStage.COMMUNICATION,
  ProgramStage.VALIDATION,
];

// System-wide SLA defaults in days — overridden per cycle via cycle.stageSla
const DEFAULT_STAGE_SLA: Record<ProgramStage, number> = {
  [ProgramStage.SURVEY_SETUP]:     7,
  [ProgramStage.SURVEY_EXECUTION]: 21,
  [ProgramStage.ROOT_CAUSE]:       14,
  [ProgramStage.REMEDIATION]:      45,
  [ProgramStage.COMMUNICATION]:    7,
  [ProgramStage.VALIDATION]:       14,
};

function resolveSla(cycle: ProgramCycle): Record<ProgramStage, number> {
  if (!cycle.stageSla) return DEFAULT_STAGE_SLA;
  // Merge: cycle overrides take precedence, defaults fill gaps
  return Object.fromEntries(
    (Object.keys(DEFAULT_STAGE_SLA) as ProgramStage[]).map((stage) => [
      stage,
      cycle.stageSla![stage] ?? DEFAULT_STAGE_SLA[stage],
    ]),
  ) as Record<ProgramStage, number>;
}

const STATE_COLOR: Record<StageState, string> = {
  [StageState.NOT_STARTED]: '#9CA3AF',
  [StageState.IN_PROGRESS]: '#F59E0B',
  [StageState.COMPLETED]:   '#10B981',
  [StageState.BLOCKED]:     '#EF4444',
};

function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function slaStatus(slaDays: number, daysInStage: number | null): 'ok' | 'warning' | 'overdue' {
  if (daysInStage === null) return 'ok';
  if (daysInStage >= slaDays) return 'overdue';
  if (daysInStage >= slaDays * 0.75) return 'warning';
  return 'ok';
}

@Injectable()
export class ProgramFlowService {
  constructor(
    @InjectRepository(ProgramCycle)
    private cycleRepo: Repository<ProgramCycle>,
    @InjectRepository(CycleStageStatus)
    private stageRepo: Repository<CycleStageStatus>,
    @InjectRepository(OrgUnit)
    private orgRepo: Repository<OrgUnit>,
    @InjectRepository(Survey)
    private surveyRepo: Repository<Survey>,
    @InjectRepository(Response)
    private responseRepo: Repository<Response>,
    @InjectRepository(Issue)
    private issueRepo: Repository<Issue>,
    @InjectRepository(ActionPlan)
    private actionPlanRepo: Repository<ActionPlan>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
  ) {}

  // ─── Cycles CRUD ─────────────────────────────────────────────────────────────

  async createCycle(body: any, createdById: string): Promise<any> {
    const cycle = this.cycleRepo.create({
      ...body,
      createdById,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
    });
    const saved = await this.cycleRepo.save(cycle) as unknown as ProgramCycle;
    await this.initStageStatuses(saved);
    return this.getPipelineView(saved.id);
  }

  async listCycles(): Promise<any[]> {
    const cycles = await this.cycleRepo.find({ order: { createdAt: 'DESC' } });
    return cycles.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      startDate: c.startDate,
      targetEndDate: c.targetEndDate,
      surveyId: c.surveyId,
    }));
  }

  // ─── Enriched pipeline view ───────────────────────────────────────────────────

  async getPipelineView(cycleId: string): Promise<any> {
    const cycle = await this.cycleRepo.findOne({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');

    const stages = await this.stageRepo.find({ where: { cycleId } });
    const orgIds = [...new Set(stages.map((s) => s.orgUnitId))];
    if (!orgIds.length) {
      return { cycle, stageOrder: STAGE_ORDER, hospitals: [], alerts: [], kpis: {} };
    }

    const orgUnits = await this.orgRepo.findBy({ id: In(orgIds) });
    const orgMap = Object.fromEntries(orgUnits.map((o) => [o.id, o]));
    const surveyId = cycle.surveyId;
    const stageSlaMap = resolveSla(cycle);

    // ── Batch-load supporting data ────────────────────────────────────────────
    // Response counts per orgUnit
    const responseCountMap: Record<string, number> = {};
    if (surveyId) {
      const rows = await this.responseRepo
        .createQueryBuilder('r')
        .select('r."orgUnitId"', 'orgUnitId')
        .addSelect('COUNT(*)', 'cnt')
        .where('r."surveyId" = :surveyId', { surveyId })
        .andWhere('r."orgUnitId" IN (:...ids)', { ids: orgIds })
        .groupBy('r."orgUnitId"')
        .getRawMany();
      rows.forEach((r) => { responseCountMap[r.orgUnitId] = parseInt(r.cnt, 10); });
    }

    // Issues per orgUnit
    const issuesByUnit: Record<string, Issue[]> = {};
    if (surveyId) {
      const issues = await this.issueRepo.find({ where: { orgUnitId: In(orgIds), linkedSurveyId: surveyId } });
      issues.forEach((i) => {
        if (!issuesByUnit[i.orgUnitId]) issuesByUnit[i.orgUnitId] = [];
        issuesByUnit[i.orgUnitId].push(i);
      });
    }

    // Action plans per issue (for units with issues)
    const allIssueIds = Object.values(issuesByUnit).flat().map((i) => i.id);
    const plansByIssue: Record<string, ActionPlan[]> = {};
    if (allIssueIds.length) {
      const plans = await this.actionPlanRepo.find({ where: { issueId: In(allIssueIds) } });
      plans.forEach((p) => {
        if (!plansByIssue[p.issueId]) plansByIssue[p.issueId] = [];
        plansByIssue[p.issueId].push(p);
      });
    }

    // Tasks per orgUnit
    const tasksByUnit: Record<string, Task[]> = {};
    const tasks = await this.taskRepo.find({ where: { orgUnitId: In(orgIds) } });
    tasks.forEach((t) => {
      if (!tasksByUnit[t.orgUnitId]) tasksByUnit[t.orgUnitId] = [];
      tasksByUnit[t.orgUnitId].push(t);
    });

    // Survey metadata
    const survey = surveyId ? await this.surveyRepo.findOne({ where: { id: surveyId } }) : null;

    // ── Build unit stage maps with enriched cells ─────────────────────────────
    const byUnit: Record<string, any> = {};
    for (const s of stages) {
      if (!byUnit[s.orgUnitId]) {
        const org = orgMap[s.orgUnitId];
        byUnit[s.orgUnitId] = {
          orgUnitId: s.orgUnitId,
          orgUnitName: org?.name ?? s.orgUnitId,
          orgLevel: org?.level,
          parentId: org?.parentId,
          stages: {},
        };
      }

      const daysIn = daysSince(s.startedAt);
      const slaDays = stageSlaMap[s.stage];
      const sla = slaStatus(slaDays, s.state === StageState.IN_PROGRESS ? daysIn : null);
      const metrics = this.buildStageMetrics(
        s.stage, s.orgUnitId, surveyId, survey,
        responseCountMap, issuesByUnit, plansByIssue, tasksByUnit,
      );

      const daysSinceUpdate = daysSince(s.updatedAt);
      const isStale = s.state === StageState.IN_PROGRESS && (daysSinceUpdate ?? 0) > 7;
      const isStuck = s.state === StageState.BLOCKED || (s.state === StageState.IN_PROGRESS && (daysIn ?? 0) > slaDays);

      byUnit[s.orgUnitId].stages[s.stage] = {
        stageId: s.id,
        stage: s.stage,
        state: s.state,
        color: STATE_COLOR[s.state],
        ownerName: s.ownerName,
        ownerRole: s.ownerRole,
        // note doubles as blockedReason when state=BLOCKED
        note: s.note,
        blockedReason: s.state === StageState.BLOCKED ? s.note : null,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        dueDate: s.dueDate,
        updatedAt: s.updatedAt,
        daysSinceUpdate,
        daysInStage: daysIn,
        slaDays,
        slaStatus: sla,
        isOverSla: sla === 'overdue' && s.state === StageState.IN_PROGRESS,
        isStale,
        isStuck,
        metrics,
      };
    }

    const units = Object.values(byUnit);

    // ── Group by hospital ────────────────────────────────────────────────────
    const hospitals: Record<string, any> = {};
    for (const unit of units) {
      if (unit.orgLevel === OrgLevel.HOSPITAL) {
        hospitals[unit.orgUnitId] = {
          hospitalId: unit.orgUnitId,
          hospitalName: unit.orgUnitName,
          unitRows: [],
          aggregateStages: {},
        };
      }
    }
    for (const unit of units) {
      if (unit.orgLevel !== OrgLevel.HOSPITAL) {
        const parentId = unit.parentId;
        if (parentId && hospitals[parentId]) {
          hospitals[parentId].unitRows.push(unit);
        } else if (!hospitals[unit.orgUnitId]) {
          hospitals[unit.orgUnitId] = {
            hospitalId: unit.orgUnitId,
            hospitalName: unit.orgUnitName,
            unitRows: [],
            aggregateStages: {},
          };
        }
      }
    }

    for (const h of Object.values(hospitals)) {
      for (const stage of STAGE_ORDER) {
        const allUnitStages = [
          ...(h.unitRows as any[]).map((u: any) => u.stages[stage]),
          units.find((u: any) => u.orgUnitId === h.hospitalId)?.stages[stage],
        ].filter(Boolean);

        const states = allUnitStages.map((s: any) => s.state as StageState);
        let agg: StageState;
        if (!states.length) agg = StageState.NOT_STARTED;
        else if (states.every((s) => s === StageState.COMPLETED)) agg = StageState.COMPLETED;
        else if (states.some((s) => s === StageState.BLOCKED)) agg = StageState.BLOCKED;
        else if (states.some((s) => s === StageState.IN_PROGRESS || s === StageState.COMPLETED)) agg = StageState.IN_PROGRESS;
        else agg = StageState.NOT_STARTED;

        const stuckCount = allUnitStages.filter((s: any) => s.isStuck).length;
        const overSlaCount = allUnitStages.filter((s: any) => s.isOverSla).length;
        const staleCount = allUnitStages.filter((s: any) => s.isStale).length;
        const noOwnerCount = allUnitStages.filter((s: any) =>
          (s.state === StageState.IN_PROGRESS || s.state === StageState.BLOCKED) && !s.ownerName
        ).length;
        const maxDays = Math.max(0, ...allUnitStages.map((s: any) => s.daysInStage ?? 0));

        h.aggregateStages[stage] = {
          state: agg,
          color: STATE_COLOR[agg],
          stuckCount,
          overSlaCount,
          staleCount,
          noOwnerCount,
          maxDaysInStage: maxDays || null,
          slaStatus: overSlaCount > 0 ? 'overdue' : stuckCount > 0 ? 'warning' : 'ok',
        };
      }
    }

    // ── System-wide KPIs & alerts ─────────────────────────────────────────────
    const allStages = units.flatMap((u: any) => Object.values(u.stages) as any[]);
    const stuckUnits = units.filter((u: any) =>
      Object.values(u.stages).some((s: any) => s.isStuck),
    );
    const overdueTasks = tasks.filter((t) => t.dueDate && t.status !== TaskStatus.DONE && new Date(t.dueDate) < new Date());
    const chronicIssues = Object.values(issuesByUnit).flat().filter((i) => {
      const days = daysSince(i.createdAt);
      return (days ?? 0) > 30 && i.status !== IssueStatus.RESOLVED && i.status !== IssueStatus.CLOSED;
    });
    const totalCompleted = allStages.filter((s: any) => s.state === StageState.COMPLETED).length;
    const totalStages = allStages.length;
    const overallCompletion = totalStages ? Math.round((totalCompleted / totalStages) * 100) : 0;

    const completedWithTime = allStages.filter((s: any) => s.completedAt && s.startedAt);
    const avgDaysPerStage = completedWithTime.length
      ? Math.round(completedWithTime.reduce((sum: number, s: any) =>
          sum + Math.floor((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 86400000), 0
        ) / completedWithTime.length)
      : null;

    const alerts = this.buildAlerts(units, hospitals, overdueTasks, chronicIssues);

    return {
      cycle: {
        id: cycle.id,
        name: cycle.name,
        status: cycle.status,
        surveyId: cycle.surveyId,
        surveyTitle: survey?.title,
        startDate: cycle.startDate,
        targetEndDate: cycle.targetEndDate,
        overallCompletion,
      },
      stageOrder: STAGE_ORDER,
      stageSla: stageSlaMap,
      hospitals: Object.values(hospitals),
      stuckUnits,
      alerts,
      kpis: {
        overallCompletion,
        hospitalsActive: Object.keys(hospitals).length,
        unitsStuck: stuckUnits.length,
        overdueTasks: overdueTasks.length,
        chronicIssues: chronicIssues.length,
        avgDaysPerStage,
        totalUnits: units.length,
      },
    };
  }

  // ─── Stage detail drill-down ─────────────────────────────────────────────────

  async getStageDetail(cycleId: string, orgUnitId: string, stage: string): Promise<any> {
    const cycle = await this.cycleRepo.findOne({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');

    const stageStatus = await this.stageRepo.findOne({
      where: { cycleId, orgUnitId, stage: stage as ProgramStage },
    });
    if (!stageStatus) throw new NotFoundException('Stage status not found');

    const orgUnit = await this.orgRepo.findOne({ where: { id: orgUnitId } });
    const surveyId = cycle.surveyId;

    const issues = surveyId
      ? await this.issueRepo.find({ where: { orgUnitId, linkedSurveyId: surveyId }, order: { createdAt: 'DESC' } })
      : [];

    const issueIds = issues.map((i) => i.id);
    const actionPlans = issueIds.length
      ? await this.actionPlanRepo.find({ where: { issueId: In(issueIds) } })
      : [];

    const tasks = await this.taskRepo.find({ where: { orgUnitId }, order: { dueDate: 'ASC' } });
    const overdueTasks = tasks.filter((t) => t.dueDate && t.status !== TaskStatus.DONE && new Date(t.dueDate) < new Date());

    const stageSlaMap = resolveSla(cycle);
    const daysIn = daysSince(stageStatus.startedAt);
    const sla = stageSlaMap[stage as ProgramStage];

    const daysSinceUpdate = daysSince(stageStatus.updatedAt);
    const isStale = stageStatus.state === StageState.IN_PROGRESS && (daysSinceUpdate ?? 0) > 7;
    const daysOverSla = daysIn !== null && daysIn > sla ? daysIn - sla : null;
    const curSlaStatus = slaStatus(sla, stageStatus.state === StageState.IN_PROGRESS ? daysIn : null);

    // Compute recommended next action
    let nextAction: string;
    if (stageStatus.state === StageState.BLOCKED) {
      nextAction = stageStatus.note
        ? `Resolve blocker: ${stageStatus.note}`
        : 'Identify and resolve the blocker before this stage can proceed';
    } else if (stageStatus.state === StageState.COMPLETED) {
      nextAction = 'Stage complete — confirm next stage has an assigned owner';
    } else if (!stageStatus.ownerName && stageStatus.state === StageState.IN_PROGRESS) {
      nextAction = 'Assign an owner immediately — unowned active stages are the top predictor of delays';
    } else if (daysOverSla !== null && daysOverSla > 0) {
      nextAction = `Escalate to ${stageStatus.ownerRole ?? 'CNO'} — SLA breached by ${daysOverSla} days`;
    } else if (curSlaStatus === 'warning') {
      nextAction = `Accelerate — ${sla - (daysIn ?? 0)} days remaining before SLA breach`;
    } else if (isStale) {
      nextAction = `Follow up with ${stageStatus.ownerName ?? 'owner'} — no update in ${daysSinceUpdate} days`;
    } else if (stageStatus.state === StageState.NOT_STARTED) {
      nextAction = 'Initiate this stage and assign an owner';
    } else {
      nextAction = 'Continue progress and keep stage notes updated';
    }

    return {
      stage: stage,
      stageSla: sla,
      stageId: stageStatus.id,
      state: stageStatus.state,
      ownerName: stageStatus.ownerName,
      ownerRole: stageStatus.ownerRole,
      note: stageStatus.note,
      blockedReason: stageStatus.state === StageState.BLOCKED ? stageStatus.note : null,
      startedAt: stageStatus.startedAt,
      completedAt: stageStatus.completedAt,
      dueDate: stageStatus.dueDate,
      updatedAt: stageStatus.updatedAt,
      daysSinceUpdate,
      isStale,
      daysInStage: daysIn,
      daysOverSla,
      slaStatus: curSlaStatus,
      nextAction,
      orgUnit: { id: orgUnit?.id, name: orgUnit?.name, level: orgUnit?.level },
      issues: issues.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        severity: i.severity,
        dueDate: i.dueDate,
        daysOpen: daysSince(i.createdAt),
        actionPlansCount: actionPlans.filter((p) => p.issueId === i.id).length,
      })),
      actionPlans: actionPlans.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        progressPercent: p.progressPercent,
        ownerId: p.ownerId,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        isOverdue: !!(t.dueDate && t.status !== TaskStatus.DONE && new Date(t.dueDate) < new Date()),
        daysOverdue: t.dueDate && t.status !== TaskStatus.DONE && new Date(t.dueDate) < new Date()
          ? Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000)
          : null,
      })),
      summary: {
        totalIssues: issues.length,
        openIssues: issues.filter((i) => i.status === IssueStatus.OPEN).length,
        totalTasks: tasks.length,
        doneTasks: tasks.filter((t) => t.status === TaskStatus.DONE).length,
        overdueTasks: overdueTasks.length,
        totalActionPlans: actionPlans.length,
      },
    };
  }

  // ─── Stage metrics builder ────────────────────────────────────────────────────

  private buildStageMetrics(
    stage: ProgramStage,
    orgUnitId: string,
    surveyId: string | null,
    survey: Survey | null,
    responseCountMap: Record<string, number>,
    issuesByUnit: Record<string, Issue[]>,
    plansByIssue: Record<string, ActionPlan[]>,
    tasksByUnit: Record<string, Task[]>,
  ): any {
    const issues = issuesByUnit[orgUnitId] ?? [];
    const tasks = tasksByUnit[orgUnitId] ?? [];
    const now = new Date();

    switch (stage) {
      case ProgramStage.SURVEY_SETUP:
        return {
          label: survey ? survey.status : 'No survey',
          detail: survey?.title ? `"${survey.title.slice(0, 28)}${survey.title.length > 28 ? '…' : ''}"` : null,
          surveyStatus: survey?.status ?? null,
        };

      case ProgramStage.SURVEY_EXECUTION: {
        const count = responseCountMap[orgUnitId] ?? 0;
        return {
          label: `${count} responses`,
          count,
          surveyStatus: survey?.status ?? null,
          detail: survey?.closesAt
            ? `Closes ${new Date(survey.closesAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : null,
        };
      }

      case ProgramStage.ROOT_CAUSE: {
        const analyzed = issues.filter((i) => i.status !== IssueStatus.OPEN).length;
        return {
          label: issues.length ? `${analyzed}/${issues.length} analyzed` : 'No issues',
          analyzed,
          total: issues.length,
          pct: issues.length ? Math.round((analyzed / issues.length) * 100) : null,
        };
      }

      case ProgramStage.REMEDIATION: {
        const issueIds = issues.map((i) => i.id);
        const plans = issueIds.flatMap((id) => plansByIssue[id] ?? []);
        const overdueTaskCount = tasks.filter(
          (t) => t.dueDate && t.status !== TaskStatus.DONE && new Date(t.dueDate) < now,
        ).length;
        const donePlans = plans.filter((p) => p.status === ActionPlanStatus.COMPLETED).length;
        return {
          label: plans.length ? `${donePlans}/${plans.length} plans done` : `${tasks.length} tasks`,
          overdueTaskCount,
          totalTasks: tasks.length,
          doneTasks: tasks.filter((t) => t.status === TaskStatus.DONE).length,
          totalPlans: plans.length,
          donePlans,
          hasOverdue: overdueTaskCount > 0,
        };
      }

      case ProgramStage.COMMUNICATION: {
        const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
        const overdueTasks = tasks.filter(
          (t) => t.dueDate && t.status !== TaskStatus.DONE && new Date(t.dueDate) < now,
        ).length;
        return {
          label: tasks.length ? `${doneTasks}/${tasks.length} tasks` : 'No tasks',
          totalTasks: tasks.length,
          doneTasks,
          overdueTasks,
          hasOverdue: overdueTasks > 0,
        };
      }

      case ProgramStage.VALIDATION:
        return {
          label: survey?.linkedIssueId ? 'Linked' : 'Awaiting survey',
          detail: null,
        };

      default:
        return {};
    }
  }

  // ─── Alert builder ────────────────────────────────────────────────────────────

  private buildAlerts(
    units: any[],
    hospitals: Record<string, any>,
    overdueTasks: Task[],
    chronicIssues: Issue[],
  ): any[] {
    const alerts: any[] = [];

    // Stage-blocked alerts (single blocked unit is still surfaced)
    for (const stage of STAGE_ORDER) {
      const blockedUnits = units.filter((u: any) => u.stages[stage]?.state === StageState.BLOCKED);
      if (blockedUnits.length >= 1) {
        const reasons = blockedUnits.map((u: any) => u.stages[stage]?.blockedReason).filter(Boolean);
        alerts.push({
          severity: 'critical',
          type: 'STAGE_BLOCKED',
          stage,
          message: `${blockedUnits.length} unit${blockedUnits.length > 1 ? 's' : ''} blocked in ${stage.replace(/_/g, ' ').toLowerCase()}`,
          count: blockedUnits.length,
          unitNames: blockedUnits.slice(0, 3).map((u: any) => u.orgUnitName),
          unitIds: blockedUnits.map((u: any) => u.orgUnitId),
          reasons: reasons.slice(0, 2),
        });
      }
    }

    // Over-SLA alerts
    for (const stage of STAGE_ORDER) {
      const overdueUnits = units.filter((u: any) => u.stages[stage]?.isOverSla);
      if (overdueUnits.length) {
        const maxDays = Math.max(...overdueUnits.map((u: any) => u.stages[stage]?.daysInStage ?? 0));
        alerts.push({
          severity: 'high',
          type: 'SLA_BREACH',
          stage,
          message: `${overdueUnits.length} unit${overdueUnits.length > 1 ? 's' : ''} over SLA in ${stage.replace(/_/g, ' ').toLowerCase()} (max ${maxDays}d)`,
          count: overdueUnits.length,
          maxDays,
          unitNames: overdueUnits.slice(0, 3).map((u: any) => u.orgUnitName),
          unitIds: overdueUnits.map((u: any) => u.orgUnitId),
        });
      }
    }

    // Stale stages (in-progress, no update >7d)
    const staleStages = units.flatMap((u: any) =>
      Object.entries(u.stages)
        .filter(([, s]: any) => s.isStale)
        .map(([stage]) => ({ unitName: u.orgUnitName, unitId: u.orgUnitId, stage })),
    );
    if (staleStages.length >= 2) {
      const uniqueUnits = [...new Set(staleStages.map((s) => s.unitName))];
      alerts.push({
        severity: 'high',
        type: 'STALE_STAGES',
        message: `${staleStages.length} stages have no update in 7+ days`,
        count: staleStages.length,
        unitNames: uniqueUnits.slice(0, 3),
        unitIds: [...new Set(staleStages.map((s) => s.unitId))],
      });
    }

    // Overdue tasks
    if (overdueTasks.length >= 3) {
      const affectedUnits = [...new Set(overdueTasks.map((t) => t.orgUnitId).filter(Boolean))];
      alerts.push({
        severity: 'high',
        type: 'OVERDUE_TASKS',
        message: `${overdueTasks.length} overdue tasks across ${affectedUnits.length} unit${affectedUnits.length !== 1 ? 's' : ''}`,
        count: overdueTasks.length,
        unitIds: affectedUnits,
      });
    }

    // Chronic issues
    if (chronicIssues.length >= 2) {
      const affectedUnits = [...new Set(chronicIssues.map((i) => i.orgUnitId).filter(Boolean))];
      alerts.push({
        severity: 'medium',
        type: 'CHRONIC_ISSUES',
        message: `${chronicIssues.length} issues unresolved >30 days across ${affectedUnits.length} unit${affectedUnits.length !== 1 ? 's' : ''}`,
        count: chronicIssues.length,
        unitIds: affectedUnits,
      });
    }

    // No owner on active stages
    const unownedActive = units.filter((u: any) =>
      Object.values(u.stages).some((s: any) =>
        (s.state === StageState.IN_PROGRESS || s.state === StageState.BLOCKED) && !s.ownerName,
      ),
    );
    if (unownedActive.length >= 2) {
      alerts.push({
        severity: 'medium',
        type: 'NO_OWNER',
        message: `${unownedActive.length} units have active stages with no assigned owner`,
        count: unownedActive.length,
        unitNames: unownedActive.slice(0, 3).map((u: any) => u.orgUnitName),
        unitIds: unownedActive.map((u: any) => u.orgUnitId),
      });
    }

    // Sort: critical → high → medium
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
    return alerts.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
  }

  // ─── SLA config ──────────────────────────────────────────────────────────────

  async updateSlaConfig(cycleId: string, slaOverrides: Record<string, number>): Promise<any> {
    const cycle = await this.cycleRepo.findOne({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');
    // Merge new overrides with existing, only keep known stages
    const merged: Record<string, number> = {};
    for (const stage of Object.keys(DEFAULT_STAGE_SLA)) {
      const incoming = slaOverrides[stage];
      if (incoming != null && incoming > 0) merged[stage] = incoming;
    }
    cycle.stageSla = Object.keys(merged).length ? merged : null;
    await this.cycleRepo.save(cycle);
    return { stageSla: resolveSla(cycle), isCustom: cycle.stageSla !== null };
  }

  getDefaultSla(): Record<string, number> {
    return { ...DEFAULT_STAGE_SLA };
  }

  // ─── Stage status updates ─────────────────────────────────────────────────────

  async updateStageStatus(stageId: string, body: any, userId: string): Promise<CycleStageStatus> {
    const stage = await this.stageRepo.findOne({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage status not found');

    const prevState = stage.state;
    Object.assign(stage, body);

    if (body.state === StageState.IN_PROGRESS && prevState === StageState.NOT_STARTED) {
      stage.startedAt = new Date();
    }
    if (body.state === StageState.COMPLETED && !stage.completedAt) {
      stage.completedAt = new Date();
    }

    return this.stageRepo.save(stage);
  }

  async bulkUpdateStages(cycleId: string, orgUnitId: string, body: any, userId: string): Promise<any> {
    const { stage, state, note, ownerName, ownerRole, dueDate } = body;
    const existing = await this.stageRepo.findOne({ where: { cycleId, orgUnitId, stage } });
    if (!existing) throw new NotFoundException('Stage status not found');
    return this.updateStageStatus(existing.id, { state, note, ownerName, ownerRole, dueDate }, userId);
  }

  // ─── Auto-compute ─────────────────────────────────────────────────────────────

  async autoComputeStages(cycleId: string): Promise<{ updated: number }> {
    const cycle = await this.cycleRepo.findOne({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');

    const stages = await this.stageRepo.find({ where: { cycleId } });
    let updated = 0;

    for (const s of stages) {
      const computed = await this.computeStateForStage(cycle, s);
      if (computed && computed !== s.state) {
        s.state = computed;
        if (computed === StageState.IN_PROGRESS && !s.startedAt) s.startedAt = new Date();
        if (computed === StageState.COMPLETED && !s.completedAt) s.completedAt = new Date();
        await this.stageRepo.save(s);
        updated++;
      }
    }
    return { updated };
  }

  private async computeStateForStage(cycle: ProgramCycle, s: CycleStageStatus): Promise<StageState | null> {
    const { orgUnitId, stage } = s;
    const surveyId = cycle.surveyId;

    switch (stage) {
      case ProgramStage.SURVEY_SETUP: {
        if (!surveyId) return StageState.NOT_STARTED;
        const survey = await this.surveyRepo.findOne({ where: { id: surveyId } });
        if (!survey) return StageState.NOT_STARTED;
        if (survey.status === SurveyStatus.ACTIVE || survey.status === SurveyStatus.CLOSED) return StageState.COMPLETED;
        if (survey.status === SurveyStatus.DRAFT) return StageState.IN_PROGRESS;
        return StageState.NOT_STARTED;
      }
      case ProgramStage.SURVEY_EXECUTION: {
        if (!surveyId) return StageState.NOT_STARTED;
        const count = await this.responseRepo.count({ where: { surveyId, orgUnitId } });
        if (count === 0) return StageState.NOT_STARTED;
        const survey = await this.surveyRepo.findOne({ where: { id: surveyId } });
        if (survey?.status === SurveyStatus.CLOSED) return StageState.COMPLETED;
        return StageState.IN_PROGRESS;
      }
      case ProgramStage.ROOT_CAUSE: {
        const issues = await this.issueRepo.find({ where: { orgUnitId, linkedSurveyId: surveyId } });
        if (!issues.length) return StageState.NOT_STARTED;
        return issues.every((i) => i.status !== IssueStatus.OPEN) ? StageState.COMPLETED : StageState.IN_PROGRESS;
      }
      case ProgramStage.REMEDIATION: {
        const issues = await this.issueRepo.find({ where: { orgUnitId, linkedSurveyId: surveyId } });
        if (!issues.length) return null;
        const plans = await this.actionPlanRepo.find({ where: { issueId: In(issues.map((i) => i.id)) } });
        if (!plans.length) return StageState.NOT_STARTED;
        return plans.every((p) => p.status === ActionPlanStatus.COMPLETED) ? StageState.COMPLETED : StageState.IN_PROGRESS;
      }
      case ProgramStage.COMMUNICATION: {
        const tasks = await this.taskRepo.find({ where: { orgUnitId } });
        if (!tasks.length) return null;
        return tasks.every((t) => t.status === TaskStatus.DONE) ? StageState.COMPLETED : StageState.IN_PROGRESS;
      }
      case ProgramStage.VALIDATION: {
        if (!surveyId) return StageState.NOT_STARTED;
        const survey = await this.surveyRepo.findOne({ where: { id: surveyId } });
        return survey?.linkedIssueId ? StageState.COMPLETED : null;
      }
      default: return null;
    }
  }

  // ─── Init stage statuses ──────────────────────────────────────────────────────

  private async initStageStatuses(cycle: ProgramCycle): Promise<void> {
    let orgUnits: OrgUnit[];
    if (cycle.hospitalId) {
      orgUnits = await this.orgRepo.find({ where: [{ id: cycle.hospitalId }, { parentId: cycle.hospitalId }] });
    } else {
      orgUnits = await this.orgRepo.find({ where: { isActive: true } });
    }

    const records: Partial<CycleStageStatus>[] = [];
    for (const org of orgUnits) {
      for (const stage of STAGE_ORDER) {
        records.push({ cycleId: cycle.id, orgUnitId: org.id, stage, state: StageState.NOT_STARTED });
      }
    }

    if (records.length) {
      await this.stageRepo
        .createQueryBuilder()
        .insert()
        .into(CycleStageStatus)
        .values(records)
        .orIgnore()
        .execute();
    }
  }
}
