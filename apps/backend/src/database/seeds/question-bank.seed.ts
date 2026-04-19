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
