import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { IssuesModule } from '../issues/issues.module';
import { TasksModule } from '../tasks/tasks.module';
import { SurveysModule } from '../surveys/surveys.module';
import { ResponsesModule } from '../responses/responses.module';

@Module({
  imports: [IssuesModule, TasksModule, SurveysModule, ResponsesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
