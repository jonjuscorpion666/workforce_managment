// Derive Likert-scale labels from a question's helpText so the UI matches what
// the question actually asks (frequency vs agreement vs intensity, etc.) instead
// of always rendering "Strongly Disagree → Strongly Agree".

export type ScaleFamily =
  | 'AGREEMENT'
  | 'FREQUENCY'
  | 'INTENSITY'
  | 'PREDICTABILITY'
  | 'DISRUPTIVENESS';

const LABELS_5: Record<ScaleFamily, string[]> = {
  AGREEMENT:      ['Strongly Disagree', 'Disagree',       'Neutral',           'Agree',          'Strongly Agree'],
  FREQUENCY:      ['Never',             'Rarely',         'Sometimes',         'Often',          'Every shift'],
  INTENSITY:      ['Not at all',        'A little',       'Somewhat',          'Considerably',   'Constantly'],
  PREDICTABILITY: ['Very unpredictable','Mostly unpredictable','Neutral',      'Mostly predictable','Fully predictable'],
  DISRUPTIVENESS: ['Not disruptive',    'A little disruptive','Moderately disruptive','Very disruptive','Severely disruptive'],
};

export function detectFamily(helpText: string | null | undefined): ScaleFamily {
  if (!helpText) return 'AGREEMENT';
  const ht = helpText.toLowerCase();
  if (ht.includes('strongly disagree') || ht.includes('strongly agree')) return 'AGREEMENT';
  if (ht.includes('unpredictable')) return 'PREDICTABILITY';
  if (ht.includes('disruptive')) return 'DISRUPTIVENESS';
  if (ht.includes('never') && (ht.includes('every shift') || ht.includes('constantly') || ht.includes('always'))) return 'FREQUENCY';
  if (ht.includes('not at all')) return 'INTENSITY';
  return 'AGREEMENT';
}

// Pull a custom high-end label from helpText if the question overrides ours.
// e.g. helpText "1 = Never, 5 = Constantly" — when the detected family is
// FREQUENCY but the question uses "Constantly" instead of "Every shift",
// honour the question's wording for the last bucket.
function customHighEnd(helpText: string | null | undefined): string | null {
  if (!helpText) return null;
  const match = helpText.match(/5\s*=\s*([^.,]+?)(?:[.,]|$)/i);
  return match ? match[1].trim() : null;
}

function customLowEnd(helpText: string | null | undefined): string | null {
  if (!helpText) return null;
  const match = helpText.match(/1\s*=\s*([^,]+?),/i);
  return match ? match[1].trim() : null;
}

/**
 * Returns N (typically 5) scale labels derived from a question's helpText.
 * Defaults to AGREEMENT for backwards compatibility.
 */
export function getScaleLabels(helpText: string | null | undefined, max: number = 5): string[] {
  // Only Likert-5 has a curated family library. For other sizes return numbers.
  if (max !== 5) return Array.from({ length: max }, (_, i) => String(i + 1));

  const family = detectFamily(helpText);
  const labels = [...LABELS_5[family]];

  // Honour question-specific overrides on the endpoints if provided in helpText.
  const lo = customLowEnd(helpText);
  const hi = customHighEnd(helpText);
  if (lo) labels[0]      = lo;
  if (hi) labels[labels.length - 1] = hi;

  return labels;
}

/** Convenience: the matched 1 and 5 endpoint labels, used by compact renders. */
export function getScaleEndpoints(helpText: string | null | undefined): { low: string; high: string } {
  const labels = getScaleLabels(helpText, 5);
  return { low: labels[0], high: labels[labels.length - 1] };
}

/**
 * Decide whether to surface a follow-up textarea given a numeric answer + the
 * question's stored followUpThreshold. The comparison direction depends on the
 * scale family: burden-direction questions (FREQUENCY / INTENSITY /
 * DISRUPTIVENESS) fire when the answer is at or above the threshold (high
 * burden answers); engagement-direction questions (AGREEMENT / PREDICTABILITY)
 * fire when the answer is at or below the threshold (low / negative answers).
 *
 * This keeps legacy engagement surveys (MBI, Gallup Q12 etc.) working
 * unchanged while making the burden-pulse templates fire correctly.
 */
export function shouldShowFollowUp(
  value: number,
  threshold: number | null | undefined,
  helpText: string | null | undefined,
): boolean {
  if (threshold == null) return false;
  const family = detectFamily(helpText);
  const burdenDirection = family === 'FREQUENCY' || family === 'INTENSITY' || family === 'DISRUPTIVENESS';
  return burdenDirection ? value >= threshold : value <= threshold;
}
