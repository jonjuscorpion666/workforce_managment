/**
 * Backfill: assign milestoneId to the 15 Float Pool tasks.
 * Run with: npx ts-node -r tsconfig-paths/register src/database/seeds/backfill-milestone-ids.ts
 */
import 'reflect-metadata';
import { DataSource, In } from 'typeorm';
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
import { ActionPlan, ActionPlanMilestone } from '../../modules/issues/entities/action-plan.entity';
import { Task } from '../../modules/tasks/entities/task.entity';
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

// Map task title → phase index (0-based)
const TASK_PHASE: Record<string, number> = {
  // Phase 1
  'Conduct 1:1 interviews with float pool nurses': 0,
  'Review float pool assignment history (last 90 days)': 0,
  'Analyse Speak Up submissions related to float pool': 0,
  'Survey float pool coordinator on current process gaps': 0,
  // Phase 2
  'Draft revised float pool orientation checklist': 1,
  'Update unit handoff guides for float nurses': 1,
  'Define scheduling fairness criteria for float assignments': 1,
  'Present revised protocol to Director of Nursing for review': 1,
  // Phase 3
  'Roll out orientation checklist to all unit charge nurses': 2,
  'Brief float pool staff on updated protocols': 2,
  'Publish float pool resource guide for nurses': 2,
  'Set up bi-weekly float pool check-ins with manager': 2,
  // Phase 4
  'Deploy follow-up pulse survey to float pool nurses': 3,
  'Review pulse survey scores against the 70% target threshold': 3,
  'Document lessons learned and close out action plan': 3,
};

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true, // creates milestoneId column if it doesn't exist yet
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

  const issue = await issueRepo.findOne({ where: { title: 'Low Overall Experience — Float Pool' } });
  if (!issue) { console.error('❌ Float Pool issue not found'); process.exit(1); }

  const plan = await planRepo.findOne({ where: { issueId: issue.id } });
  if (!plan) { console.error('❌ Action plan not found'); process.exit(1); }

  const milestones = await milestoneRepo.find({
    where: { actionPlanId: plan.id },
    order: { dueDate: 'ASC' },
  });
  if (milestones.length < 4) {
    console.error(`❌ Expected 4 milestones, found ${milestones.length}. Run fix-float-pool-milestones first.`);
    process.exit(1);
  }

  const tasks = await taskRepo.find({ where: { issueId: issue.id } });
  console.log(`\n🔧 Backfilling milestoneId on ${tasks.length} Float Pool tasks...\n`);

  let updated = 0;
  let skipped = 0;

  for (const task of tasks) {
    const phaseIndex = TASK_PHASE[task.title];
    if (phaseIndex === undefined) {
      console.log(`   ⚠ Unknown task title, skipping: "${task.title}"`);
      skipped++;
      continue;
    }
    const milestone = milestones[phaseIndex];
    if (task.milestoneId === milestone.id) {
      console.log(`   → Already set: "${task.title.substring(0, 50)}"`);
      skipped++;
      continue;
    }
    task.milestoneId = milestone.id;
    await taskRepo.save(task);
    console.log(`   ✓ [Phase ${phaseIndex + 1}] ${task.title.substring(0, 55)}`);
    updated++;
  }

  console.log(`\n✅ Done. Updated: ${updated}  Already correct: ${skipped}\n`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
