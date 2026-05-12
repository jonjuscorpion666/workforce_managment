import { DataSource } from 'typeorm';
import { Survey, SurveyType, SurveyStatus, ApprovalStatus, TargetScope } from '../../modules/surveys/entities/survey.entity';
import { Question, QuestionType } from '../../modules/surveys/entities/question.entity';

// Two reusable survey templates derived from the Nursing & PCT Burden Assessment
// Focus Group Guide. Both follow a similar 5-bucket shape, but the RN template
// has been refined per facilitator feedback (rewordings, helpText examples, two
// removed cumulative items, and one item moved from EMOTIONAL_TAX → GENERAL).

const BUCKETS = ['WASTE', 'FRICTION', 'UNPREDICTABILITY', 'ROLE_DRIFT', 'EMOTIONAL_TAX'] as const;

type QSpec = Partial<Question> & { text: string; type: QuestionType };

function bucketQuestions(role: 'RN' | 'PCT'): QSpec[] {
  const isRN = role === 'RN';
  const items: QSpec[] = [];

  // ── WASTE ────────────────────────────────────────────────────────────────
  items.push(
    {
      text: 'How often does duplicated documentation slow you down during a shift?',
      type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Every shift',
      category: 'WASTE', dimension: 'WASTE', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'Which documentation feels redundant? Be specific (form name / time of day).',
    },
    {
      text: isRN
        ? 'How often do unclear handoffs or miscommunication make you redo work?'
        : 'How often do you redo work because of unclear handoffs or miscommunication?',
      type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Every shift',
      category: 'WASTE', dimension: 'WASTE', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'Describe a recent example.',
    },
    {
      text: isRN
        ? 'How much do non-clinical administrative tasks drain time from patient care?'
        : 'How much do non-care tasks pull you away from supporting patients?',
      type: QuestionType.LIKERT_5,
      helpText: isRN
        ? '1 = Not at all, 5 = Constantly. e.g., incident-reporting paperwork, discharge case management, ambulance/paramedic coordination, compliance audits, patient & family phone calls, completing CBTs.'
        : '1 = Not at all, 5 = Constantly. e.g., stocking and restocking supplies, transporting patients, cleaning duties, answering non-care call lights, completing PCT-specific documentation.',
      category: 'WASTE', dimension: 'WASTE', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'Which task, if removed, would give you back the most time?',
    },
  );

  // ── FRICTION ─────────────────────────────────────────────────────────────
  items.push(
    {
      text: 'How often do supply hunts or missing equipment delay your work?',
      type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Every shift',
      category: 'FRICTION', dimension: 'FRICTION', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'Which supplies and where in the unit?',
    },
    {
      text: 'How often do interruptions break your concentration on patient care?',
      type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Constantly',
      category: 'FRICTION', dimension: 'FRICTION', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'What kinds of interruptions are most common?',
    },
    {
      text: 'How often do broken workflows or poor teamwork slow you down?',
      type: QuestionType.LIKERT_5,
      helpText: isRN
        ? '1 = Never, 5 = Every shift. e.g., EMR login delays, malfunctioning devices, devices not integrated with the charting system, role confusion between RN / PCT / RT.'
        : '1 = Never, 5 = Every shift. e.g., EMR login delays, malfunctioning devices, devices not integrated with the charting system, role confusion between RN, PCT, and ancillary staff.',
      category: 'FRICTION', dimension: 'FRICTION', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'Which workflow or which team interaction?',
    },
  );

  // ── UNPREDICTABILITY ─────────────────────────────────────────────────────
  items.push(
    {
      text: 'How predictable is your schedule each week?',
      type: QuestionType.LIKERT_5, helpText: '1 = Very unpredictable, 5 = Fully predictable',
      category: 'UNPREDICTABILITY', dimension: 'UNPREDICTABILITY', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'What aspect of scheduling feels most unpredictable?',
    },
    {
      text: 'How disruptive is daily floating or last-minute reassignment?',
      type: QuestionType.LIKERT_5, helpText: '1 = Not disruptive, 5 = Severely disruptive',
      category: 'UNPREDICTABILITY', dimension: 'UNPREDICTABILITY', source: 'CUSTOM',
      followUpThreshold: 4, followUpPrompt: 'What would make floating less disruptive?',
    },
    {
      text: 'How often does continuous admission and discharge add chaos to your daily shift?',
      type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Every shift',
      category: 'UNPREDICTABILITY', dimension: 'UNPREDICTABILITY', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'What time of day or which patient flow is hardest?',
    },
    // G1 — gap from focus-group guide
    {
      text: isRN
        ? 'How often does inadequate staffing (less than what the grid recommends) make it difficult to complete your shift work efficiently?'
        : 'How often does tight staffing make your shift harder rather than getting handled smoothly?',
      type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Every shift',
      category: 'UNPREDICTABILITY', dimension: 'UNPREDICTABILITY', source: 'CUSTOM',
      followUpThreshold: 2,
      followUpPrompt: isRN
        ? 'What specifically makes inadequately-staffed days worse?'
        : 'What specifically makes tight-staffing days worse?',
    },
  );

  // G2 — RN only: staffing/assignment guidelines disconnected from reality
  if (isRN) {
    items.push({
      text: 'How often do staffing or assignment guidelines feel disconnected from the reality of your shift?',
      type: QuestionType.LIKERT_5,
      helpText: '1 = Never, 5 = Every shift. e.g., fixed nurse-to-patient ratio (1:5 med-surg) regardless of acuity; geographic assignment causing unequal burden; no accounting for invisible work; excessive documentation burden for high-acuity assignments.',
      category: 'UNPREDICTABILITY', dimension: 'UNPREDICTABILITY', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'Which guideline, specifically?',
    });
  }

  // ── ROLE DRIFT ───────────────────────────────────────────────────────────
  items.push(
    {
      text: isRN
        ? 'How often do you do non-RN work that takes you away from RN work?'
        : 'How often do you do tasks that do not really feel like your job?',
      type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Every shift',
      category: 'ROLE_DRIFT', dimension: 'ROLE_DRIFT', source: 'CUSTOM',
      followUpThreshold: 2,
      followUpPrompt: isRN
        ? 'What non-RN tasks are taking you away from RN work?'
        : 'What tasks feel outside your role?',
    },
    {
      text: 'How often does unclear delegation cause rework?',
      type: QuestionType.LIKERT_5,
      helpText: isRN
        ? '1 = Never, 5 = Every shift. e.g., vague or incomplete physician orders; "watch my patient while I\'m on break"; "tell me when urine output is low"; assigning feeding evaluations that are out of RN scope.'
        : '1 = Never, 5 = Every shift. e.g., "watch my patient while I\'m on break"; "let me know when X happens"; inconsistent handoffs from the RN; tasks delegated without context or clear acceptance.',
      category: 'ROLE_DRIFT', dimension: 'ROLE_DRIFT', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'Where does this typically happen?',
    },
    {
      text: 'How often do you feel pulled in too many directions at once?',
      type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Constantly',
      category: 'ROLE_DRIFT', dimension: 'ROLE_DRIFT', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'When during the shift does this happen most?',
    },
  );

  // ── EMOTIONAL TAX ────────────────────────────────────────────────────────
  // RN keeps only the anxious/second-guess item per facilitator feedback.
  // PCT keeps the original three (mentally exhausted, least supported, unfair) plus G3 (blamed).
  items.push({
    text: isRN
      ? 'How often do you feel anxious or second-guess clinical decisions during your shift?'
      : 'How often do you feel least supported on the unit?',
    type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Constantly',
    category: 'EMOTIONAL_TAX', dimension: 'EMOTIONAL_TAX', source: 'CUSTOM',
    followUpThreshold: 2,
    followUpPrompt: isRN
      ? 'What kind of decisions cause the most anxiety?'
      : 'When and from whom does the lack of support typically come?',
  });

  if (!isRN) {
    // G3 — PCT only: blamed for things outside their control
    items.push({
      text: 'How often do you feel blamed for things outside your control?',
      type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Every shift',
      category: 'EMOTIONAL_TAX', dimension: 'EMOTIONAL_TAX', source: 'CUSTOM',
      followUpThreshold: 2, followUpPrompt: 'What kinds of things, and by whom?',
    });
  }
  // Removed for both roles per facilitator feedback: 'mentally exhausted'
  // and 'work feels unfair' — cumulative-impact, not specific removable burdens.
  // The 'calling off / leaving early' G4 item is emitted in closingQuestions()
  // as a GENERAL reflective indicator, not a burden item.

  return items;
}

