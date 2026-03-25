import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KPI } from './entities/kpi.entity';

@Injectable()
export class KpisService {
  constructor(@InjectRepository(KPI) private readonly repo: Repository<KPI>) {}
  create(data: any) { return this.repo.save(this.repo.create(data)); }
  findAll(q: any) {
    const qb = this.repo.createQueryBuilder('k').orderBy('k.recordedAt', 'DESC');
    if (q.orgUnitId) qb.where('k.orgUnitId = :orgUnitId', { orgUnitId: q.orgUnitId });
    if (q.dimension) qb.andWhere('k.dimension = :dimension', { dimension: q.dimension });
    return qb.getMany();
  }
  findOne(id: string) { return this.repo.findOne({ where: { id } }); }
  getTrends(q: any) {
    return this.repo.createQueryBuilder('k')
      .select(['k.dimension', 'k.period', 'AVG(k.currentValue) as avg'])
      .where(q.orgUnitId ? 'k.orgUnitId = :orgUnitId' : '1=1', { orgUnitId: q.orgUnitId })
      .groupBy('k.dimension, k.period')
      .orderBy('k.period', 'ASC')
      .getRawMany();
  }
}
