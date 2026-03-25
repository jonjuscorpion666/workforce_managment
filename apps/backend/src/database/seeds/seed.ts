import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from monorepo root
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
import { KPI } from '../../modules/kpis/entities/kpi.entity';
import { AuditLog } from '../../modules/audit/entities/audit-log.entity';
import { Config } from '../../modules/admin/entities/config.entity';

import { seedRoles } from './roles.seed';
import { seedDemoUsers } from './demo-users.seed';
import { seedHospitals } from './hospitals.seed';
import { seedGovernance } from './governance.seed';
import { seedAdhocSurvey } from './adhoc-survey.seed';
import { seedFloatPoolIssue } from './float-pool-issue.seed';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true,
  entities: [
    User, Role, Permission, OrgUnit,
    Survey, Question, Response,
    Issue, IssueHistory, ActionPlan, ActionPlanMilestone,
    Task, TaskAttachment,
    Escalation,
    Meeting, MeetingNote,
    Announcement,
    SpeakUpCase,
    KPI,
    AuditLog,
    Config,
  ],
});

async function main() {
  console.log('\n🚀 Starting database seed...\n');
  await AppDataSource.initialize();
  await seedRoles(AppDataSource);
  await seedDemoUsers(AppDataSource);
  await seedHospitals(AppDataSource);
  await seedGovernance(AppDataSource);
  console.log('🌱 Seeding ad-hoc survey...');
  await seedAdhocSurvey(AppDataSource);
  await seedFloatPoolIssue(AppDataSource);
  await AppDataSource.destroy();
  console.log('🎉 Seed complete.\n');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
