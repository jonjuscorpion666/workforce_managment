import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ResponsesModule } from '../responses/responses.module';
import { IssuesModule } from '../issues/issues.module';
import { SurveysModule } from '../surveys/surveys.module';
import { Response } from '../responses/entities/response.entity';
import { Issue } from '../issues/entities/issue.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    ResponsesModule,
    IssuesModule,
    SurveysModule,
    TypeOrmModule.forFeature([Response, Issue, OrgUnit, Task, User]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
