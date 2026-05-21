import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import {
  FeedbackLocation, FeedbackLocationStatus,
} from '../../modules/patient-feedback/entities/feedback-location.entity';
import { FeedbackUnit, FeedbackUnitStatus } from '../../modules/patient-feedback/entities/feedback-unit.entity';
import { OrgUnit } from '../../modules/org/entities/org-unit.entity';

const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function token(): string {
  const bytes = crypto.randomBytes(6);
  let body = '';
  for (let i = 0; i < 6; i++) body += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  return `R${body}`;
}

/**
 * Pilot rooms (312/313/314) under Franciscan Health Indianapolis (FH-INDY).
 * Idempotent — also runs a one-shot cleanup that removes orphan rows left
 * over from the old (ward/bed/department) shape:
 *   - rows whose `hospitalId` is null (no longer valid),
 *   - rows whose `room` is null (the old ward-area QR),
 *   - duplicate (hospitalId, room) rows (oldest kept).
 */
export async function seedPatientFeedback(dataSource: DataSource) {
  const repo = dataSource.getRepository(FeedbackLocation);
  const unitRepo = dataSource.getRepository(FeedbackUnit);
  const orgRepo = dataSource.getRepository(OrgUnit);

  // ── one-shot cleanup after model trim ────────────────────────────────────
  await dataSource.query(`
    DELETE FROM feedback_locations
     WHERE "hospitalId" IS NULL
        OR room IS NULL
        OR TRIM(room) = ''
  `);
  await dataSource.query(`
    DELETE FROM feedback_locations a
     USING feedback_locations b
     WHERE a.id <> b.id
       AND a."hospitalId" = b."hospitalId"
       AND a.room = b.room
       AND a."createdAt" > b."createdAt"
  `);

  const indyHospital = await orgRepo.findOne({ where: { code: 'FH-INDY' } });
  if (!indyHospital) {
    console.warn('   ⚠ FH-INDY hospital not found — run hospitals seed first. Skipping.');
    return;
  }

  // ── Sample units (the level between hospital and room) ───────────────────
  async function ensureUnit(name: string): Promise<FeedbackUnit> {
    let unit = await unitRepo.findOne({ where: { hospitalId: indyHospital!.id, name } });
    if (!unit) {
      unit = await unitRepo.save(
        unitRepo.create({ hospitalId: indyHospital!.id, name, status: FeedbackUnitStatus.ACTIVE }),
      );
      console.log(`   ✓ Seeded unit: ${name}`);
    }
    return unit;
  }
  const westUnit = await ensureUnit('3 West');
  await ensureUnit('ICU');

  // Pilot rooms live under "3 West". Existing pilot rooms are backfilled to it.
  let created = 0;
  for (const room of ['312', '313', '314']) {
    const exists = await repo.findOne({ where: { hospitalId: indyHospital.id, room } });
    if (exists) {
      if (!exists.unitId) { exists.unitId = westUnit.id; await repo.save(exists); }
      continue;
    }
    await repo.save(
      repo.create({
        token: token(),
        hospitalId: indyHospital.id,
        unitId: westUnit.id,
        room,
        status: FeedbackLocationStatus.ACTIVE,
      }),
    );
    created++;
  }
  console.log(
    created > 0
      ? `   ✓ Seeded ${created} room QR(s) under FH-INDY · 3 West`
      : '   → All FH-INDY pilot rooms already present',
  );
}
