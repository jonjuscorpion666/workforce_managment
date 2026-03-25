/**
 * Role & Permission Seed
 *
 * Hierarchy:
 *   SUPER_ADMIN  — full platform access
 *   SVP          — Senior Vice President; top of org
 *   CNP          — Chief Nursing Officer; reports to SVP, one per hospital
 *   VP           — Vice President; reports to CNP
 *   DIRECTOR     — Director; reports to CNP, manages a department
 *   MANAGER      — Manager; reports to Director, oversees a unit
 *   NURSE        — Nurse; reports to Manager
 *   HR_ANALYST   — cross-cutting analytics & survey management
 *   READ_ONLY    — view dashboards only
 */

import { DataSource } from 'typeorm';
import { Role, SystemRole } from '../../modules/auth/entities/role.entity';
import { Permission } from '../../modules/auth/entities/permission.entity';

// ─── Permission definitions ───────────────────────────────────────────────────
const ALL_PERMISSIONS: { action: string; description: string; module: string }[] = [
  // Surveys
  { action: 'surveys:create',      description: 'Create surveys',              module: 'surveys' },
  { action: 'surveys:read',        description: 'View surveys',                module: 'surveys' },
  { action: 'surveys:update',      description: 'Edit surveys',                module: 'surveys' },
  { action: 'surveys:publish',     description: 'Publish/close surveys',       module: 'surveys' },
  { action: 'surveys:delete',      description: 'Delete surveys',              module: 'surveys' },
  // Responses
  { action: 'responses:submit',    description: 'Submit survey responses',     module: 'responses' },
  { action: 'responses:read',      description: 'View survey responses',       module: 'responses' },
  // Issues
  { action: 'issues:create',       description: 'Create issues',               module: 'issues' },
  { action: 'issues:read',         description: 'View issues',                 module: 'issues' },
  { action: 'issues:update',       description: 'Update issues',               module: 'issues' },
  { action: 'issues:close',        description: 'Close/validate issues',       module: 'issues' },
  // Tasks
  { action: 'tasks:create',        description: 'Create tasks',                module: 'tasks' },
  { action: 'tasks:read',          description: 'View tasks',                  module: 'tasks' },
  { action: 'tasks:update',        description: 'Update tasks',                module: 'tasks' },
  { action: 'tasks:assign',        description: 'Assign tasks to others',      module: 'tasks' },
  // Analytics
  { action: 'analytics:read',      description: 'View analytics & heatmaps',  module: 'analytics' },
  // Dashboard
  { action: 'dashboard:read',      description: 'View dashboard',              module: 'dashboard' },
  { action: 'dashboard:drilldown', description: 'Drill down into org units',   module: 'dashboard' },
  // Escalations
  { action: 'escalations:read',    description: 'View escalations',            module: 'escalations' },
  { action: 'escalations:trigger', description: 'Trigger escalations',         module: 'escalations' },
  // Speak Up
  { action: 'speakup:submit',      description: 'Submit speak-up cases',       module: 'speakup' },
  { action: 'speakup:read',        description: 'View speak-up cases (HR)',    module: 'speakup' },
  { action: 'speakup:manage',      description: 'Manage/resolve speak-up cases', module: 'speakup' },
  // Meetings
  { action: 'meetings:create',     description: 'Schedule meetings',           module: 'meetings' },
  { action: 'meetings:read',       description: 'View meetings',               module: 'meetings' },
  // Announcements
  { action: 'announcements:create', description: 'Create announcements',       module: 'announcements' },
  { action: 'announcements:read',  description: 'View announcements',          module: 'announcements' },
  // KPIs
  { action: 'kpis:read',           description: 'View KPIs',                   module: 'kpis' },
  { action: 'kpis:manage',         description: 'Create/update KPIs',          module: 'kpis' },
  // Audit
  { action: 'audit:read',          description: 'View audit logs',             module: 'audit' },
  // Admin
  { action: 'admin:users',         description: 'Manage users',                module: 'admin' },
  { action: 'admin:roles',         description: 'Manage roles & permissions',  module: 'admin' },
  { action: 'admin:config',        description: 'Manage platform config',      module: 'admin' },
  { action: 'org:manage',          description: 'Manage org unit structure',   module: 'org' },
];

