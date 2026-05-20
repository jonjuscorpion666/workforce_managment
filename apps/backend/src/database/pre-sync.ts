import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// One-shot backfills for columns the entity declares NOT NULL but where
// legacy rows in production still hold NULLs. Without this, TypeORM's
// `synchronize: true` aborts boot with `column "X" contains null values`.
// Add a new entry every time the schema tightens an existing column.
const backfills: { table: string; column: string; value: string; note: string }[] = [
  { table: 'feedback_locations', column: 'room', value: 'UNKNOWN', note: 'f723604 patient-feedback Hospital+Room refactor' },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('pre-sync: DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const b of backfills) {
      // Skip silently if the column doesn't exist yet (fresh DB before first sync).
      const exists = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
        [b.table, b.column],
      );
      if (exists.rowCount === 0) continue;
      const res = await client.query(
        `UPDATE "${b.table}" SET "${b.column}" = $1 WHERE "${b.column}" IS NULL`,
        [b.value],
      );
      if (res.rowCount && res.rowCount > 0) {
        console.log(`pre-sync: ${b.table}.${b.column} — backfilled ${res.rowCount} NULL row(s) [${b.note}]`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('pre-sync failed:', err);
  process.exit(1);
});
