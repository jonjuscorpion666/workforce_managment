import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly repo: Repository<Task>,
    private readonly auditService: AuditService,
  ) {}

  async create(data: any, createdById: string) {
    const task = this.repo.create({ ...data, createdById });
    const saved = await this.repo.save(task) as unknown as Task;
    await this.auditService.log('tasks', saved.id, 'CREATE', createdById, null, saved, saved.title);
    return saved;
  }

  findAll(query: any) {
    const qb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.subTasks', 'sub')
      .orderBy('t.createdAt', 'DESC');

    if (query.owner) qb.andWhere('t.ownerId = :owner', { owner: query.owner });
    if (query.assignedTo) qb.andWhere('t.assignedToId = :assignedTo', { assignedTo: query.assignedTo });
    if (query.issueId) qb.andWhere('t.issueId = :issueId', { issueId: query.issueId });
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.orgUnitId) qb.andWhere('t.orgUnitId = :orgUnitId', { orgUnitId: query.orgUnitId });

    return qb.getMany();
  }

  async findOne(id: string) {
    const task = await this.repo.findOne({
      where: { id },
      relations: ['subTasks', 'parentTask'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
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
}
