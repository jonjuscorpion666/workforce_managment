import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { OrgUnit, OrgLevel } from '../../modules/org/entities/org-unit.entity';
import { User } from '../../modules/auth/entities/user.entity';
import { Role } from '../../modules/auth/entities/role.entity';

// ─── Hospital definitions ─────────────────────────────────────────────────────
const HOSPITALS: { name: string; code: string; location: string }[] = [
  { name: 'Franciscan Health Carmel',          code: 'FH-CARMEL',  location: 'Carmel, IN' },
  { name: 'Franciscan Health Crawfordsville',  code: 'FH-CRAWF',   location: 'Crawfordsville, IN' },
  { name: 'Franciscan Health Crown Point',     code: 'FH-CROWN',   location: 'Crown Point, IN' },
  { name: 'Franciscan Health Dyer',            code: 'FH-DYER',    location: 'Dyer, IN' },
  { name: 'Franciscan Health Hammond',         code: 'FH-HAMMOND', location: 'Hammond, IN' },
  { name: 'Franciscan Health Indianapolis',    code: 'FH-INDY',    location: 'Indianapolis, IN' },
  { name: 'Franciscan Health Lafayette East',  code: 'FH-LAFE',    location: 'Lafayette, IN' },
  { name: 'Franciscan Health Michigan City',   code: 'FH-MICH',    location: 'Michigan City, IN' },
  { name: 'Franciscan Health Mooresville',     code: 'FH-MOORE',   location: 'Mooresville, IN' },
  { name: 'Franciscan Health Munster',         code: 'FH-MUNST',   location: 'Munster, IN' },
  { name: 'Franciscan Health Rensselaer',      code: 'FH-RENSS',   location: 'Rensselaer, IN' },
];

// ─── CNO per hospital ─────────────────────────────────────────────────────────
// Indianapolis reuses the existing demo user (cnp@hospital.com / Claire Nguyen).
// All others get dedicated CNO accounts.
const HOSPITAL_CNOS: {
  hospitalCode: string;
  email: string;
  firstName: string;
  lastName: string;
  reuseExisting?: boolean;
}[] = [
  { hospitalCode: 'FH-CARMEL',  email: 'cnp.carmel@franciscan.com',        firstName: 'Rachel',    lastName: 'Adams' },
  { hospitalCode: 'FH-CRAWF',   email: 'cnp.crawfordsville@franciscan.com', firstName: 'Thomas',    lastName: 'Reed' },
  { hospitalCode: 'FH-CROWN',   email: 'cnp.crownpoint@franciscan.com',     firstName: 'Diane',     lastName: 'Walker' },
  { hospitalCode: 'FH-DYER',    email: 'cnp.dyer@franciscan.com',           firstName: 'Kevin',     lastName: 'Harris' },
  { hospitalCode: 'FH-HAMMOND', email: 'cnp.hammond@franciscan.com',        firstName: 'Lisa',      lastName: 'Chen' },
  { hospitalCode: 'FH-INDY',    email: 'cnp@hospital.com',                  firstName: 'Claire',    lastName: 'Nguyen',  reuseExisting: true },
  { hospitalCode: 'FH-LAFE',    email: 'cnp.lafayette@franciscan.com',      firstName: 'Robert',    lastName: 'Kim' },
  { hospitalCode: 'FH-MICH',    email: 'cnp.michigancity@franciscan.com',   firstName: 'Patricia',  lastName: 'Moore' },
  { hospitalCode: 'FH-MOORE',   email: 'cnp.mooresville@franciscan.com',    firstName: 'Antonio',   lastName: 'Rivera' },
  { hospitalCode: 'FH-MUNST',   email: 'cnp.munster@franciscan.com',        firstName: 'Jennifer',  lastName: 'Cole' },
  { hospitalCode: 'FH-RENSS',   email: 'cnp.rensselaer@franciscan.com',     firstName: 'William',   lastName: 'Grant' },
];

