import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from '../tasks/tasks.service';
import { EscalationsService } from './escalations.service';

@Injectable()
export class EscalationScheduler {
  private readonly logger = new Logger(EscalationScheduler.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly escalationsService: EscalationsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkOverdueTasks() {
    this.logger.log('Running overdue task check...');
    const overdueTasks = await this.tasksService.getOverdue();

    for (const task of overdueTasks) {
      // Only escalate if not already escalated in this cycle
      if (!task.escalatedAt) {
        await this.escalationsService.trigger({
          entityType: 'task',
          entityId: task.id,
          reason: 'OVERDUE',
          level: (task.escalationLevel ?? 0) + 1,
          escalatedToId: task.ownerId || task.assignedToId,
        });

        await this.tasksService.update(task.id, {
          escalatedAt: new Date(),
          escalationLevel: (task.escalationLevel ?? 0) + 1,
        }, 'system');

        this.logger.warn(`Escalated overdue task: ${task.id}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkInactivity() {
    this.logger.log('Running inactivity check...');
    const inactivityThresholdDays = parseInt(process.env.INACTIVITY_THRESHOLD_DAYS || '3', 10);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - inactivityThresholdDays);

    // TODO: query tasks with updatedAt < threshold and status IN_PROGRESS
    this.logger.log(`Inactivity threshold: ${threshold.toISOString()}`);
  }
}
