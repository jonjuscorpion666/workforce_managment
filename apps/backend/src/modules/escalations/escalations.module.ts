import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escalation } from './entities/escalation.entity';
import { EscalationsController } from './escalations.controller';
import { EscalationsService } from './escalations.service';
import { EscalationScheduler } from './escalation.scheduler';
import { TasksModule } from '../tasks/tasks.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Escalation]), TasksModule, AuditModule],
  controllers: [EscalationsController],
  providers: [EscalationsService, EscalationScheduler],
  exports: [EscalationsService],
})
export class EscalationsModule {}
