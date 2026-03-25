import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramCycle } from './entities/program-cycle.entity';
import { CycleStageStatus } from './entities/cycle-stage-status.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { Survey } from '../surveys/entities/survey.entity';
import { Response } from '../responses/entities/response.entity';
import { Issue } from '../issues/entities/issue.entity';
import { ActionPlan } from '../issues/entities/action-plan.entity';
import { Task } from '../tasks/entities/task.entity';
import { ProgramFlowController } from './program-flow.controller';
import { ProgramFlowService } from './program-flow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgramCycle,
      CycleStageStatus,
      OrgUnit,
      Survey,
      Response,
      Issue,
      ActionPlan,
      Task,
    ]),
  ],
  controllers: [ProgramFlowController],
  providers: [ProgramFlowService],
  exports: [ProgramFlowService],
})
export class ProgramFlowModule {}
