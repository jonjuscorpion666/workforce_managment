import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../modules/auth/entities/user.entity';
import { Role } from '../../modules/auth/entities/role.entity';

export async function seedDemoUsers(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  const demoUsers = [
    { email: 'svp@hospital.com',      password: 'Password123!', firstName: 'Sarah',  lastName: 'Mitchell',  role: 'SVP',        jobTitle: 'Senior Vice President' },
    { email: 'cnp@hospital.com',      password: 'Password123!', firstName: 'Claire', lastName: 'Nguyen',    role: 'CNO',        jobTitle: 'Chief Nursing Officer' },
    { email: 'vp@hospital.com',       password: 'Password123!', firstName: 'David',  lastName: 'Torres',    role: 'VP',         jobTitle: 'Vice President, Clinical' },
    { email: 'director@hospital.com', password: 'Password123!', firstName: 'Maria',  lastName: 'Johnson',   role: 'DIRECTOR',   jobTitle: 'Director of Nursing' },
    { email: 'manager@hospital.com',  password: 'Password123!', firstName: 'James',  lastName: 'Lee',       role: 'MANAGER',    jobTitle: 'Unit Manager, ICU' },
    { email: 'nurse1@hospital.com',   password: 'Password123!', firstName: 'Emily',  lastName: 'Carter',    role: 'NURSE',      jobTitle: 'Registered Nurse', employeeId: 'EMP001' },
    { email: 'nurse2@hospital.com',   password: 'Password123!', firstName: 'Marcus', lastName: 'Williams',  role: 'NURSE',      jobTitle: 'Registered Nurse', employeeId: 'EMP002' },
    { email: 'nurse3@hospital.com',   password: 'Password123!', firstName: 'Priya',  lastName: 'Sharma',    role: 'NURSE',      jobTitle: 'Registered Nurse', employeeId: 'EMP003' },
    { email: 'pct1@hospital.com',    password: 'Password123!', firstName: 'Jordan', lastName: 'Hayes',     role: 'PCT',        jobTitle: 'Patient Care Technician', employeeId: 'EMP004' },
    { email: 'hr@hospital.com',       password: 'Password123!', firstName: 'Tanya',  lastName: 'Brooks',    role: 'HR_ANALYST', jobTitle: 'HR Analyst' },
    { email: 'admin@hospital.com',    password: 'Password123!', firstName: 'System', lastName: 'Admin',     role: 'SUPER_ADMIN',jobTitle: 'Platform Admin', isSuperAdmin: true },
  ];

  console.log('🌱 Seeding demo users...');

  for (const def of demoUsers) {
    const existing = await userRepo.findOne({ where: { email: def.email } });
    if (existing) {
      console.log(`   → Skipped (exists): ${def.email}`);
      continue;
    }

    const role = await roleRepo.findOne({ where: { name: def.role }, relations: ['permissions'] });
    if (!role) {
      console.warn(`   ⚠ Role not found: ${def.role} — run roles seed first`);
      continue;
    }

    const hashed = await bcrypt.hash(def.password, 12);
    const user = userRepo.create({
      email: def.email,
      password: hashed,
      firstName: def.firstName,
      lastName: def.lastName,
      jobTitle: def.jobTitle,
      employeeId: (def as any).employeeId,
      isSuperAdmin: (def as any).isSuperAdmin ?? false,
      roles: [role],
    });

    await userRepo.save(user);
    console.log(`   ✓ Created: ${def.email}  [${def.role}]`);
  }

  console.log('\n✅ Demo users seeded\n');
  console.log('┌────────────────────────────┬──────────────┬──────────────┐');
  console.log('│ Email                      │ Role         │ Password     │');
  console.log('├────────────────────────────┼──────────────┼──────────────┤');
  demoUsers.forEach((u) => {
    const email = u.email.padEnd(26);
    const role  = u.role.padEnd(12);
    console.log(`│ ${email} │ ${role} │ Password123! │`);
  });
  console.log('└────────────────────────────┴──────────────┴──────────────┘');
  console.log('\nNurse Portal → http://localhost:3000/portal/login');
  console.log('Admin UI     → http://localhost:3000/dashboard\n');
}
