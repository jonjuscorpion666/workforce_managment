import { DataSource } from 'typeorm';
import { OrgUnit, OrgLevel } from '../../modules/org/entities/org-unit.entity';
import { Issue } from '../../modules/issues/entities/issue.entity';
import { ActionPlan, ActionPlanMilestone, ActionPlanStatus, MilestoneStatus } from '../../modules/issues/entities/action-plan.entity';
import { Task, TaskStatus, TaskPriority } from '../../modules/tasks/entities/task.entity';
import { User } from '../../modules/auth/entities/user.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Task definitions per milestone ───────────────────────────────────────────
// Each task carries: title, description, priority, assigneeRole ('manager'|'director'), dueDaysFromNow

interface TaskDef {
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeRole: 'manager' | 'director';
  dueDaysFromNow: number;
}

const MILESTONE_1_TASKS: TaskDef[] = [
  {
    title: 'Conduct 1:1 interviews with float pool nurses',
    description: 'Interview at least 5 float pool nurses to surface the top barriers to a positive experience. Focus on assignment clarity, unit welcome, and communication gaps. Document themes.',
    priority: TaskPriority.HIGH,
    assigneeRole: 'manager',
    dueDaysFromNow: 10,
  },
  {
    title: 'Review float pool assignment history (last 90 days)',
    description: 'Pull assignment data for the past 90 days. Identify patterns: Are nurses being sent to unfamiliar units repeatedly? Are assignments distributed fairly? Flag outliers.',
    priority: TaskPriority.MEDIUM,
    assigneeRole: 'manager',
    dueDaysFromNow: 8,
  },
  {
    title: 'Analyse Speak Up submissions related to float pool',
    description: 'Search Speak Up cases for keywords: float, float pool, pool nurse, temporary assignment. Summarise recurring themes and link findings to the issue.',
    priority: TaskPriority.MEDIUM,
    assigneeRole: 'director',
    dueDaysFromNow: 10,
  },
  {
    title: 'Survey float pool coordinator on current process gaps',
    description: 'Sit down with the float pool coordinator and walk through the current assignment workflow. Identify where the process breaks down and what nurses most commonly complain about informally.',
    priority: TaskPriority.MEDIUM,
    assigneeRole: 'manager',
    dueDaysFromNow: 12,
  },
];

const MILESTONE_2_TASKS: TaskDef[] = [
  {
    title: 'Draft revised float pool orientation checklist',
    description: 'Create a unit-specific orientation checklist that charge nurses must complete with every float nurse at the start of a shift. Include: unit layout, emergency codes, key contacts, equipment location, and documentation system login.',
    priority: TaskPriority.HIGH,
    assigneeRole: 'manager',
    dueDaysFromNow: 25,
  },
  {
    title: 'Update unit handoff guides for float nurses',
    description: 'Revise the existing unit handoff guide to include a float nurse section. This should cover what they need to know in the first 15 minutes and who to contact if they need support.',
    priority: TaskPriority.MEDIUM,
    assigneeRole: 'manager',
    dueDaysFromNow: 28,
  },
  {
    title: 'Define scheduling fairness criteria for float assignments',
    description: 'Work with the float pool coordinator to document formal fairness criteria: maximum consecutive nights in unfamiliar units, rotation frequency per unit, advance notice minimums. Get criteria approved by the Director.',
    priority: TaskPriority.HIGH,
    assigneeRole: 'manager',
    dueDaysFromNow: 30,
  },
  {
    title: 'Present revised protocol to Director of Nursing for review',
    description: 'Compile the orientation checklist, updated handoff guide, and scheduling fairness criteria into a single protocol document. Present to the Director of Nursing for sign-off before rollout.',
    priority: TaskPriority.MEDIUM,
    assigneeRole: 'director',
    dueDaysFromNow: 33,
  },
];

