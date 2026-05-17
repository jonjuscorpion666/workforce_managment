import { FeedbackSeverity } from './entities/patient-feedback.entity';

export type FeedbackQuestionType = 'YES_NO' | 'YES_NO_NA' | 'RATING' | 'TEXT';

export interface FeedbackQuestionDef {
  id: string;
  text: string;
  type: FeedbackQuestionType;
  /** The answer value that counts as a negative experience. */
  negativeIf?: 'Yes' | 'No';
  /** The answer value that should force an immediate (RED) escalation. */
  escalateIf?: 'Yes' | 'No';
  /** Negative answer on this question is treated as a critical/RED signal. */
  critical?: boolean;
}

/**
 * The fixed Inpatient Nursing Care feedback form. Kept short (< 1 minute).
 * Order is the display order.
 */
export const FEEDBACK_QUESTIONS: FeedbackQuestionDef[] = [
  { id: 'satisfied',          text: 'Are you satisfied with nursing care?',          type: 'YES_NO',    negativeIf: 'No' },
  { id: 'responded',          text: 'Did nurses respond when you called?',           type: 'YES_NO',    negativeIf: 'No' },
  { id: 'medication_on_time', text: 'Was medicine given on time?',                   type: 'YES_NO_NA', negativeIf: 'No', critical: true },
  { id: 'respectful',         text: 'Were nurses respectful and polite?',            type: 'YES_NO',    negativeIf: 'No', critical: true },
  { id: 'explained',          text: 'Did nurses explain your care clearly?',         type: 'YES_NO',    negativeIf: 'No' },
  { id: 'urgent_issue',       text: 'Is there any urgent issue right now?',          type: 'YES_NO',    escalateIf: 'Yes' },
  { id: 'wants_contact',      text: 'Do you want someone to contact you?',           type: 'YES_NO',    escalateIf: 'Yes' },
  { id: 'rating',             text: 'Rate nursing care overall (optional)',          type: 'RATING' },
  { id: 'comment',            text: 'Anything else you would like to share? (optional)', type: 'TEXT' },
];

export const FEEDBACK_FORM_META = {
  title: 'Inpatient Nursing Care Feedback',
  description:
    'Please share your feedback about nursing care. You do not need to enter your name, room number, or patient ID. Your location is captured automatically through the QR code to help us improve care and respond quickly when needed.',
};

export interface ClassificationResult {
  severity: FeedbackSeverity;
  reasons: string[];
}

/**
 * Green / Yellow / Red triage logic (design §6).
 *
 *  RED    — urgent issue, contact requested, medication delay, rude behaviour,
 *           ≥3 negative answers, or rating ≤ 2.
 *  YELLOW — 1–2 negative answers or a neutral (3) rating, nothing urgent.
 *  GREEN  — everything positive, nothing urgent, no contact requested.
 */
export function classifyFeedback(
  answers: Record<string, string | number | undefined>,
  rating?: number | null,
): ClassificationResult {
  const reasons: string[] = [];
  let negatives = 0;
  let red = false;

  for (const q of FEEDBACK_QUESTIONS) {
    const a = answers[q.id];
    if (a === undefined || a === null || a === '') continue;

    if (q.escalateIf && a === q.escalateIf) {
      red = true;
      reasons.push(q.id === 'urgent_issue' ? 'Urgent issue reported' : 'Patient requested contact');
    }
    if (q.negativeIf && a === q.negativeIf) {
      negatives += 1;
      if (q.critical) {
        red = true;
        reasons.push(
          q.id === 'medication_on_time' ? 'Medication not given on time' : 'Respect/politeness concern',
        );
      } else {
        reasons.push(`Negative: ${q.text}`);
      }
    }
  }

  const r = rating ?? null;
  if (r !== null && r <= 2) {
    red = true;
    reasons.push(`Low overall rating (${r}/5)`);
  }

  if (red || negatives >= 3) {
    return { severity: FeedbackSeverity.RED, reasons };
  }
  if (negatives >= 1 || r === 3) {
    if (r === 3 && negatives === 0) reasons.push('Neutral overall rating (3/5)');
    return { severity: FeedbackSeverity.YELLOW, reasons };
  }
  return { severity: FeedbackSeverity.GREEN, reasons: [] };
}

/** SLA target hours by severity (design §14). */
export const SLA_HOURS: Record<FeedbackSeverity, number> = {
  [FeedbackSeverity.GREEN]: 0,
  [FeedbackSeverity.YELLOW]: 48,
  [FeedbackSeverity.RED]: 8,
};
