import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Escalation, EscalationStatus } from './entities/escalation.entity';
import { Task } from '../tasks/entities/task.entity';
import { Issue } from '../issues/entities/issue.entity';
import { SpeakUpCase } from '../speakup/entities/speak-up-case.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class EscalationsService {
  constructor(
    @InjectRepository(Escalation) private readonly repo: Repository<Escalation>,
    @InjectRepository(Task)       private readonly taskRepo: Repository<Task>,
    @InjectRepository(Issue)      private readonly issueRepo: Repository<Issue>,
    @InjectRepository(SpeakUpCase) private readonly caseRepo: Repository<SpeakUpCase>,
    @InjectRepository(User)       private readonly userRepo: Repository<User>,
  ) {}

  async trigger(data: {
    entityType: string;
    entityId: string;
    reason: string;
    level?: number;
    escalatedToId: string;
    escalatedById?: string;
  }) {
    const esc = this.repo.create({
      ...data,
      level: data.level ?? 1,
      status: EscalationStatus.PENDING,
    });
    return this.repo.save(esc);
  }

  async findAll(filters?: {
    status?: string;
    reason?: string;
    entityType?: string;
  }): Promise<any[]> {
    const qb = this.repo.createQueryBuilder('e').orderBy('e.createdAt', 'DESC');

    if (filters?.status)     qb.andWhere('e.status = :status',         { status: filters.status });
    if (filters?.reason)     qb.andWhere('e.reason = :reason',         { reason: filters.reason });
    if (filters?.entityType) qb.andWhere('e.entityType = :entityType', { entityType: filters.entityType });

    const escalations = await qb.getMany();
    return this.enrich(escalations);
  }

  async findOne(id: string): Promise<any> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Escalation not found');
    const [enriched] = await this.enrich([e]);
    return enriched;
  }

  async acknowledge(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Escalation not found');
    return this.repo.save({ ...e, status: EscalationStatus.ACKNOWLEDGED, acknowledgedAt: new Date() });
  }

  async resolve(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Escalation not found');
    return this.repo.save({ ...e, status: EscalationStatus.RESOLVED, resolvedAt: new Date() });
  }

  async reassign(id: string, data: { escalatedToId: string; level?: number }) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Escalation not found');
    const updates: Partial<Escalation> = { escalatedToId: data.escalatedToId };
    if (data.level !== undefined) updates.level = data.level;
    return this.repo.save({ ...e, ...updates });
  }

  // ── Enrichment ─────────────────────────────────────────────────────────────

  private async enrich(escalations: Escalation[]): Promise<any[]> {
    if (!escalations.length) return [];

    // Collect IDs by entity type
    const taskIds  = escalations.filter((e) => e.entityType === 'task').map((e) => e.entityId);
    const issueIds = escalations.filter((e) => e.entityType === 'issue').map((e) => e.entityId);
    const caseIds  = escalations.filter((e) => e.entityType === 'case').map((e) => e.entityId);

    // Collect user IDs (escalatedTo + escalatedBy)
    const userIds = [
      ...escalations.map((e) => e.escalatedToId),
      ...escalations.map((e) => e.escalatedById).filter(Boolean),
    ].filter((v, i, a) => v && a.indexOf(v) === i) as string[];

    // Batch fetch
    const [tasks, issues, cases, users] = await Promise.all([
      taskIds.length  ? this.taskRepo.find({ where: { id: In(taskIds) }, select: ['id', 'title', 'issueId'] as any }) : [],
      issueIds.length ? this.issueRepo.find({ where: { id: In(issueIds) }, select: ['id', 'title'] as any }) : [],
      caseIds.length  ? this.caseRepo.find({ where: { id: In(caseIds) }, select: ['id', 'caseNumber', 'category', 'description'] as any }) : [],
      userIds.length  ? this.userRepo.find({ where: { id: In(userIds) }, select: ['id', 'firstName', 'lastName', 'jobTitle'] as any }) : [],
    ]);

    const taskMap  = new Map(tasks.map((t)  => [t.id, t] as [string, typeof t]));
    const issueMap = new Map(issues.map((i) => [i.id, i] as [string, typeof i]));
    const caseMap  = new Map(cases.map((c)  => [c.id, c] as [string, typeof c]));
    const userMap  = new Map(users.map((u)  => [u.id, u] as [string, typeof u]));

    return escalations.map((e) => {
      let entityTitle = '';
      let entityLink  = '';

      if (e.entityType === 'task') {
        const task = taskMap.get(e.entityId);
        entityTitle = task?.title ?? `Task ${e.entityId.slice(0, 8)}`;
        // Link to the issue the task belongs to, or fallback to issues list
        entityLink = task?.issueId ? `/issues/${task.issueId}` : '/issues';
      } else if (e.entityType === 'issue') {
        const issue = issueMap.get(e.entityId);
        entityTitle = (issue as any)?.title ?? `Issue ${e.entityId.slice(0, 8)}`;
        entityLink  = `/issues/${e.entityId}`;
      } else if (e.entityType === 'case') {
        const c = caseMap.get(e.entityId);
        entityTitle = c
          ? `Case #${(c as any).caseNumber} — ${(c as any).category}`
          : `Case ${e.entityId.slice(0, 8)}`;
        entityLink  = `/speak-up/cases/${e.entityId}`;
      }

      const escalatedTo = userMap.get(e.escalatedToId);
      const escalatedBy = e.escalatedById ? userMap.get(e.escalatedById) : null;

      return {
        ...e,
        entityTitle,
        entityLink,
        escalatedToName: escalatedTo
          ? `${escalatedTo.firstName} ${escalatedTo.lastName}`
          : e.escalatedToId,
        escalatedToJobTitle: (escalatedTo as any)?.jobTitle ?? null,
        escalatedByName: escalatedBy
          ? `${escalatedBy.firstName} ${escalatedBy.lastName}`
          : null,
      };
    });
  }
}