const MILESTONE_3_TASKS: TaskDef[] = [
  {
    title: 'Roll out orientation checklist to all unit charge nurses',
    description: 'Distribute the approved float nurse orientation checklist to all charge nurses via the announcement module. Hold a brief 10-minute huddle on each unit to walk through expectations. Confirm receipt.',
    priority: TaskPriority.HIGH,
    assigneeRole: 'manager',
    dueDaysFromNow: 45,
  },
  {
    title: 'Brief float pool staff on updated protocols',
    description: 'Hold a 30-minute all-hands session with float pool nurses to review the new protocol, answer questions, and set expectations. Record key points in meeting notes and link to this issue.',
    priority: TaskPriority.HIGH,
    assigneeRole: 'manager',
    dueDaysFromNow: 47,
  },
  {
    title: 'Publish float pool resource guide for nurses',
    description: 'Create a one-page resource guide covering: how to request a familiar unit, how to flag concerns during a shift, the new fairness scheduling criteria, and the bi-weekly check-in schedule. Publish via announcements.',
    priority: TaskPriority.LOW,
    assigneeRole: 'manager',
    dueDaysFromNow: 50,
  },
  {
    title: 'Set up bi-weekly float pool check-ins with manager',
    description: 'Establish a recurring 20-minute check-in with the float pool nurses (group or rotating 1:1s). Log first three check-ins as meetings. Track issues raised and actions taken.',
    priority: TaskPriority.MEDIUM,
    assigneeRole: 'manager',
    dueDaysFromNow: 52,
  },
];