// ─── Seed function ─────────────────────────────────────────────────────────────
export async function seedHospitals(dataSource: DataSource) {
  const orgRepo  = dataSource.getRepository(OrgUnit);
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  console.log('🌱 Seeding Franciscan Health hospitals...');

  // 1. System-level root org unit
  let system = await orgRepo.findOne({ where: { code: 'FH-SYSTEM' } });
  if (!system) {
    system = await orgRepo.save(orgRepo.create({
      name: 'Franciscan Health System',
      code: 'FH-SYSTEM',
      level: OrgLevel.SYSTEM,
      location: 'Indiana, USA',
      timezone: 'America/Indiana/Indianapolis',
      isActive: true,
    }));
    console.log('   ✓ Created root org: Franciscan Health System');
  } else {
    console.log('   → Root org already exists, skipping.');
  }

  // 2. Hospital org units
  const hospitalMap = new Map<string, OrgUnit>();
  for (const h of HOSPITALS) {
    let unit = await orgRepo.findOne({ where: { code: h.code } });
    if (!unit) {
      unit = await orgRepo.save(orgRepo.create({
        name: h.name,
        code: h.code,
        level: OrgLevel.HOSPITAL,
        location: h.location,
        timezone: 'America/Indiana/Indianapolis',
        parent: system,
        parentId: system.id,
        isActive: true,
      }));
      console.log(`   ✓ Created hospital: ${h.name}`);
    } else {
      console.log(`   → Exists: ${h.name}`);
    }
    hospitalMap.set(h.code, unit);
  }

  // 3. CNO users
  console.log('\n🌱 Seeding hospital CNOs...');

  const cnpRole = await roleRepo.findOne({ where: { name: 'CNO' }, relations: ['permissions'] });
  if (!cnpRole) {
    console.warn('   ⚠ CNP role not found — run roles seed first');
    return;
  }

  const svpUser = await userRepo.findOne({ where: { email: 'svp@hospital.com' } });
  const password = await bcrypt.hash('Password123!', 12);

  for (const cno of HOSPITAL_CNOS) {
    const hospital = hospitalMap.get(cno.hospitalCode)!;

    if (cno.reuseExisting) {
      // Assign the existing demo CNP to this hospital
      const existing = await userRepo.findOne({ where: { email: cno.email } });
      if (existing) {
        existing.orgUnit = hospital;
        if (svpUser) existing.reportsToId = svpUser.id;
        await userRepo.save(existing);
        console.log(`   ↺ Updated ${cno.email} → ${hospital.name}`);
      }
      continue;
    }

    const exists = await userRepo.findOne({ where: { email: cno.email } });
    if (exists) {
      // Ensure org unit is set
      exists.orgUnit = hospital;
      if (svpUser) exists.reportsToId = svpUser.id;
      await userRepo.save(exists);
      console.log(`   → Exists (updated org): ${cno.email}`);
      continue;
    }

    const user = userRepo.create({
      email: cno.email,
      password,
      firstName: cno.firstName,
      lastName: cno.lastName,
      jobTitle: 'Chief Nursing Officer',
      roles: [cnpRole],
      orgUnit: hospital,
      reportsToId: svpUser?.id,
      isSuperAdmin: false,
    });
    await userRepo.save(user);
    console.log(`   ✓ Created CNO: ${cno.firstName} ${cno.lastName} → ${hospital.name}`);
  }

  console.log('\n✅ Hospitals & CNOs seeded\n');
  console.log('┌──────────────────────────────────────────┬────────────────────────────────────────────────┐');
  console.log('│ Hospital                                 │ CNO Email                                      │');
  console.log('├──────────────────────────────────────────┼────────────────────────────────────────────────┤');
  for (const cno of HOSPITAL_CNOS) {
    const h = HOSPITALS.find((x) => x.code === cno.hospitalCode)!;
    const name  = h.name.padEnd(40);
    const email = cno.email.padEnd(46);
    console.log(`│ ${name} │ ${email} │`);
  }
  console.log('└──────────────────────────────────────────┴────────────────────────────────────────────────┘');
  console.log('\nAll CNO passwords: Password123!\n');
}