function closingQuestions(_role: 'RN' | 'PCT'): QSpec[] {
  const items: QSpec[] = [];

  // G4 — calling off / leaving early: lives in GENERAL for both roles.
  // Important to capture (turnover-intent leading indicator) but doesn't
  // correspond to a specific removable burden.
  items.push({
    text: 'How often do you find yourself thinking about calling off or leaving your shift early?',
    type: QuestionType.LIKERT_5, helpText: '1 = Never, 5 = Every shift',
    category: 'GENERAL', dimension: 'GENERAL', source: 'CUSTOM',
    followUpThreshold: 2, followUpPrompt: 'What pushes you toward that thought most?',
  });

  items.push(
    {
      text: 'Of all the burdens you identified, which one are you experiencing most frequently?',
      type: QuestionType.OPEN_TEXT, helpText: 'One sentence is fine.',
      category: 'PRIORITISATION', dimension: 'GENERAL', source: 'CUSTOM',
    },
    {
      text: 'Is the burden you most want fixed within unit / leadership control?',
      type: QuestionType.YES_NO,
      category: 'PRIORITISATION', dimension: 'GENERAL', source: 'CUSTOM',
    },
    {
      text: 'Would removing this burden make tomorrow\'s shift noticeably easier for you?',
      type: QuestionType.YES_NO,
      category: 'PRIORITISATION', dimension: 'GENERAL', source: 'CUSTOM',
    },
    {
      text: 'If leadership fixed ONE thing in the next 30 days, what should it be? Be specific — name the task, the time of day, or the workflow.',
      type: QuestionType.OPEN_TEXT, helpText: 'Concrete is better than abstract.', isRequired: true,
      category: 'ONE_THING', dimension: 'GENERAL', source: 'CUSTOM',
    },
    {
      text: 'Would you be willing to join a 30-minute burden-removal session?',
      type: QuestionType.YES_NO,
      category: 'VOLUNTEER', dimension: 'GENERAL', source: 'CUSTOM',
    },
  );

  return items;
}