const MILESTONE_4_TASKS: TaskDef[] = [
  {
    title: 'Deploy follow-up pulse survey to float pool nurses',
    description: 'Create a targeted pulse survey in the system scoped to the Float Pool unit. Include at minimum the Overall Experience dimension questions. Set a 2-week response window.',
    priority: TaskPriority.HIGH,
    assigneeRole: 'director',
    dueDaysFromNow: 68,
  },
  {
    title: 'Review pulse survey scores against the 70% target threshold',
    description: 'Once the survey closes, review the Overall Experience dimension scores for the Float Pool unit. Compare against the 70% target threshold. Document scores in the issue and trigger the validation workflow if target is met.',
    priority: TaskPriority.HIGH,
    assigneeRole: 'director',
    dueDaysFromNow: 75,
  },
  {
    title: 'Document lessons learned and close out action plan',
    description: 'Write a brief lessons-learned summary covering: what worked, what did not, what should be standardised across other units. Attach to the action plan notes before marking it complete.',
    priority: TaskPriority.LOW,
    assigneeRole: 'manager',
    dueDaysFromNow: 77,
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedFloatPoolIssue(dataSource: DataSource) {
  const orgRepo       = dataSource.getRepository(OrgUnit);
  const issueRepo     = dataSource.getRepository(Issue);
  const planRepo      = dataSource.getRepository(ActionPlan);
  const milestoneRepo = dataSource.getRepository(ActionPlanMilestone);
  const taskRepo      = dataSource.getRepository(Task);
  const userRepo      = dataSource.getRepository(User);

  console.log('\n🌱 Seeding: Low Overall Experience — Float Pool...');

  // ── Guard: skip if fully seeded; create missing tasks if issue exists ───────
  const existing = await issueRepo.findOne({ where: { title: 'Low Overall Experience — Float Pool' } });
  if (existing) {
    const existingTaskCount = await taskRepo.count({ where: { issueId: existing.id } });
    if (existingTaskCount > 0) {
      console.log(`   → Already seeded (${existingTaskCount} tasks found), skipping.\n`);
      return;
    }

    // Issue exists but tasks were never created — fill in missing pieces
    console.log('   → Issue exists but no tasks found — creating missing dependencies + tasks...');
    const director2 = await userRepo.findOne({ where: { email: 'director@hospital.com' } });
    const manager2  = await userRepo.findOne({ where: { email: 'manager@hospital.com' } });
    if (!director2 || !manager2) {
      console.warn('   ⚠ Director or Manager user not found — cannot create tasks.');
      return;
    }

    // Ensure Float Pool dept + unit exist
    const indyHospital2 = await orgRepo.findOne({ where: { code: 'FH-INDY' } });
    if (!indyHospital2) {
      console.warn('   ⚠ FH-INDY hospital not found — cannot create tasks.');
      return;
    }
    let floatPoolDept2 = await orgRepo.findOne({ where: { code: 'FH-INDY-FLOAT-DEPT' } });
    if (!floatPoolDept2) {
      floatPoolDept2 = await orgRepo.save(orgRepo.create({
        name: 'Float Pool', code: 'FH-INDY-FLOAT-DEPT',
        level: OrgLevel.DEPARTMENT, location: 'Indianapolis, IN',
        timezone: 'America/Indiana/Indianapolis',
        parent: indyHospital2, parentId: indyHospital2.id, isActive: true,
      }));
      console.log('   ✓ Created department: Float Pool');
    }
    let floatUnit = await orgRepo.findOne({ where: { code: 'FH-INDY-FLOAT' } });
    if (!floatUnit) {
      floatUnit = await orgRepo.save(orgRepo.create({
        name: 'Float Pool — Inpatient', code: 'FH-INDY-FLOAT',
        level: OrgLevel.UNIT, location: 'Indianapolis, IN',
        timezone: 'America/Indiana/Indianapolis',
        parent: floatPoolDept2, parentId: floatPoolDept2.id, isActive: true,
      }));
      console.log('   ✓ Created unit: Float Pool — Inpatient');
    }

    // Ensure action plan exists
    let plan2 = await planRepo.findOne({ where: { issueId: existing.id } });
    if (!plan2) {
      plan2 = await planRepo.save(planRepo.create({
        issueId: existing.id,
        title: 'Float Pool Experience Improvement Plan',
        objective: 'Raise the Overall Experience dimension score for Float Pool nurses from 48% to at least 70% within 90 days, by improving orientation consistency, scheduling fairness, and management communication.',
        rootCauseSummary: 'Three primary drivers: (1) No standardised orientation checklist. (2) Reactive scheduling with short notice. (3) No regular management touchpoint for float nurses.',
        plannedActions: ['Conduct interviews and review data.', 'Redesign protocol.', 'Roll out with training.', 'Deploy follow-up survey.'],
        successCriteria: 'Overall Experience ≥ 70% in the follow-up pulse survey.',
        ownerId: director2.id,
        startDate: new Date(),
        endDate: daysFromNow(90),
        status: ActionPlanStatus.ACTIVE,
        progressPercent: 0,
        createdById: director2.id,
      }));
      console.log('   ✓ Created action plan');
    }

    // Ensure milestones exist
    let milestones2 = await milestoneRepo.find({ where: { actionPlanId: plan2.id }, order: { dueDate: 'ASC' } });
    if (milestones2.length === 0) {
      const milestoneDefs2 = [
        { title: 'Phase 1 — Root Cause Investigation', dueDate: daysFromNow(14), notes: 'Conduct interviews, review data, analyse Speak Up submissions.' },
        { title: 'Phase 2 — Protocol Redesign',        dueDate: daysFromNow(35), notes: 'Draft and gain sign-off on revised orientation checklist and scheduling criteria.' },
        { title: 'Phase 3 — Implementation & Training',dueDate: daysFromNow(56), notes: 'Roll out protocol, brief staff, establish bi-weekly check-ins.' },
        { title: 'Phase 4 — Follow-up Survey & Validation', dueDate: daysFromNow(77), notes: 'Deploy pulse survey, review scores, document lessons learned.' },
      ];
      for (const def of milestoneDefs2) {
        const m = await milestoneRepo.save(milestoneRepo.create({
          actionPlanId: plan2.id, title: def.title, dueDate: def.dueDate,
          status: MilestoneStatus.PENDING, notes: def.notes,
        }));
        milestones2.push(m);
        console.log(`   ✓ Milestone: ${m.title}`);
      }
    }

    const allDefs = [MILESTONE_1_TASKS, MILESTONE_2_TASKS, MILESTONE_3_TASKS, MILESTONE_4_TASKS];
    for (let i = 0; i < milestones2.length && i < allDefs.length; i++) {
      for (const def of allDefs[i]) {
        const assigneeId = def.assigneeRole === 'manager' ? manager2.id : director2.id;
        await taskRepo.save(taskRepo.create({
          title:        def.title,
          description:  def.description,
          status:       TaskStatus.TODO,
          priority:     def.priority,
          issueId:      existing.id,
          ownerId:      manager2.id,
          assignedToId: assigneeId,
          orgUnitId:    floatUnit.id,
          dueDate:      daysFromNow(def.dueDaysFromNow),
          createdById:  director2.id,
        }));
      }
      console.log(`   ✓ Tasks created for: ${milestones2[i].title}`);
    }
    console.log('✅ Float Pool tasks seeded\n');
    return;
  }

  // ── Resolve users ──────────────────────────────────────────────────────────
  const director = await userRepo.findOne({ where: { email: 'director@hospital.com' } });
  const manager  = await userRepo.findOne({ where: { email: 'manager@hospital.com' } });

  if (!director || !manager) {
    console.warn('   ⚠ Director or Manager user not found — run demo-users seed first.');
    return;
  }

  // ── Find Indianapolis hospital org unit ───────────────────────────────────
  const indyHospital = await orgRepo.findOne({ where: { code: 'FH-INDY' } });
  if (!indyHospital) {
    console.warn('   ⚠ FH-INDY hospital not found — run hospitals seed first.');
    return;
  }

  // ── Find or create Float Pool department ──────────────────────────────────
  let floatPoolDept = await orgRepo.findOne({ where: { code: 'FH-INDY-FLOAT-DEPT' } });
  if (!floatPoolDept) {
    floatPoolDept = await orgRepo.save(orgRepo.create({
      name: 'Float Pool',
      code: 'FH-INDY-FLOAT-DEPT',
      level: OrgLevel.DEPARTMENT,
      location: 'Indianapolis, IN',
      timezone: 'America/Indiana/Indianapolis',
      parent: indyHospital,
      parentId: indyHospital.id,
      isActive: true,
    }));
    console.log('   ✓ Created department: Float Pool');
  } else {
    console.log('   → Dept exists: Float Pool');
  }

  // ── Find or create Float Pool unit ────────────────────────────────────────
  let floatPoolUnit = await orgRepo.findOne({ where: { code: 'FH-INDY-FLOAT' } });
  if (!floatPoolUnit) {
    floatPoolUnit = await orgRepo.save(orgRepo.create({
      name: 'Float Pool — Inpatient',
      code: 'FH-INDY-FLOAT',
      level: OrgLevel.UNIT,
      location: 'Indianapolis, IN',
      timezone: 'America/Indiana/Indianapolis',
      parent: floatPoolDept,
      parentId: floatPoolDept.id,
      isActive: true,
    }));
    console.log('   ✓ Created unit: Float Pool — Inpatient');
  } else {
    console.log('   → Unit exists: Float Pool — Inpatient');
  }

  // ── Create Issue ──────────────────────────────────────────────────────────
  const issueDraft = issueRepo.create({
    title: 'Low Overall Experience — Float Pool',
    description:
      'Float pool nurses at Franciscan Health Indianapolis scored 48% on the Overall Experience dimension in the most recent pulse survey — well below the 70% threshold. ' +
      'Key pain points identified: inconsistent unit orientation, unpredictable scheduling, and lack of a structured handoff process when arriving at an unfamiliar unit. ' +
      'This is a recurring concern across two survey cycles.',
    status:       'ACTION_PLANNED' as any,
    severity:     'HIGH'           as any,
    priority:     'P2'             as any,
    source:       'SURVEY_AUTO'    as any,
    category:     'Staff Experience',
    subcategory:  'Overall Experience',
    issueLevel:   'UNIT',
    hospitalId:   indyHospital.id,
    ownerRole:    'Director',
    ownerId:      director.id,
    assignedToId: manager.id,
    orgUnitId:    floatPoolUnit!.id,
    baselineScore:     48,
    targetScore:       70,
    closureThreshold:  70,
    dueDate:           daysFromNow(90),
    statusNote:        'Action plan created. Four-phase improvement programme underway.',
    createdById:       director.id,
  } as any);
  const issue = await issueRepo.save(issueDraft) as unknown as Issue;
  console.log(`   ✓ Created issue: ${issue.title} [${issue.id}]`);

  // ── Create Action Plan ────────────────────────────────────────────────────
  const plan = await planRepo.save(planRepo.create({
    issueId: issue.id,
    title: 'Float Pool Experience Improvement Plan',
    objective:
      'Raise the Overall Experience dimension score for Float Pool nurses from 48% to at least 70% within 90 days, by improving orientation consistency, scheduling fairness, and management communication.',
    rootCauseSummary:
      'Root cause analysis identified three primary drivers: (1) No standardised orientation checklist when float nurses arrive at a new unit — charge nurses apply inconsistent welcome practices. ' +
      '(2) Scheduling is reactive, often placing nurses in units they have not worked in before with less than 12 hours notice. ' +
      '(3) Float pool nurses feel invisible — no regular touchpoint with management and no structured way to raise concerns short of a formal Speak Up.',
    plannedActions: [
      'Conduct structured interviews and review assignment data to validate root causes.',
      'Redesign float pool protocol: orientation checklist, scheduling fairness criteria, and updated unit handoff guides.',
      'Roll out protocol to charge nurses and float pool staff with training and briefing sessions.',
      'Deploy follow-up pulse survey and validate scores against the 70% threshold before closing.',
    ],
    successCriteria:
      'Overall Experience dimension score ≥ 70% in the follow-up pulse survey. Zero float pool nurses scoring the experience below 3/5 on the orientation question. ' +
      'Bi-weekly check-ins established and maintained for at least 6 weeks post-rollout.',
    ownerId: director.id,
    startDate: new Date(),
    endDate: daysFromNow(90),
    status: ActionPlanStatus.ACTIVE,
    progressPercent: 0,
    createdById: director.id,
  }));
  console.log(`   ✓ Created action plan: ${plan.title}`);

  // ── Create Milestones ─────────────────────────────────────────────────────
  const milestones: ActionPlanMilestone[] = [];

  const milestoneDefs = [
    {
      title: 'Phase 1 — Root Cause Investigation',
      dueDate: daysFromNow(14),
      notes: 'Conduct interviews, review assignment data, analyse Speak Up submissions, and debrief with the float pool coordinator.',
    },
    {
      title: 'Phase 2 — Protocol Redesign',
      dueDate: daysFromNow(35),
      notes: 'Draft and gain Director sign-off on the revised orientation checklist, scheduling fairness criteria, and updated unit handoff guides.',
    },
    {
      title: 'Phase 3 — Implementation & Training',
      dueDate: daysFromNow(56),
      notes: 'Roll out protocol to all charge nurses, brief float pool staff, publish the resource guide, and establish bi-weekly check-ins.',
    },
    {
      title: 'Phase 4 — Follow-up Survey & Validation',
      dueDate: daysFromNow(77),
      notes: 'Deploy pulse survey, review scores against 70% target, document lessons learned, and close out action plan.',
    },
  ];

  for (const def of milestoneDefs) {
    const m = await milestoneRepo.save(milestoneRepo.create({
      actionPlanId: plan.id,
      title: def.title,
      dueDate: def.dueDate,
      status: MilestoneStatus.PENDING,
      notes: def.notes,
    }));
    milestones.push(m);
    console.log(`   ✓ Milestone: ${m.title}`);
  }

  // ── Create Tasks ──────────────────────────────────────────────────────────
  async function createTasksForMilestone(defs: TaskDef[], milestoneTitle: string) {
    for (const def of defs) {
      const assigneeId = def.assigneeRole === 'manager' ? manager!.id : director!.id;
      await taskRepo.save(taskRepo.create({
        title: def.title,
        description: def.description,
        status: TaskStatus.TODO,
        priority: def.priority,
        issueId: issue.id,
        ownerId: manager!.id,
        assignedToId: assigneeId,
        orgUnitId: floatPoolUnit!.id,
        dueDate: daysFromNow(def.dueDaysFromNow),
        createdById: director!.id,
      }));
    }
    console.log(`   ✓ Tasks created for: ${milestoneTitle}`);
  }

  await createTasksForMilestone(MILESTONE_1_TASKS, milestones[0].title);
  await createTasksForMilestone(MILESTONE_2_TASKS, milestones[1].title);
  await createTasksForMilestone(MILESTONE_3_TASKS, milestones[2].title);
  await createTasksForMilestone(MILESTONE_4_TASKS, milestones[3].title);

  // ── Summary ───────────────────────────────────────────────────────────────
  const taskCount = MILESTONE_1_TASKS.length + MILESTONE_2_TASKS.length + MILESTONE_3_TASKS.length + MILESTONE_4_TASKS.length;

  console.log('\n✅ Float Pool issue seeded successfully');
  console.log('');
  console.log(`   Issue:        ${issue.title}`);
  console.log(`   Severity:     HIGH  |  Priority: P2  |  Baseline: 48%  |  Target: 70%`);
  console.log(`   Org Unit:     Float Pool — Inpatient  (FH-INDY)`);
  console.log(`   Owner:        ${director.firstName} ${director.lastName}  (Director)`);
  console.log(`   Assigned To:  ${manager.firstName} ${manager.lastName}  (Manager)`);
  console.log('');
  console.log(`   Action Plan:  ${plan.title}`);
  console.log(`   Milestones:   ${milestones.length}`);
  console.log(`   Tasks:        ${taskCount}  (spread across 4 phases)`);
  console.log('');
  console.log('   Phase breakdown:');
  console.log(`     Phase 1 — Root Cause Investigation   ${MILESTONE_1_TASKS.length} tasks  due in ~2 weeks`);
  console.log(`     Phase 2 — Protocol Redesign          ${MILESTONE_2_TASKS.length} tasks  due in ~5 weeks`);
  console.log(`     Phase 3 — Implementation & Training  ${MILESTONE_3_TASKS.length} tasks  due in ~8 weeks`);
  console.log(`     Phase 4 — Follow-up Survey           ${MILESTONE_4_TASKS.length} tasks  due in ~11 weeks`);
  console.log('');
}
