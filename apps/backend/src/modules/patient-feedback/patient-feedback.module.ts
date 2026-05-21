import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackLocation } from './entities/feedback-location.entity';
import { FeedbackUnit } from './entities/feedback-unit.entity';
import { PatientFeedback } from './entities/patient-feedback.entity';
import { FeedbackTicket } from './entities/feedback-ticket.entity';
import { User } from '../auth/entities/user.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { EscalationsModule } from '../escalations/escalations.module';
import { AuditModule } from '../audit/audit.module';
import { PatientFeedbackController } from './patient-feedback.controller';
import { PatientFeedbackService } from './patient-feedback.service';
import { PatientFeedbackScheduler } from './patient-feedback.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedbackLocation, FeedbackUnit, PatientFeedback, FeedbackTicket, User, OrgUnit]),
    EscalationsModule,
    AuditModule,
  ],
  controllers: [PatientFeedbackController],
  providers: [PatientFeedbackService, PatientFeedbackScheduler],
  exports: [PatientFeedbackService, TypeOrmModule],
})
export class PatientFeedbackModule {}
