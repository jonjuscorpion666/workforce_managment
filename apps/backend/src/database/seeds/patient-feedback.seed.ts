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
 * Pilot ward (3A): one bed-level QR per bed for rooms 312–314 plus a ward-level
 * QR for the nursing station. Idempotent — skips if Ward 3A already seeded.
 */
export async function seedPatientFeedback(dataSource: DataSource) {
  const repo = dataSource.getRepository(FeedbackLocation);

  const existing = await repo.findOne({ where: { ward: '3A' } });
  if (existing) {
    console.log('   → Skipped (Ward 3A feedback locations exist)');
    return;
  }

  // Best-effort link to a hospital OrgUnit so dashboards can scope by hospital.
  const orgRepo = dataSource.getRepository(OrgUnit);
  const hospital = await orgRepo.findOne({ where: { level: OrgLevel.HOSPITAL } });
  const hospitalId = hospital?.id ?? null;

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
        hospitalId,
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
    hospitalId,
    status: FeedbackLocationStatus.ACTIVE,
  });

  await repo.save(rows.map((r) => repo.create(r)));
  console.log(`   ✓ Seeded ${rows.length} Ward 3A feedback locations`);
}
