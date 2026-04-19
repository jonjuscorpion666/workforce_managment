import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

import { QuestionBankItem } from '../../modules/question-bank/entities/question-bank-item.entity';
import { seedQuestionBank } from './question-bank.seed';

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true,
  entities: [QuestionBankItem],
});

async function main() {
  console.log('\n🚀 Running question bank seed...\n');
  await ds.initialize();
  await seedQuestionBank(ds);
  await ds.destroy();
  console.log('\n🎉 Done.\n');
}

main().catch((err) => { console.error('❌ Failed:', err); process.exit(1); });
