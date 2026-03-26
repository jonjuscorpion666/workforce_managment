import { DataSource } from 'typeorm';
import { Config } from '../../modules/admin/entities/config.entity';

const GOVERNANCE_DEFAULTS: { key: string; value: any; description: string }[] = [
  {
    key: 'cno_survey_requires_svp_approval',
    value: true,
    description:
      'When true, surveys created by CNOs are set to PENDING and must be approved by an SVP before they can be published.',
  },
  {
    key: 'cno_must_use_template',
    value: false,
    description:
      'When true, CNOs must select an approved survey template as the basis for any new survey.',
  },
  {
    key: 'cno_can_target_scope',
    value: ['HOSPITAL', 'UNIT'],
    description:
      'Scopes that CNOs are permitted to target. CNOs may never set scope to SYSTEM.',
  },
  {
    key: 'director_survey_requires_approval',
    value: true,
    description:
      'When true, surveys created by Directors are set to PENDING and must be approved by a CNO or SVP before going live. Recommended to prevent survey fatigue at department level.',
  },
  {
    key: 'director_max_questions',
    value: 5,
    description:
      'Maximum number of questions a Director is allowed to include in a pulse survey. Enforced in the UI and validated server-side.',
  },
  {
    key: 'director_can_target_scope',
    value: ['UNIT'],
    description:
      'Scopes that Directors are permitted to target. Directors may only target their own department/unit and cannot reach other hospitals or the system.',
  },
  {
    key: 'manager_survey_creation_enabled',
    value: false,
    description:
      'When false (recommended), Managers cannot create surveys. They may request surveys via the Speak Up / request channel. Enabling this is not recommended due to risk of survey overload and data inconsistency.',
  },
  {
    key: 'auto_issue_threshold',
    value: 70,
    description:
      'Favorable score percentage below which an issue is automatically created during survey analysis. Units scoring below this value on any engagement dimension will have an issue raised. Default: 70.',
  },
];

export async function seedGovernance(dataSource: DataSource) {
  const repo = dataSource.getRepository(Config);

  console.log('🌱 Seeding governance configuration...');

  for (const entry of GOVERNANCE_DEFAULTS) {
    const existing = await repo.findOne({ where: { key: entry.key } });
    if (existing) {
      console.log(`   → Exists: ${entry.key}`);
      continue;
    }
    await repo.save(repo.create(entry));
    console.log(`   ✓ Created: ${entry.key} = ${JSON.stringify(entry.value)}`);
  }

  console.log('✅ Governance config seeded\n');
  console.log('   cno_survey_requires_svp_approval   = true   (CNOs need SVP sign-off)');
  console.log('   cno_must_use_template              = false  (templates optional)');
  console.log('   cno_can_target_scope               = HOSPITAL, UNIT');
  console.log('   director_survey_requires_approval  = true   (Directors need CNO/SVP sign-off)');
  console.log('   director_max_questions             = 5      (survey fatigue guard)');
  console.log('   director_can_target_scope          = UNIT');
  console.log('   manager_survey_creation_enabled    = false  (not recommended)');
  console.log('   auto_issue_threshold               = 70     (% below which issues are auto-created)\n');
}