function buildTemplate(role: 'RN' | 'PCT'): { title: string; questions: QSpec[]; description: string; objective: string; targetRoles: string[] } {
  const all = [...bucketQuestions(role), ...closingQuestions(role)].map((q, i) => ({ ...q, orderIndex: i, isRequired: q.isRequired ?? false }));
  return {
    title: role === 'RN'
      ? 'Monthly Burden Pulse — RN'
      : 'Monthly Burden Pulse — PCT',
    description: role === 'RN'
      ? 'Quick monthly pulse on the work that makes nursing harder than it needs to be. Your responses are anonymous. Leadership commits to removing at least one burden per month.'
      : 'Quick monthly pulse on the work that makes the PCT role harder than it needs to be. Your responses are anonymous. Leadership commits to removing at least one burden per month.',
    objective: role === 'RN'
      ? 'Identify the single highest-frequency, most-controllable burden affecting RNs this month, so it can be removed within 30 days.'
      : 'Identify the single highest-frequency, most-controllable burden affecting PCTs this month, so it can be removed within 30 days.',
    questions: all,
    targetRoles: [role],
  };
}

export async function seedBurdenPulseTemplates(dataSource: DataSource) {
  const surveyRepo   = dataSource.getRepository(Survey);
  const questionRepo = dataSource.getRepository(Question);

  console.log('🩺 Seeding Burden Pulse templates...');

  for (const role of ['RN', 'PCT'] as const) {
    const tpl = buildTemplate(role);

    const existing = await surveyRepo.findOne({ where: { title: tpl.title, isTemplate: true } });
    if (existing) {
      console.log(`   → Skipped (exists): ${tpl.title}`);
      continue;
    }

    const survey = surveyRepo.create({
      title:          tpl.title,
      description:    tpl.description,
      objective:      tpl.objective,
      type:           SurveyType.PULSE,
      status:         SurveyStatus.DRAFT,
      isAnonymous:    true,
      isTemplate:     true,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      targetScope:    TargetScope.SYSTEM,
      targetRoles:    tpl.targetRoles,
      tags:           ['burden-pulse', 'nursing'],
      questions:      tpl.questions.map((q) => questionRepo.create(q)),
    }) as unknown as Survey;

    const saved = await surveyRepo.save(survey) as unknown as Survey;
    console.log(`   ✓ Template created: "${saved.title}" (${tpl.questions.length} questions)`);
  }
  console.log(`   🎯 Burden buckets used: ${BUCKETS.join(', ')}`);
}
