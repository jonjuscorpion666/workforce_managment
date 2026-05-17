import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackLocation } from './entities/feedback-location.entity';
import { PatientFeedback } from './entities/patient-feedback.entity';
import { FeedbackTicket } from './entities/feedback-ticket.entity';
import { User } from '../auth/entities/user.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { PatientFeedbackController } from './patient-feedback.controller';
import { PatientFeedbackService } from './patient-feedback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedbackLocation, PatientFeedback, FeedbackTicket, User, OrgUnit]),
  ],
  controllers: [PatientFeedbackController],
  providers: [PatientFeedbackService],
  exports: [PatientFeedbackService, TypeOrmModule],
})
export class PatientFeedbackModule {}
