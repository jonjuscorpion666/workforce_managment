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

async function columnExists(client: Client, table: string, column: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, column],
  );
  return (r.rowCount ?? 0) > 0;
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name=$1`,
    [table],
  );
  return (r.rowCount ?? 0) > 0;
}

async function runNotNullBackfills(client: Client) {
  for (const b of backfills) {
    if (!(await columnExists(client, b.table, b.column))) continue;
    const res = await client.query(
      `UPDATE "${b.table}" SET "${b.column}" = $1 WHERE "${b.column}" IS NULL`,
      [b.value],
    );
    if (res.rowCount && res.rowCount > 0) {
      console.log(`pre-sync: ${b.table}.${b.column} — backfilled ${res.rowCount} NULL row(s) [${b.note}]`);
    }
  }
}

// One-time migration: action plans are being removed in favour of tasks
// attached directly to issues. Before `synchronize` drops action_plans /
// action_plan_milestones, fold their planning context onto the issue and
// convert milestones (and plan-level planned actions) into tasks. This runs
// before any TypeORM sync, is idempotent via tasks.milestoneId, and is a
// no-op once the source tables are gone.
async function migrateActionPlansToTasks(client: Client) {
  if (!(await tableExists(client, 'action_plans'))) return;

  // 1. Ensure the new Issue planning columns exist so the fold can write to
  //    them (synchronize will treat them as already-present no-ops).
  await client.query(`ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "objective" text`);
  await client.query(`ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "rootCauseSummary" text`);
  await client.query(`ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "successCriteria" text`);

  // 2. Fold action-plan planning context onto each issue. When an issue has
  //    multiple plans, take the most recent non-null value per field so no
  //    field is lost just because the newest plan left it blank.
  const fold = await client.query(`
    UPDATE "issues" i SET
      "objective"        = COALESCE(i."objective",        agg."objective"),
      "rootCauseSummary" = COALESCE(i."rootCauseSummary", agg."rootCauseSummary"),
      "successCriteria"  = COALESCE(i."successCriteria",  agg."successCriteria")
    FROM (
      SELECT "issueId",
        (array_remove(array_agg("objective"        ORDER BY "createdAt" DESC), NULL))[1] AS "objective",
        (array_remove(array_agg("rootCauseSummary" ORDER BY "createdAt" DESC), NULL))[1] AS "rootCauseSummary",
        (array_remove(array_agg("successCriteria"  ORDER BY "createdAt" DESC), NULL))[1] AS "successCriteria"
      FROM "action_plans"
      GROUP BY "issueId"
    ) agg
    WHERE i.id = agg."issueId"
      AND (i."objective" IS NULL OR i."rootCauseSummary" IS NULL OR i."successCriteria" IS NULL)
  `);
  if (fold.rowCount) console.log(`pre-sync: folded planning fields onto ${fold.rowCount} issue(s)`);

  // 3. Keep tasks.milestoneId available as an idempotency key during migration
  //    (synchronize drops it afterwards since the entity no longer declares it).
  await client.query(`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "milestoneId" varchar`);

  // 4. Convert each milestone into a task on the parent issue.
  if (await tableExists(client, 'action_plan_milestones')) {
    const m = await client.query(`
      INSERT INTO "tasks"
        (title, "issueId", "dueDate", "completedAt", status,
         "assignedToId", "ownerId", "orgUnitId", "hospitalId", "createdById", "milestoneId")
      SELECT
        m.title,
        ap."issueId",
        m."dueDate",
        m."completedAt",
        (CASE m.status WHEN 'COMPLETED' THEN 'DONE' WHEN 'OVERDUE' THEN 'IN_PROGRESS' ELSE 'TODO' END)::"tasks_status_enum",
        ap."ownerId",
        ap."ownerId",
        i."orgUnitId"::text,
        i."hospitalId",
        ap."createdById",
        m.id::text
      FROM "action_plan_milestones" m
      JOIN "action_plans" ap ON ap.id = m."actionPlanId"
      JOIN "issues" i        ON i.id = ap."issueId"
      WHERE NOT EXISTS (SELECT 1 FROM "tasks" t WHERE t."milestoneId" = m.id::text)
    `);
    if (m.rowCount) console.log(`pre-sync: created ${m.rowCount} task(s) from action-plan milestones`);
  }

  // 5. For plans with no milestones, convert each plannedActions entry to a task.
  const pa = await client.query(`
    INSERT INTO "tasks"
      (title, "issueId", "assignedToId", "ownerId", "orgUnitId", "hospitalId", "createdById", "milestoneId")
    SELECT
      pa.value,
      ap."issueId",
      ap."ownerId",
      ap."ownerId",
      i."orgUnitId"::text,
      i."hospitalId",
      ap."createdById",
      'plan:' || ap.id || ':' || pa.ordinality
    FROM "action_plans" ap
    JOIN "issues" i ON i.id = ap."issueId"
    CROSS JOIN LATERAL jsonb_array_elements_text(ap."plannedActions") WITH ORDINALITY AS pa(value, ordinality)
    WHERE ap."plannedActions" IS NOT NULL
      AND jsonb_typeof(ap."plannedActions") = 'array'
      AND NOT EXISTS (SELECT 1 FROM "action_plan_milestones" m WHERE m."actionPlanId" = ap.id)
      AND NOT EXISTS (SELECT 1 FROM "tasks" t WHERE t."milestoneId" = 'plan:' || ap.id || ':' || pa.ordinality)
  `);
  if (pa.rowCount) console.log(`pre-sync: created ${pa.rowCount} task(s) from action-plan planned actions`);

  // 6. Drop the legacy tables. TypeORM `synchronize` does NOT drop tables for
  //    entities it no longer knows about, so we must do it here — otherwise the
  //    migration's "if action_plans exists" guard would re-run on every boot.
  await client.query(`DROP TABLE IF EXISTS "action_plan_milestones"`);
  await client.query(`DROP TABLE IF EXISTS "action_plans"`);
  // tasks.milestoneId is dropped by synchronize (the entity no longer declares
  // it); it only existed transiently as the migration's idempotency key.

  console.log('pre-sync: action-plan → task migration complete (legacy tables dropped)');
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('pre-sync: DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await runNotNullBackfills(client);
    await migrateActionPlansToTasks(client);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('pre-sync failed:', err);
  process.exit(1);
});
