import { DataSource } from 'typeorm';
import { Survey, SurveyType, SurveyStatus } from '../../modules/surveys/entities/survey.entity';
import { Question, QuestionType } from '../../modules/surveys/entities/question.entity';

export async function seedAdhocSurvey(dataSource: DataSource) {
  const surveyRepo   = dataSource.getRepository(Survey);
  const questionRepo = dataSource.getRepository(Question);

  // Avoid duplicate
  const existing = await surveyRepo.findOne({ where: { title: 'Employee Engagement — Workforce Voice Survey' } });
  if (existing) {
    console.log('   → Survey already exists, skipping.');
    return;
  }

  const questions: Partial<Question>[] = [
    // ── Q1 ──────────────────────────────────────────────────────────────────
    {
      text: 'What are the main reasons you would hesitate to recommend this organization?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 0,
      options: [
        'Lack of recognition',
        'Poor leadership communication',
        'Workload/staffing challenges',
        'Limited career growth opportunities',
        'Compensation/benefits concerns',
        'Workplace culture',
        'Lack of support from management',
        'Other (please specify)',
      ],
      category: 'Recommendation',
    },
    {
      text: 'Q1 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 1,
      category: 'Recommendation',
    },

    // ── Q2 ──────────────────────────────────────────────────────────────────
    {
      text: 'What impacts your sense of pride in working here?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 2,
      options: [
        'Organizational reputation',
        'Leadership decisions',
        'Team culture',
        'Lack of recognition',
        'Patient/customer experience concerns',
        'Misalignment with values/mission',
        'Other (please specify)',
      ],
      category: 'Pride & Belonging',
    },
    {
      text: 'Q2 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 3,
      category: 'Pride & Belonging',
    },

    // ── Q3 ──────────────────────────────────────────────────────────────────
    {
      text: 'What reduces your enthusiasm for your job?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 4,
      options: [
        'Burnout/workload',
        'Lack of appreciation',
        'Poor teamwork',
        'Inefficient processes',
        'Limited input in decisions',
        'Lack of growth opportunities',
        'Other (please specify)',
      ],
      category: 'Enthusiasm & Motivation',
    },
    {
      text: 'Q3 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 5,
      category: 'Enthusiasm & Motivation',
    },

    // ── Q4 ──────────────────────────────────────────────────────────────────
    {
      text: 'What affects your sense of meaningful work or contribution to the mission?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 6,
      options: [
        'Unclear connection to mission',
        'Tasks feel routine/non-impactful',
        'Lack of feedback on impact',
        'Leadership not reinforcing mission',
        'Misalignment between values and actions',
        'Other (please specify)',
      ],
      category: 'Mission & Meaning',
    },
    {
      text: 'Q4 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 7,
      category: 'Mission & Meaning',
    },

    // ── Q5 ──────────────────────────────────────────────────────────────────
    {
      text: 'When do you feel least valued?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 8,
      options: [
        'When recognition is lacking',
        'When feedback is absent',
        'When ideas are ignored',
        'When workload is unfair',
        'When leadership is not visible',
        'Other (please specify)',
      ],
      category: 'Recognition & Value',
    },
    {
      text: 'Q5 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 9,
      category: 'Recognition & Value',
    },

    // ── Q6 ──────────────────────────────────────────────────────────────────
    {
      text: 'What are the biggest gaps in leadership communication?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 10,
      options: [
        'Not enough transparency',
        'Delayed communication',
        'Inconsistent messaging',
        'Lack of clarity on decisions',
        'Limited opportunity to ask questions',
        'Other (please specify)',
      ],
      category: 'Leadership Communication',
    },
    {
      text: 'Q6 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 11,
      category: 'Leadership Communication',
    },

    // ── Q7 ──────────────────────────────────────────────────────────────────
    {
      text: 'What prevents you from speaking up?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 12,
      options: [
        'Fear of retaliation',
        'Lack of trust in leadership',
        'No action taken on feedback',
        'Unclear reporting channels',
        'Previous negative experiences',
        'Other (please specify)',
      ],
      category: 'Psychological Safety',
    },
    {
      text: 'Q7 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 13,
      category: 'Psychological Safety',
    },

    // ── Q8 ──────────────────────────────────────────────────────────────────
    {
      text: 'What are the challenges with manager feedback?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 14,
      options: [
        'Not frequent enough',
        'Not specific/actionable',
        'Not timely',
        'Focused only on negatives',
        'Manager not approachable',
        'Other (please specify)',
      ],
      category: 'Manager Feedback',
    },
    {
      text: 'Q8 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 15,
      category: 'Manager Feedback',
    },

    // ── Q9 ──────────────────────────────────────────────────────────────────
    {
      text: 'What limits your ability to fully use your skills?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 16,
      options: [
        'Role constraints',
        'Lack of training/development',
        'Staffing shortages',
        'Poor task allocation',
        'Limited growth opportunities',
        'Other (please specify)',
      ],
      category: 'Skills & Development',
    },
    {
      text: 'Q9 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 17,
      category: 'Skills & Development',
    },

    // ── Q10 ─────────────────────────────────────────────────────────────────
    {
      text: 'What would most improve your overall work experience?',
      helpText: 'Select all that apply',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 18,
      options: [
        'Better staffing levels',
        'More recognition',
        'Improved leadership communication',
        'Career development opportunities',
        'Stronger teamwork',
        'Process improvements',
        'Better manager support',
        'Other (please specify)',
      ],
      category: 'Overall Experience',
    },
    {
      text: 'Q10 — Additional comments',
      helpText: 'Optional: share more details',
      type: QuestionType.OPEN_TEXT,
      isRequired: false,
      orderIndex: 19,
      category: 'Overall Experience',
    },
  ];

  // Create & save survey
  const survey = surveyRepo.create({
    title: 'Employee Engagement — Workforce Voice Survey',
    description:
      'Help us understand what matters most to you. All responses are completely anonymous. ' +
      'Select all options that apply and add comments where you\'d like to share more.',
    type: SurveyType.AD_HOC,
    status: SurveyStatus.ACTIVE,
    isAnonymous: true,
    questions: questions.map((q) => questionRepo.create(q)),
  });

  const saved = await surveyRepo.save(survey) as unknown as Survey;

  console.log(`   ✓ Survey created & published: "${saved.title}"`);
  console.log(`   ✓ ID: ${saved.id}`);
  console.log(`   ✓ Questions: ${questions.length} (10 multi-choice + 10 comment fields)`);
  console.log(`\n   🔗 Nurse Portal link:`);
  console.log(`      http://localhost:3000/portal/survey/${saved.id}`);
  console.log(`\n   🔗 Public link:`);
  console.log(`      http://localhost:3000/survey/${saved.id}\n`);
}
