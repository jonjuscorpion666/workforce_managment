import { FeedbackSeverity } from './entities/patient-feedback.entity';

export type FeedbackQuestionType = 'YES_NO' | 'YES_NO_NA' | 'RATING' | 'TEXT' | 'SMILEY';

// Smiley answer values (3-point scale). Stored verbatim in answers[].
export type SmileyAnswer = 'HAPPY' | 'OKAY' | 'UNHAPPY';

export interface FeedbackQuestionDef {
  id: string;
  text: string;
  type: FeedbackQuestionType;
  /** The answer value that counts as a negative experience (YES_NO questions). */
  negativeIf?: 'Yes' | 'No';
  /** The answer value that should force an immediate (RED) escalation. */
  escalateIf?: 'Yes' | 'No';
  /** An UNHAPPY smiley (or negative answer) here is a critical/RED signal. */
  critical?: boolean;
}

/**
 * The fixed Inpatient Nursing Care feedback form. Deliberately tiny: four
 * 3-smiley questions (🙂 Happy / 😐 Okay / 🙁 Unhappy) plus an optional comment,
 * so a patient who may be unwell can answer in seconds without reading scales.
 * Order is the display order.
 */
export const FEEDBACK_QUESTIONS: FeedbackQuestionDef[] = [
  { id: 'pain',        text: 'How well is your pain being managed?', type: 'SMILEY', critical: true },
  { id: 'food',        text: 'How happy are you with your meals?',   type: 'SMILEY' },
  { id: 'cleanliness', text: 'How clean is your room and bathroom?', type: 'SMILEY' },
  { id: 'overall',     text: 'Overall, how is your care so far?',    type: 'SMILEY' },
  { id: 'comment',     text: 'Anything else you would like to tell us? (optional)', type: 'TEXT' },
];

export const FEEDBACK_FORM_META = {
  title: 'Inpatient Nursing Care Feedback',
  description:
    'Tap a face for each question — there are no wrong answers. You do not need to enter your name, room number, or patient ID. Your location is captured automatically through the QR code to help us improve care and respond quickly when needed.',
};

export interface ClassificationResult {
  severity: FeedbackSeverity;
  reasons: string[];
}

/**
 * Green / Yellow / Red / Critical triage for the 3-smiley form.
 *
 *  CRITICAL — 🙁 on pain (clinically time-sensitive) OR 3+ 🙁 answers.
 *  RED      — any 🙁 (the patient is unhappy with at least one area).
 *  YELLOW   — any 😐, none 🙁.
 *  GREEN    — all 🙂.
 *
 * Legacy YES_NO / RATING answers are still understood so old submissions
 * classify sensibly, but the live form is smiley-only.
 */
export function classifyFeedback(
  answers: Record<string, string | number | undefined>,
  rating?: number | null,
): ClassificationResult {
  const reasons: string[] = [];
  let unhappy = 0;
  let neutral = 0;
  let painUnhappy = false;
  let red = false; // legacy escalation paths

  for (const q of FEEDBACK_QUESTIONS) {
    const a = answers[q.id];
    if (a === undefined || a === null || a === '') continue;

    if (q.type === 'SMILEY') {
      if (a === 'UNHAPPY') {
        unhappy += 1;
        if (q.critical) painUnhappy = true;
        reasons.push(`Unhappy: ${q.text}`);
      } else if (a === 'OKAY') {
        neutral += 1;
      }
      continue;
    }

    // ── Legacy answer shapes (kept for old submissions) ───────────────────
    if (q.escalateIf && a === q.escalateIf) { red = true; reasons.push(`Flagged: ${q.text}`); }
    if (q.negativeIf && a === q.negativeIf) {
      unhappy += 1;
      if (q.critical) painUnhappy = true;
      reasons.push(`Negative: ${q.text}`);
    }
  }
  const r = rating ?? null;
  if (r !== null && r <= 2) { red = true; reasons.push(`Low overall rating (${r}/5)`); }

  if (painUnhappy || unhappy >= 3) {
    reasons.push('Escalated to CRITICAL — pain concern or multiple unhappy answers');
    return { severity: FeedbackSeverity.CRITICAL, reasons };
  }
  if (unhappy >= 1 || red) {
    return { severity: FeedbackSeverity.RED, reasons };
  }
  if (neutral >= 1 || r === 3) {
    if (r === 3 && neutral === 0) reasons.push('Neutral overall rating (3/5)');
    return { severity: FeedbackSeverity.YELLOW, reasons };
  }
  return { severity: FeedbackSeverity.GREEN, reasons: [] };
}

/** SLA target hours by severity (design §14). */
export const SLA_HOURS: Record<FeedbackSeverity, number> = {
  [FeedbackSeverity.GREEN]: 0,
  [FeedbackSeverity.YELLOW]: 48,
  [FeedbackSeverity.RED]: 8,
  [FeedbackSeverity.CRITICAL]: 2,
};
