import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Issue, IssueStatus } from '../issues/entities/issue.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { Survey, SurveyStatus } from '../surveys/entities/survey.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Issue) private readonly issueRepo: Repository<Issue>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Survey) private readonly surveyRepo: Repository<Survey>,
  ) {}

  async getSummary(query: any) {
    const [openIssues, activeSurveys, overdueTasks, blockedTasks] = await Promise.all([
      this.issueRepo.count({ where: { status: IssueStatus.OPEN } }),
      this.surveyRepo.count({ where: { status: SurveyStatus.ACTIVE } }),
      this.taskRepo.count({ where: { dueDate: LessThan(new Date()), status: TaskStatus.TODO } }),
      this.taskRepo.count({ where: { status: TaskStatus.BLOCKED } }),
    ]);

    return {
      role: query.role,
      orgUnitId: query.orgUnitId,
      metrics: {
        openIssues,
        activeSurveys,
        overdueTasks,
        blockedTasks,
      },
    };
  }

  async drilldown(orgUnitId: string) {
    const [issues, tasks] = await Promise.all([
      this.issueRepo.find({ where: { orgUnitId }, relations: ['orgUnit'] }),
      this.taskRepo.find({ where: { orgUnitId } }),
    ]);
    return { orgUnitId, issues, tasks };
  }

  async getStuckItems() {
    const [blocked, overdue] = await Promise.all([
      this.issueRepo.find({ where: { status: IssueStatus.BLOCKED } }),
      this.taskRepo.find({ where: { dueDate: LessThan(new Date()), status: TaskStatus.TODO } }),
    ]);
    return { blockedIssues: blocked, overdueTasks: overdue };
  }

  async getRiskReport() {
    const critical = await this.issueRepo.find({
      where: { severity: 'CRITICAL' as any, status: IssueStatus.OPEN },
    });
    return { criticalIssues: critical, riskScore: critical.length * 10 };
  }
}
