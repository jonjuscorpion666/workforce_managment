/**
 * One-time fix: update Float Pool milestone titles and add Phase 4 tasks.
 * Run with: npx ts-node -r tsconfig-paths/register src/database/seeds/fix-float-pool-milestones.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

import { User } from '../../modules/auth/entities/user.entity';
import { Role } from '../../modules/auth/entities/role.entity';
import { Permission } from '../../modules/auth/entities/permission.entity';
import { OrgUnit } from '../../modules/org/entities/org-unit.entity';
import { Survey } from '../../modules/surveys/entities/survey.entity';
import { Question } from '../../modules/surveys/entities/question.entity';
import { Response } from '../../modules/responses/entities/response.entity';
import { Issue } from '../../modules/issues/entities/issue.entity';
import { IssueHistory } from '../../modules/issues/entities/issue-history.entity';
import { ActionPlan, ActionPlanMilestone, MilestoneStatus } from '../../modules/issues/entities/action-plan.entity';
import { Task, TaskStatus, TaskPriority } from '../../modules/tasks/entities/task.entity';
import { TaskAttachment } from '../../modules/tasks/entities/task-attachment.entity';
import { Escalation } from '../../modules/escalations/entities/escalation.entity';
import { Meeting } from '../../modules/meetings/entities/meeting.entity';
import { MeetingNote } from '../../modules/meetings/entities/meeting-note.entity';
import { Announcement } from '../../modules/announcements/entities/announcement.entity';
import { SpeakUpCase } from '../../modules/speakup/entities/speak-up-case.entity';
import { SpeakUpActivity } from '../../modules/speakup/entities/speak-up-activity.entity';
import { KPI } from '../../modules/kpis/entities/kpi.entity';
import { AuditLog } from '../../modules/audit/entities/audit-log.entity';
import { Config } from '../../modules/admin/entities/config.entity';

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const PHASE_TITLES = [
  'Phase 1 — Root Cause Investigation',
  'Phase 2 — Protocol Redesign',
  'Phase 3 — Implementation & Training',
  'Phase 4 — Follow-up Survey & Validation',
];

const PHASE_NOTES = [
  'Conduct interviews, review assignment data, analyse Speak Up submissions, and debrief with the float pool coordinator.',
  'Draft and gain Director sign-off on the revised orientation checklist, scheduling fairness criteria, and updated unit handoff guides.',
  'Roll out protocol to all charge nurses, brief float pool staff, publish the resource guide, and establish bi-weekly check-ins.',
  'Deploy pulse survey, review scores against 70% target, document lessons learned, and close out action plan.',
];

const PHASE_DUE_DAYS = [14, 35, 56, 77];

const PHASE_4_TASKS = [
  {
    title: 'Deploy follow-up pulse survey to float pool nurses',
    description: 'Create a targeted pulse survey in the system scoped to the Float Pool unit. Include at minimum the Overall Experience dimension questions. Set a 2-week response window.',
    priority: TaskPriority.HIGH,
    assigneeRole: 'director' as const,
    dueDaysFromNow: 68,
  },
  {
    title: 'Review pulse survey scores against the 70% target threshold',
    description: 'Once the survey closes, review the Overall Experience dimension scores for the Float Pool unit. Compare against the 70% target threshold. Document scores in the issue and trigger the validation workflow if target is met.',
    priority: TaskPriority.HIGH,
    assigneeRole: 'director' as const,
    dueDaysFromNow: 75,
  },
  {
    title: 'Document lessons learned and close out action plan',
    description: 'Write a brief lessons-learned summary covering: what worked, what did not, what should be standardised across other units. Attach to the action plan notes before marking it complete.',
    priority: TaskPriority.LOW,
    assigneeRole: 'manager' as const,
    dueDaysFromNow: 77,
  },
];

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: [
    User, Role, Permission, OrgUnit,
    Survey, Question, Response,
    Issue, IssueHistory, ActionPlan, ActionPlanMilestone,
    Task, TaskAttachment,
    Escalation,
    Meeting, MeetingNote,
    Announcement,
    SpeakUpCase, SpeakUpActivity,
    KPI,
    AuditLog,
    Config,
  ],
});

async function main() {
  await AppDataSource.initialize();

  const issueRepo     = AppDataSource.getRepository(Issue);
  const planRepo      = AppDataSource.getRepository(ActionPlan);
  const milestoneRepo = AppDataSource.getRepository(ActionPlanMilestone);
  const taskRepo      = AppDataSource.getRepository(Task);
  const userRepo      = AppDataSource.getRepository(User);
  const orgRepo       = AppDataSource.getRepository(OrgUnit);

  const issue = await issueRepo.findOne({ where: { title: 'Low Overall Experience — Float Pool' } });
  if (!issue) { console.error('❌ Float Pool issue not found'); process.exit(1); }

  const plan = await planRepo.findOne({ where: { issueId: issue.id } });
  if (!plan) { console.error('❌ Action plan not found'); process.exit(1); }

  const director = await userRepo.findOne({ where: { email: 'director@hospital.com' } });
  const manager  = await userRepo.findOne({ where: { email: 'manager@hospital.com' } });
  const floatUnit = await orgRepo.findOne({ where: { code: 'FH-INDY-FLOAT' } });
  if (!director || !manager || !floatUnit) {
    console.error('❌ Director, manager, or Float Pool unit not found');
    process.exit(1);
  }

  console.log('\n🔧 Fixing Float Pool milestones...\n');

  // ── Update existing milestone titles ──────────────────────────────────────
  const milestones = await milestoneRepo.find({
    where: { actionPlanId: plan.id },
    order: { dueDate: 'ASC' },
  });

  for (let i = 0; i < milestones.length && i < 3; i++) {
    const old = milestones[i].title;
    milestones[i].title   = PHASE_TITLES[i];
    milestones[i].notes   = PHASE_NOTES[i];
    milestones[i].dueDate = daysFromNow(PHASE_DUE_DAYS[i]);
    await milestoneRepo.save(milestones[i]);
    console.log(`   ✓ Renamed: "${old}" → "${PHASE_TITLES[i]}"`);
  }

  // ── Create Phase 4 milestone ───────────────────────────────────────────────
  const phase4 = await milestoneRepo.save(milestoneRepo.create({
    actionPlanId: plan.id,
    title:   PHASE_TITLES[3],
    notes:   PHASE_NOTES[3],
    dueDate: daysFromNow(PHASE_DUE_DAYS[3]),
    status:  MilestoneStatus.PENDING,
  }));
  console.log(`   ✓ Created: "${phase4.title}"`);

  // ── Create Phase 4 tasks ───────────────────────────────────────────────────
  console.log('\n   Creating Phase 4 tasks...');
  for (const def of PHASE_4_TASKS) {
    const assigneeId = def.assigneeRole === 'manager' ? manager.id : director.id;
    const t = await taskRepo.save(taskRepo.create({
      title:        def.title,
      description:  def.description,
      status:       TaskStatus.TODO,
      priority:     def.priority,
      issueId:      issue.id,
      ownerId:      manager.id,
      assignedToId: assigneeId,
      orgUnitId:    floatUnit.id,
      dueDate:      daysFromNow(def.dueDaysFromNow),
      createdById:  director.id,
    }));
    console.log(`   ✓ Task: ${t.title}`);
  }

  const totalTasks = await taskRepo.count({ where: { issueId: issue.id } });
  console.log(`\n✅ Done. Float Pool issue now has 4 milestones and ${totalTasks} tasks total.\n`);

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Fix failed:', err);
  process.exit(1);
});
