import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PatientFeedbackService } from './patient-feedback.service';

@Injectable()
export class PatientFeedbackScheduler {
  private readonly logger = new Logger(PatientFeedbackScheduler.name);

  constructor(private readonly service: PatientFeedbackService) {}

  /** Escalate feedback tickets that have blown their SLA and not yet escalated. */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async escalateOverdue() {
    const n = await this.service.escalateOverdue();
    if (n > 0) this.logger.warn(`Auto-escalated ${n} overdue feedback ticket(s)`);
  }

  /** Retention: de-identify feedback older than the retention window. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deidentifyOldFeedback() {
    const n = await this.service.deidentifyOldFeedback();
    if (n > 0) this.logger.log(`De-identified ${n} feedback record(s) past retention window`);
  }
}
