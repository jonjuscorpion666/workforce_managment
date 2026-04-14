import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escalation } from './entities/escalation.entity';
import { EscalationsController } from './escalations.controller';
import { EscalationsService } from './escalations.service';
import { EscalationScheduler } from './escalation.scheduler';
import { TasksModule } from '../tasks/tasks.module';
import { AuditModule } from '../audit/audit.module';
import { Task } from '../tasks/entities/task.entity';
import { Issue } from '../issues/entities/issue.entity';
import { SpeakUpCase } from '../speakup/entities/speak-up-case.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Escalation, Task, Issue, SpeakUpCase, User]),
    TasksModule,
    AuditModule,
  ],
  controllers: [EscalationsController],
  providers: [EscalationsService, EscalationScheduler],
  exports: [EscalationsService],
})
export class EscalationsModule {}
