import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escalation, EscalationStatus } from './entities/escalation.entity';

@Injectable()
export class EscalationsService {
  constructor(
    @InjectRepository(Escalation) private readonly repo: Repository<Escalation>,
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

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  acknowledge(id: string) {
    return this.repo.update(id, {
      status: EscalationStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
    });
  }
}
