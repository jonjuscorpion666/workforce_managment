import { DataSource } from 'typeorm';
import { OrgUnit, OrgLevel } from '../../modules/org/entities/org-unit.entity';
import { Issue } from '../../modules/issues/entities/issue.entity';
import { Task, TaskStatus, TaskPriority } from '../../modules/tasks/entities/task.entity';
import { User } from '../../modules/auth/entities/user.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Task definitions ─────────────────────────────────────────────────────────
// Tasks are attached directly to the issue. The `phase` label is kept only for
// human-readable grouping in descriptions/logs — there is no milestone entity.

interface TaskDef {
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeRole: 'manager' | 'director';
  dueDaysFromNow: number;
}

const PHASE_1_TASKS: TaskDef[] = [
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

const PHASE_2_TASKS: TaskDef[] = [
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

const PHASE_3_TASKS: TaskDef[] = [
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

const PHASE_4_TASKS: TaskDef[] = [
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
    title: 'Document lessons learned and close out the issue',
    description: 'Write a brief lessons-learned summary covering: what worked, what did not, what should be standardised across other units. Attach to the issue notes before resolving it.',
    priority: TaskPriority.LOW,
    assigneeRole: 'manager',
    dueDaysFromNow: 77,
  },
];

const ALL_PHASES: { label: string; tasks: TaskDef[] }[] = [
  { label: 'Phase 1 — Root Cause Investigation', tasks: PHASE_1_TASKS },
  { label: 'Phase 2 — Protocol Redesign', tasks: PHASE_2_TASKS },
  { label: 'Phase 3 — Implementation & Training', tasks: PHASE_3_TASKS },
  { label: 'Phase 4 — Follow-up Survey & Validation', tasks: PHASE_4_TASKS },
];

// Planning context folded onto the issue (formerly the ActionPlan fields).
const OBJECTIVE =
  'Raise the Overall Experience dimension score for Float Pool nurses from 48% to at least 70% within 90 days, by improving orientation consistency, scheduling fairness, and management communication.';
const ROOT_CAUSE_SUMMARY =
  'Root cause analysis identified three primary drivers: (1) No standardised orientation checklist when float nurses arrive at a new unit — charge nurses apply inconsistent welcome practices. ' +
  '(2) Scheduling is reactive, often placing nurses in units they have not worked in before with less than 12 hours notice. ' +
  '(3) Float pool nurses feel invisible — no regular touchpoint with management and no structured way to raise concerns short of a formal Speak Up.';
const SUCCESS_CRITERIA =
  'Overall Experience dimension score ≥ 70% in the follow-up pulse survey. Zero float pool nurses scoring the experience below 3/5 on the orientation question. ' +
  'Bi-weekly check-ins established and maintained for at least 6 weeks post-rollout.';

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedFloatPoolIssue(dataSource: DataSource) {
  const orgRepo   = dataSource.getRepository(OrgUnit);
  const issueRepo = dataSource.getRepository(Issue);
  const taskRepo  = dataSource.getRepository(Task);
  const userRepo  = dataSource.getRepository(User);

  console.log('\n🌱 Seeding: Low Overall Experience — Float Pool...');

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

  // ── Find or create Float Pool department + unit ───────────────────────────
  let floatPoolDept = await orgRepo.findOne({ where: { code: 'FH-INDY-FLOAT-DEPT' } });
  if (!floatPoolDept) {
    floatPoolDept = await orgRepo.save(orgRepo.create({
      name: 'Float Pool', code: 'FH-INDY-FLOAT-DEPT',
      level: OrgLevel.DEPARTMENT, location: 'Indianapolis, IN',
      timezone: 'America/Indiana/Indianapolis',
      parent: indyHospital, parentId: indyHospital.id, isActive: true,
    }));
    console.log('   ✓ Created department: Float Pool');
  }

  let floatPoolUnit = await orgRepo.findOne({ where: { code: 'FH-INDY-FLOAT' } });
  if (!floatPoolUnit) {
    floatPoolUnit = await orgRepo.save(orgRepo.create({
      name: 'Float Pool — Inpatient', code: 'FH-INDY-FLOAT',
      level: OrgLevel.UNIT, location: 'Indianapolis, IN',
      timezone: 'America/Indiana/Indianapolis',
      parent: floatPoolDept, parentId: floatPoolDept.id, isActive: true,
    }));
    console.log('   ✓ Created unit: Float Pool — Inpatient');
  }

  // ── Find or create the Issue (idempotent) ─────────────────────────────────
  let issue = await issueRepo.findOne({ where: { title: 'Low Overall Experience — Float Pool' } });
  if (!issue) {
    issue = await issueRepo.save(issueRepo.create({
      title: 'Low Overall Experience — Float Pool',
      description:
        'Float pool nurses at Franciscan Health Indianapolis scored 48% on the Overall Experience dimension in the most recent pulse survey — well below the 70% threshold. ' +
        'Key pain points identified: inconsistent unit orientation, unpredictable scheduling, and lack of a structured handoff process when arriving at an unfamiliar unit. ' +
        'This is a recurring concern across two survey cycles.',
      objective:         OBJECTIVE,
      rootCauseSummary:  ROOT_CAUSE_SUMMARY,
      successCriteria:   SUCCESS_CRITERIA,
      status:       'IN_PROGRESS'  as any,
      severity:     'HIGH'         as any,
      priority:     'P2'           as any,
      source:       'SURVEY_AUTO'  as any,
      category:     'Staff Experience',
      subcategory:  'Overall Experience',
      issueLevel:   'UNIT',
      hospitalId:   indyHospital.id,
      ownerRole:    'Director',
      ownerId:      director.id,
      assignedToId: manager.id,
      orgUnitId:    floatPoolUnit!.id,
      baselineScore:    48,
      targetScore:      70,
      closureThreshold: 70,
      dueDate:          daysFromNow(90),
      statusNote:       'Remediation tasks assigned across four phases.',
      createdById:      director.id,
    } as any)) as unknown as Issue;
    console.log(`   ✓ Created issue: ${issue.title} [${issue.id}]`);
  } else {
    console.log(`   → Issue exists: ${issue.title}`);
  }

  // ── Guard: skip task creation if already seeded ───────────────────────────
  const existingTaskCount = await taskRepo.count({ where: { issueId: issue.id } });
  if (existingTaskCount > 0) {
    console.log(`   → Already has ${existingTaskCount} tasks, skipping task creation.\n`);
    return;
  }

  // ── Create Tasks (attached directly to the issue) ─────────────────────────
  let taskCount = 0;
  for (const phase of ALL_PHASES) {
    for (const def of phase.tasks) {
      const assigneeId = def.assigneeRole === 'manager' ? manager.id : director.id;
      await taskRepo.save(taskRepo.create({
        title:        def.title,
        description:  def.description,
        status:       TaskStatus.TODO,
        priority:     def.priority,
        issueId:      issue.id,
        ownerId:      manager.id,
        assignedToId: assigneeId,
        orgUnitId:    floatPoolUnit!.id,
        hospitalId:   indyHospital.id,
        dueDate:      daysFromNow(def.dueDaysFromNow),
        createdById:  director.id,
      }));
      taskCount++;
    }
    console.log(`   ✓ Tasks created for: ${phase.label}`);
  }

  console.log('\n✅ Float Pool issue seeded successfully');
  console.log(`   Issue:        ${issue.title}`);
  console.log(`   Org Unit:     Float Pool — Inpatient  (FH-INDY)`);
  console.log(`   Owner:        ${director.firstName} ${director.lastName}  (Director)`);
  console.log(`   Tasks:        ${taskCount}  (across 4 phases, attached to the issue)\n`);
}
