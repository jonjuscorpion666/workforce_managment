import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { TaskComment } from './entities/task-comment.entity';
import { ActionPlanMilestone } from '../issues/entities/action-plan.entity';
import { User } from '../auth/entities/user.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly repo: Repository<Task>,
    @InjectRepository(TaskComment) private readonly commentRepo: Repository<TaskComment>,
    @InjectRepository(ActionPlanMilestone) private readonly milestoneRepo: Repository<ActionPlanMilestone>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  private async enrichWithMilestone(tasks: Task[]): Promise<any[]> {
    const ids = [...new Set(tasks.map((t) => t.milestoneId).filter(Boolean))] as string[];
    if (!ids.length) return tasks;
    const milestones = await this.milestoneRepo.find({ where: { id: In(ids) } });
    const map = new Map(milestones.map((m) => [m.id, m.title]));
    return tasks.map((t) => ({ ...t, milestoneName: t.milestoneId ? (map.get(t.milestoneId) ?? null) : null }));
  }

  async create(data: any, createdById: string) {
    const task = this.repo.create({ ...data, createdById });
    const saved = await this.repo.save(task) as unknown as Task;
    await this.auditService.log('tasks', saved.id, 'CREATE', createdById, null, saved, saved.title);
    return saved;
  }

  async findAll(query: any) {
    const qb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.subTasks', 'sub')
      .orderBy('t.createdAt', 'DESC');

    if (query.owner) qb.andWhere('t.ownerId = :owner', { owner: query.owner });
    if (query.assignedTo) qb.andWhere('t.assignedToId = :assignedTo', { assignedTo: query.assignedTo });
    if (query.issueId) qb.andWhere('t.issueId = :issueId', { issueId: query.issueId });
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.orgUnitId) qb.andWhere('t.orgUnitId = :orgUnitId', { orgUnitId: query.orgUnitId });

    const tasks = await qb.getMany();
    return this.enrichWithMilestone(tasks);
  }

  async findOne(id: string) {
    const task = await this.repo.findOne({
      where: { id },
      relations: ['subTasks', 'parentTask'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    const [enriched] = await this.enrichWithMilestone([task]);
    return enriched;
  }

  async update(id: string, data: any, updatedById: string) {
    const task = await this.findOne(id);
    const before = { ...task };
    if (data.status === TaskStatus.DONE) data.completedAt = new Date();
    Object.assign(task, data);
    const saved = await this.repo.save(task);
    await this.auditService.log('tasks', id, 'UPDATE', updatedById, before, saved, saved.title);
    return saved;
  }

  getOverdue() {
    return this.repo.find({
      where: {
        dueDate: LessThan(new Date()),
        status: TaskStatus.TODO,
      },
      order: { dueDate: 'ASC' },
    });
  }

  getSubtasks(parentTaskId: string) {
    return this.repo.find({ where: { parentTaskId } });
  }

  async getComments(taskId: string) {
    await this.findOne(taskId); // 404 if task doesn't exist
    const comments = await this.commentRepo.find({
      where: { taskId },
      order: { createdAt: 'ASC' },
    });
    const authorIds = [...new Set(comments.map((c) => c.authorId))];
    const authors = authorIds.length
      ? await this.userRepo.find({ where: { id: In(authorIds) } })
      : [];
    const authorMap = new Map(authors.map((u) => [u.id, u]));
    return comments.map((c) => {
      const u = authorMap.get(c.authorId);
      return {
        ...c,
        authorName: u ? `${u.firstName} ${u.lastName}` : 'Unknown',
        authorRole: (u as any)?.role?.name ?? null,
      };
    });
  }

  async addComment(taskId: string, content: string, authorId: string) {
    await this.findOne(taskId);
    const comment = await this.commentRepo.save(
      this.commentRepo.create({ taskId, authorId, content }),
    );
    const author = await this.userRepo.findOne({ where: { id: authorId } });
    return {
      ...comment,
      authorName: author ? `${author.firstName} ${author.lastName}` : 'Unknown',
      authorRole: (author as any)?.role?.name ?? null,
    };
  }

  async deleteComment(taskId: string, commentId: string, requesterId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId, taskId } });
    if (!comment) throw new NotFoundException(`Comment not found`);
    if (comment.authorId !== requesterId) throw new ForbiddenException(`Cannot delete another user's comment`);
    await this.commentRepo.remove(comment);
  }

  async delete(id: string) {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    // Remove comments and subtasks first (no DB-level cascades)
    await this.commentRepo.delete({ taskId: id });
    await this.repo.delete({ parentTaskId: id });
    await this.repo.delete(id);
  }

  async bulkSoftDelete(ids: string[]) {
    if (!ids?.length) return { deleted: 0 };
    await this.repo.softDelete(ids);
    return { deleted: ids.length };
  }
}
