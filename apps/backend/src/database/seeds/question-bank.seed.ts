import { DataSource } from 'typeorm';
import { QuestionBankItem, QuestionCategory, QuestionFramework } from '../../modules/question-bank/entities/question-bank-item.entity';

const QUESTIONS: Partial<QuestionBankItem>[] = [

  // ── Maslach Burnout Inventory (MBI) ────────────────────────────────────────
  {
    text: 'I feel emotionally drained by my work.',
    type: 'LIKERT_5', category: QuestionCategory.BURNOUT, framework: QuestionFramework.MBI,
    helpText: '1 = Never, 5 = Every day', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What is contributing most to this feeling?',
  },
  {
    text: 'I feel used up at the end of a shift.',
    type: 'LIKERT_5', category: QuestionCategory.BURNOUT, framework: QuestionFramework.MBI,
    helpText: '1 = Never, 5 = Every day', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'Can you describe what drives this feeling?',
  },
  {
    text: 'I feel fatigued when I get up in the morning and have to face another shift.',
    type: 'LIKERT_5', category: QuestionCategory.BURNOUT, framework: QuestionFramework.MBI,
    helpText: '1 = Never, 5 = Every day', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What would help you feel more rested?',
  },
  {
    text: 'I have become less interested in my work since I started this job.',
    type: 'LIKERT_5', category: QuestionCategory.BURNOUT, framework: QuestionFramework.MBI,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 3, followUpPrompt: 'What has changed for you over time?',
  },
  {
    text: 'I have become less enthusiastic about my work.',
    type: 'LIKERT_5', category: QuestionCategory.BURNOUT, framework: QuestionFramework.MBI,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 3, followUpPrompt: 'What would reignite your enthusiasm?',
  },
  {
    text: 'I feel burned out from my work.',
    type: 'LIKERT_5', category: QuestionCategory.BURNOUT, framework: QuestionFramework.MBI,
    helpText: '1 = Never, 5 = Every day', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What support would make the biggest difference right now?',
  },

  // ── Utrecht Work Engagement Scale (UWES) ───────────────────────────────────
  {
    text: 'At my work, I feel bursting with energy.',
    type: 'LIKERT_5', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.UWES,
    helpText: '1 = Never, 5 = Always', isValidated: true,
  },
  {
    text: 'I am enthusiastic about my job.',
    type: 'LIKERT_5', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.UWES,
    helpText: '1 = Never, 5 = Always', isValidated: true,
  },
  {
    text: 'I feel proud of the work I do.',
    type: 'LIKERT_5', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.UWES,
    helpText: '1 = Never, 5 = Always', isValidated: true,
  },
  {
    text: 'My job inspires me.',
    type: 'LIKERT_5', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.UWES,
    helpText: '1 = Never, 5 = Always', isValidated: true,
  },
  {
    text: 'I get carried away by my work in a positive way.',
    type: 'LIKERT_5', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.UWES,
    helpText: '1 = Never, 5 = Always', isValidated: true,
  },
  {
    text: 'When I am working, I forget everything else around me.',
    type: 'LIKERT_5', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.UWES,
    helpText: '1 = Never, 5 = Always', isValidated: true,
  },

  // ── Gallup Q12 ─────────────────────────────────────────────────────────────
  {
    text: 'I know what is expected of me at work.',
    type: 'LIKERT_5', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
  },
  {
    text: 'I have the materials and equipment I need to do my work right.',
    type: 'LIKERT_5', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What resources are you missing?',
  },
  {
    text: 'At work, I have the opportunity to do what I do best every day.',
    type: 'LIKERT_5', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
  },
  {
    text: 'In the last 7 days, I have received recognition or praise for doing good work.',
    type: 'LIKERT_5', category: QuestionCategory.RECOGNITION, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What type of recognition would be most meaningful to you?',
  },
  {
    text: 'My supervisor or someone at work seems to care about me as a person.',
    type: 'LIKERT_5', category: QuestionCategory.LEADERSHIP, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What would make you feel more supported?',
  },
  {
    text: 'There is someone at work who encourages my development.',
    type: 'LIKERT_5', category: QuestionCategory.GROWTH, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
  },
  {
    text: 'At work, my opinions seem to count.',
    type: 'LIKERT_5', category: QuestionCategory.COMMUNICATION, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What would make you feel more heard?',
  },
  {
    text: 'My associates or fellow employees are committed to doing quality work.',
    type: 'LIKERT_5', category: QuestionCategory.TEAMWORK, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
  },
  {
    text: 'In the last six months, someone at work has talked to me about my progress.',
    type: 'LIKERT_5', category: QuestionCategory.GROWTH, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
  },
  {
    text: 'This last year, I have had opportunities at work to learn and grow.',
    type: 'LIKERT_5', category: QuestionCategory.GROWTH, framework: QuestionFramework.GALLUP_Q12,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
  },

  // ── Healthcare-specific ────────────────────────────────────────────────────
  {
    text: 'My patient-to-nurse ratio allows me to provide safe, high-quality care.',
    type: 'LIKERT_5', category: QuestionCategory.WORKLOAD, framework: QuestionFramework.HEALTHCARE,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What staffing level would feel safe to you?',
  },
  {
    text: 'I feel supported when I raise patient safety concerns.',
    type: 'LIKERT_5', category: QuestionCategory.SAFETY, framework: QuestionFramework.HEALTHCARE,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'Can you describe a time when you felt your concern was not taken seriously?',
  },
  {
    text: 'Communication between nursing staff and physicians is effective on my unit.',
    type: 'LIKERT_5', category: QuestionCategory.COMMUNICATION, framework: QuestionFramework.HEALTHCARE,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What would improve communication on your unit?',
  },
  {
    text: 'I have adequate time to complete documentation without working overtime.',
    type: 'LIKERT_5', category: QuestionCategory.WORKLOAD, framework: QuestionFramework.HEALTHCARE,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What is the biggest documentation burden for you?',
  },
  {
    text: 'I feel physically safe at work (free from violence or threat of harm).',
    type: 'LIKERT_5', category: QuestionCategory.SAFETY, framework: QuestionFramework.HEALTHCARE,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What concerns do you have about your physical safety?',
  },
  {
    text: 'My schedule allows me adequate rest between shifts.',
    type: 'LIKERT_5', category: QuestionCategory.WELLBEING, framework: QuestionFramework.HEALTHCARE,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: true,
    followUpThreshold: 2, followUpPrompt: 'What scheduling change would help most?',
  },
  {
    text: 'How likely are you to recommend this organisation as a great place to work?',
    type: 'NPS', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.HEALTHCARE,
    helpText: '0 = Not at all likely, 10 = Extremely likely', isValidated: true,
    followUpThreshold: 6, followUpPrompt: 'What is the main reason for your score?',
  },

  // ── Wellbeing ──────────────────────────────────────────────────────────────
  {
    text: 'I have access to adequate mental health and wellbeing resources.',
    type: 'LIKERT_5', category: QuestionCategory.WELLBEING, framework: QuestionFramework.HEALTHCARE,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: false,
    followUpThreshold: 2, followUpPrompt: 'What wellbeing support is missing for you?',
  },
  {
    text: 'I feel comfortable taking breaks during my shift.',
    type: 'LIKERT_5', category: QuestionCategory.WELLBEING, framework: QuestionFramework.HEALTHCARE,
    helpText: '1 = Strongly disagree, 5 = Strongly agree', isValidated: false,
  },

  // ── Open text ─────────────────────────────────────────────────────────────
  {
    text: 'What is the single most important change leadership could make to improve your experience at work?',
    type: 'OPEN_TEXT', category: QuestionCategory.GENERAL, framework: QuestionFramework.CUSTOM,
    isValidated: false,
  },
  {
    text: 'What do you value most about working here that you would not want to change?',
    type: 'OPEN_TEXT', category: QuestionCategory.ENGAGEMENT, framework: QuestionFramework.CUSTOM,
    isValidated: false,
  },
  {
    text: 'Is there anything else you would like to share with leadership?',
    type: 'OPEN_TEXT', category: QuestionCategory.GENERAL, framework: QuestionFramework.CUSTOM,
    isValidated: false,
  },

  // ── Burden Pulse — WASTE (duplication, rework, unnecessary documentation) ──
  {
    text: 'How often does duplicated documentation slow you down during a shift?',
    type: 'LIKERT_5', category: QuestionCategory.WASTE, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'Which documentation feels redundant? Be specific (form name / time of day).',
  },
  {
    text: 'How often do you redo work because of unclear handoffs or miscommunication?',
    type: 'LIKERT_5', category: QuestionCategory.WASTE, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'Describe a recent example.',
  },
  {
    text: 'How much do non-clinical administrative tasks drain time from patient care?',
    type: 'LIKERT_5', category: QuestionCategory.WASTE, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Not at all, 5 = Constantly', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'Which task, if removed, would give you back the most time?',
  },

  // ── Burden Pulse — FRICTION (supplies, interruptions, broken workflows) ────
  {
    text: 'How often do supply hunts or missing equipment delay your work?',
    type: 'LIKERT_5', category: QuestionCategory.FRICTION, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'Which supplies / where in the unit?',
  },
  {
    text: 'How often do interruptions break your concentration on patient care?',
    type: 'LIKERT_5', category: QuestionCategory.FRICTION, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Constantly', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What kinds of interruptions are most common?',
  },
  {
    text: 'How often do broken workflows or poor teamwork slow you down?',
    type: 'LIKERT_5', category: QuestionCategory.FRICTION, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'Which workflow or which team interaction?',
  },

  // ── Burden Pulse — UNPREDICTABILITY (schedule, floating, admit/discharge) ──
  {
    text: 'How often is your schedule unpredictable?',
    type: 'LIKERT_5', category: QuestionCategory.UNPREDICTABILITY, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every week', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What aspect of scheduling feels most unpredictable?',
  },
  {
    text: 'How disruptive is daily floating or last-minute reassignment?',
    type: 'LIKERT_5', category: QuestionCategory.UNPREDICTABILITY, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Not disruptive, 5 = Severely disruptive', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What would make floating less disruptive?',
  },
  {
    text: 'How often does admission/discharge timing add chaos to your shift?',
    type: 'LIKERT_5', category: QuestionCategory.UNPREDICTABILITY, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What time of day / which patient flow is hardest?',
  },
  {
    text: 'How often does tight staffing make your shift harder rather than getting handled smoothly?',
    type: 'LIKERT_5', category: QuestionCategory.UNPREDICTABILITY, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What specifically makes tight-staffing days worse?',
  },
  {
    text: 'How often do staffing or assignment rules feel disconnected from the reality of your shift?',
    type: 'LIKERT_5', category: QuestionCategory.UNPREDICTABILITY, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'Which rule, specifically?',
  },

  // ── Burden Pulse — ROLE DRIFT (doing others\' work, unclear delegation) ────
  {
    text: 'How often do you do work that does not feel like your role?',
    type: 'LIKERT_5', category: QuestionCategory.ROLE_DRIFT, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What tasks feel outside your role?',
  },
  {
    text: 'How often do unclear delegation lines cause confusion or rework?',
    type: 'LIKERT_5', category: QuestionCategory.ROLE_DRIFT, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'Where does the confusion typically arise?',
  },
  {
    text: 'How often do you feel pulled in too many directions at once?',
    type: 'LIKERT_5', category: QuestionCategory.ROLE_DRIFT, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Constantly', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'When during the shift does this happen most?',
  },

  // ── Burden Pulse — EMOTIONAL TAX (fear, second-guessing, escalation) ──────
  {
    text: 'How often do you feel mentally exhausted before the end of your shift?',
    type: 'LIKERT_5', category: QuestionCategory.EMOTIONAL_TAX, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What is contributing most to this exhaustion?',
  },
  {
    text: 'How often do you feel anxious or second-guess decisions during your shift?',
    type: 'LIKERT_5', category: QuestionCategory.EMOTIONAL_TAX, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Constantly', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What kind of decisions cause the most anxiety?',
  },
  {
    text: 'How often does work feel unfair compared to other units or shifts?',
    type: 'LIKERT_5', category: QuestionCategory.EMOTIONAL_TAX, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Constantly', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What feels unfair, specifically?',
  },
  {
    text: 'How often do you feel blamed for things outside your control?',
    type: 'LIKERT_5', category: QuestionCategory.EMOTIONAL_TAX, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What kinds of things, and by whom?',
  },
  {
    text: 'How often do you find yourself thinking about calling off or leaving your shift early?',
    type: 'LIKERT_5', category: QuestionCategory.EMOTIONAL_TAX, framework: QuestionFramework.CUSTOM,
    helpText: '1 = Never, 5 = Every shift', isValidated: false,
    followUpThreshold: 4, followUpPrompt: 'What pushes you toward that thought most?',
  },

  // ── Burden Pulse — Closing prompts (One-Thing Test + prioritization filter) ─
  {
    text: 'Of the burdens you flagged, which one is happening most often?',
    type: 'OPEN_TEXT', category: QuestionCategory.GENERAL, framework: QuestionFramework.CUSTOM,
    helpText: 'One sentence is fine.', isValidated: false,
  },
  {
    text: 'Is the burden you most want fixed within unit / leadership control?',
    type: 'YES_NO', category: QuestionCategory.GENERAL, framework: QuestionFramework.CUSTOM,
    isValidated: false,
  },
  {
    text: 'Would removing this burden make tomorrow\'s shift noticeably easier?',
    type: 'YES_NO', category: QuestionCategory.GENERAL, framework: QuestionFramework.CUSTOM,
    isValidated: false,
  },
  {
    text: 'If leadership fixed ONE thing in the next 30 days, what should it be? Be specific — name the task, the time of day, or the workflow.',
    type: 'OPEN_TEXT', category: QuestionCategory.GENERAL, framework: QuestionFramework.CUSTOM,
    isValidated: false,
  },
  {
    text: 'Would you be willing to join a 30-minute burden-removal session?',
    type: 'YES_NO', category: QuestionCategory.GENERAL, framework: QuestionFramework.CUSTOM,
    isValidated: false,
  },
];

export async function seedQuestionBank(dataSource: DataSource) {
  const repo = dataSource.getRepository(QuestionBankItem);

  console.log('🧠 Seeding question bank...');
  let added = 0;

  for (const q of QUESTIONS) {
    const exists = await repo.findOne({ where: { text: q.text } });
    if (exists) { console.log(`   → Skipped (exists): ${q.text?.slice(0, 60)}…`); continue; }
    await repo.save(repo.create(q));
    added++;
  }

  console.log(`   ✅ ${added} questions added (${QUESTIONS.length - added} skipped as duplicates)`);
}