// ─── Role → permission mapping ────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<SystemRole, string[]> = {
  [SystemRole.SUPER_ADMIN]: ALL_PERMISSIONS.map((p) => p.action), // everything

  [SystemRole.SVP]: [
    'surveys:create', 'surveys:read', 'surveys:update', 'surveys:publish', 'surveys:delete',
    'responses:read',
    'issues:create', 'issues:read', 'issues:update', 'issues:close',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
    'analytics:read',
    'dashboard:read', 'dashboard:drilldown',
    'escalations:read', 'escalations:trigger',
    'speakup:read', 'speakup:manage',
    'meetings:create', 'meetings:read',
    'announcements:create', 'announcements:read',
    'kpis:read', 'kpis:manage',
    'audit:read',
    'admin:users', 'org:manage',
  ],

  [SystemRole.CNP]: [
    'surveys:create', 'surveys:read', 'surveys:update', 'surveys:publish',
    'responses:read',
    'issues:create', 'issues:read', 'issues:update', 'issues:close',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
    'analytics:read',
    'dashboard:read', 'dashboard:drilldown',
    'escalations:read', 'escalations:trigger',
    'speakup:read', 'speakup:manage',
    'meetings:create', 'meetings:read',
    'announcements:create', 'announcements:read',
    'kpis:read', 'kpis:manage',
    'audit:read',
    'admin:users',
  ],

  [SystemRole.VP]: [
    'surveys:read',
    'responses:read',
    'issues:create', 'issues:read', 'issues:update',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
    'analytics:read',
    'dashboard:read', 'dashboard:drilldown',
    'escalations:read', 'escalations:trigger',
    'speakup:read',
    'meetings:create', 'meetings:read',
    'announcements:read',
    'kpis:read',
  ],

  [SystemRole.DIRECTOR]: [
    'surveys:read',
    'responses:read',
    'issues:create', 'issues:read', 'issues:update',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
    'analytics:read',
    'dashboard:read', 'dashboard:drilldown',
    'escalations:read', 'escalations:trigger',
    'speakup:read',
    'meetings:create', 'meetings:read',
    'announcements:create', 'announcements:read',
    'kpis:read',
  ],

  [SystemRole.MANAGER]: [
    'surveys:read',
    'responses:submit', 'responses:read',
    'issues:create', 'issues:read', 'issues:update',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
    'dashboard:read',
    'escalations:read',
    'speakup:submit', 'speakup:read',
    'meetings:create', 'meetings:read',
    'announcements:read',
    'kpis:read',
  ],

  [SystemRole.NURSE]: [
    'surveys:read',
    'responses:submit',
    'issues:read',
    'tasks:read',
    'dashboard:read',
    'speakup:submit',
    'meetings:read',
    'announcements:read',
  ],

  [SystemRole.HR_ANALYST]: [
    'surveys:create', 'surveys:read', 'surveys:update', 'surveys:publish',
    'responses:read',
    'issues:read',
    'tasks:read',
    'analytics:read',
    'dashboard:read', 'dashboard:drilldown',
    'escalations:read',
    'speakup:read', 'speakup:manage',
    'meetings:read',
    'announcements:read',
    'kpis:read', 'kpis:manage',
    'audit:read',
  ],

  [SystemRole.READ_ONLY]: [
    'surveys:read',
    'issues:read',
    'tasks:read',
    'dashboard:read',
    'announcements:read',
    'kpis:read',
  ],
};

// ─── Role metadata ─────────────────────────────────────────────────────────────
const ROLE_META: Record<SystemRole, { description: string }> = {
  [SystemRole.SUPER_ADMIN]: { description: 'Full platform access — system administrators only' },
  [SystemRole.SVP]:         { description: 'Senior Vice President — top of the organisation; all hospitals report up to SVP' },
  [SystemRole.CNP]:         { description: 'Chief Nursing Officer — reports to SVP; one per hospital; CNP oversees VPs and Directors' },
  [SystemRole.VP]:          { description: 'Vice President — reports to CNP; oversees a clinical division' },
  [SystemRole.DIRECTOR]:    { description: 'Director — reports to CNP; manages a department and oversees Managers' },
  [SystemRole.MANAGER]:     { description: 'Manager — reports to Director; manages a unit and oversees Nurses' },
  [SystemRole.NURSE]:       { description: 'Nurse — reports to Manager; participates in surveys and can raise speak-up cases' },
  [SystemRole.HR_ANALYST]:  { description: 'HR Analyst — analytics, survey management, and speak-up case handling' },
  [SystemRole.READ_ONLY]:   { description: 'Read-only access — view dashboards and announcements only' },
};

// ─── Seed function ─────────────────────────────────────────────────────────────
export async function seedRoles(dataSource: DataSource) {
  const permRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);

  console.log('🌱 Seeding permissions...');

  // Upsert all permissions
  const permMap = new Map<string, Permission>();
  for (const def of ALL_PERMISSIONS) {
    let perm = await permRepo.findOne({ where: { action: def.action } });
    if (!perm) {
      perm = permRepo.create(def);
      await permRepo.save(perm);
    }
    permMap.set(def.action, perm);
  }
  console.log(`   ✓ ${permMap.size} permissions ready`);

  console.log('🌱 Seeding roles...');

  for (const roleName of Object.values(SystemRole)) {
    const actions = ROLE_PERMISSIONS[roleName] || [];
    const permissions = actions.map((a) => permMap.get(a)).filter(Boolean) as Permission[];

    let role = await roleRepo.findOne({ where: { name: roleName }, relations: ['permissions'] });
    if (!role) {
      role = roleRepo.create({ name: roleName, ...ROLE_META[roleName], permissions });
      await roleRepo.save(role);
      console.log(`   ✓ Created role: ${roleName} (${permissions.length} permissions)`);
    } else {
      role.description = ROLE_META[roleName].description;
      role.permissions = permissions;
      await roleRepo.save(role);
      console.log(`   ↺ Updated role: ${roleName} (${permissions.length} permissions)`);
    }
  }

  console.log('✅ Roles seeded successfully\n');
  console.log('Hierarchy:');
  console.log('  SUPER_ADMIN');
  console.log('  SVP');
  console.log('  └── CNP  (reports to SVP, one per hospital)');
  console.log('      ├── VP       (reports to CNP)');
  console.log('      └── DIRECTOR (reports to CNP)');
  console.log('          └── MANAGER  (reports to DIRECTOR)');
  console.log('              └── NURSE    (reports to MANAGER)');
  console.log('  HR_ANALYST  (cross-cutting)');
  console.log('  READ_ONLY   (view only)');
}
