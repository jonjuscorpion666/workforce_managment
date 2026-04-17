import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBankItem } from './entities/question-bank-item.entity';

@Injectable()
export class QuestionBankService {
  constructor(
    @InjectRepository(QuestionBankItem)
    private readonly repo: Repository<QuestionBankItem>,
  ) {}

  findAll(query: { category?: string; framework?: string }) {
    const qb = this.repo.createQueryBuilder('q').orderBy('q.category').addOrderBy('q.createdAt');
    if (query.category)  qb.andWhere('q.category = :category',   { category: query.category });
    if (query.framework) qb.andWhere('q.framework = :framework', { framework: query.framework });
    return qb.getMany();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<QuestionBankItem>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<QuestionBankItem>) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Question not found');
    Object.assign(item, data);
    return this.repo.save(item);
  }

  async remove(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Question not found');
    await this.repo.remove(item);
    return { deleted: true };
  }
}
