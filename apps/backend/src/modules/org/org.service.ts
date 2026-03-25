import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { OrgUnit } from './entities/org-unit.entity';

@Injectable()
export class OrgService {
  constructor(@InjectRepository(OrgUnit) private readonly repo: Repository<OrgUnit>) {}

  async getTree() {
    const roots = await this.repo.find({
      where: { parentId: IsNull() },
      relations: ['children', 'children.children', 'children.children.children'],
    });
    return roots;
  }

  findAll() {
    return this.repo.find({ relations: ['parent'] });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['parent', 'children'] });
  }

  create(data: Partial<OrgUnit>) {
    const unit = this.repo.create(data);
    return this.repo.save(unit);
  }

  update(id: string, data: Partial<OrgUnit>) {
    return this.repo.update(id, data);
  }

  hrSync(payload: any) {
    // TODO: parse HR payload and upsert org units
    return { message: 'HR sync triggered', received: payload };
  }
}
