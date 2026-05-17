import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import {
  FeedbackLocation, FeedbackLocationType, FeedbackLocationStatus,
} from '../../modules/patient-feedback/entities/feedback-location.entity';
import { OrgUnit, OrgLevel } from '../../modules/org/entities/org-unit.entity';

const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function token(prefix: string): string {
  const bytes = crypto.randomBytes(6);
  let body = '';
  for (let i = 0; i < 6; i++) body += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  return `${prefix}${body}`;
}

/**
 * Pilot ward (3A) under Franciscan Health Indianapolis (FH-INDY). Creates the
 * department + UNIT org units in the shared org tree so locations are fully
 * org-linked — feedback tickets then auto-resolve to the ward manager, falling
 * back to the FH-INDY CNO (cnp@hospital.com). Idempotent.
 */
export async function seedPatientFeedback(dataSource: DataSource) {
  const repo = dataSource.getRepository(FeedbackLocation);
  const orgRepo = dataSource.getRepository(OrgUnit);

  const existing = await repo.findOne({ where: { ward: '3A' } });
  if (existing) {
    console.log('   → Skipped (Ward 3A feedback locations exist)');
    return;
  }

  const indyHospital = await orgRepo.findOne({ where: { code: 'FH-INDY' } });
  if (!indyHospital) {
    console.warn('   ⚠ FH-INDY hospital not found — run hospitals seed first. Skipping.');
    return;
  }

  // Department: Inpatient Nursing → Unit: Ward 3A
  let inpDept = await orgRepo.findOne({ where: { code: 'FH-INDY-INP-DEPT' } });
  if (!inpDept) {
    inpDept = await orgRepo.save(orgRepo.create({
      name: 'Inpatient Nursing',
      code: 'FH-INDY-INP-DEPT',
      level: OrgLevel.DEPARTMENT,
      location: 'Indianapolis, IN',
      timezone: 'America/Indiana/Indianapolis',
      parent: indyHospital,
      parentId: indyHospital.id,
      isActive: true,
    }));
    console.log('   ✓ Created department: Inpatient Nursing');
  }

  let ward3a = await orgRepo.findOne({ where: { code: 'FH-INDY-3A' } });
  if (!ward3a) {
    ward3a = await orgRepo.save(orgRepo.create({
      name: 'Ward 3A',
      code: 'FH-INDY-3A',
      level: OrgLevel.UNIT,
      location: 'Indianapolis, IN',
      timezone: 'America/Indiana/Indianapolis',
      parent: inpDept,
      parentId: inpDept.id,
      isActive: true,
    }));
    console.log('   ✓ Created unit: Ward 3A');
  }

  const rows: Partial<FeedbackLocation>[] = [];
  for (const room of ['312', '313', '314']) {
    for (const bed of ['1', '2']) {
      rows.push({
        token: token('B'),
        ward: '3A',
        room,
        bed,
        locationType: FeedbackLocationType.BED,
        department: 'Inpatient Nursing',
        hospitalId: indyHospital.id,
        orgUnitId: ward3a.id,
        status: FeedbackLocationStatus.ACTIVE,
      });
    }
  }
  rows.push({
    token: token('W'),
    ward: '3A',
    room: null,
    bed: null,
    locationType: FeedbackLocationType.WARD,
    department: 'Nursing Station / Ward Common Area',
    hospitalId: indyHospital.id,
    orgUnitId: ward3a.id,
    status: FeedbackLocationStatus.ACTIVE,
  });

  await repo.save(rows.map((r) => repo.create(r)));
  console.log(`   ✓ Seeded ${rows.length} Ward 3A feedback locations (FH-INDY)`);
}
