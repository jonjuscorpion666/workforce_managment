import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from './entities/issue.entity';
import { IssueHistory } from './entities/issue-history.entity';
import { ActionPlan, ActionPlanMilestone } from './entities/action-plan.entity';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { AuditModule } from '../audit/audit.module';
import { Response } from '../responses/entities/response.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { User } from '../auth/entities/user.entity';
import { Config } from '../admin/entities/config.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskComment } from '../tasks/entities/task-comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Issue, IssueHistory, ActionPlan, ActionPlanMilestone, Response, OrgUnit, User, Config, Task, TaskComment]),
    AuditModule,
  ],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService, TypeOrmModule],
})
export class IssuesModule {}
