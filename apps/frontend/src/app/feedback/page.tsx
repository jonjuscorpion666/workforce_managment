'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { CheckCircle2, AlertTriangle, Heart, Loader2 } from 'lucide-react';

// Standalone client — this page is fully anonymous, so it must NOT use the
// admin api wrapper (which attaches tokens and redirects to /login on 401).
const pub = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

interface QuestionDef {
  id: string;
  text: string;
  type: 'YES_NO' | 'YES_NO_NA' | 'RATING' | 'TEXT';
}
interface Resolved {
  token: string;
  hospitalId: string;
  hospitalName: string;
  room: string;
  display: string; // "<Hospital> | Room <room>"
  form: { title: string; description: string; questions: QuestionDef[] };
}

const RATING_COLORS = [
  'bg-red-500 border-red-500',
  'bg-orange-400 border-orange-400',
  'bg-amber-400 border-amber-400',
  'bg-lime-500 border-lime-500',
  'bg-green-500 border-green-500',
];

function ChoiceButton({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`px-6 py-3 rounded-xl border-2 text-base font-semibold transition-all ${
        selected
          ? 'bg-blue-600 border-blue-600 text-white shadow'
          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400'
      }`}
    >
      {label}
    </button>
  );
}

function FeedbackInner() {
  const params = useSearchParams();
  const token = params.get('t') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Resolved | null>(null);

  const [consented, setConsented] = useState(false);
  const [locationOk, setLocationOk] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [result, setResult] = useState<{ severity: string; ticketNumber: string | null } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No feedback code found. Please scan the QR code at your bedside.');
      setLoading(false);
      return;
    }
    pub
      .get(`/patient-feedback/resolve/${encodeURIComponent(token)}`)
      .then((r) => setResolved(r.data))
      .catch((e) =>
        setError(
          e?.response?.data?.message ||
            'This feedback code is not active. Please ask a staff member for help.',
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const questions = resolved?.form.questions ?? [];
  const choiceQuestions = useMemo(
    () => questions.filter((q) => q.type === 'YES_NO' || q.type === 'YES_NO_NA' || q.type === 'RATING'),
    [questions],
  );

  const requiredYesNo = useMemo(
    () => questions.filter((q) => q.type === 'YES_NO' || q.type === 'YES_NO_NA'),
    [questions],
  );

  async function submit() {
    if (!resolved) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await pub.post('/patient-feedback/submit', {
        token: resolved.token,
        answers,
        comment: comment.trim() || undefined,
        rating: answers['rating'] ?? undefined,
        locationMismatch: locationOk === false,
      });
      setResult({ severity: data.severity, ticketNumber: data.ticketNumber });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function trySubmit() {
    const firstMissing = requiredYesNo.find((q) => answers[q.id] === undefined);
    if (firstMissing) {
      setHighlightId(firstMissing.id);
      setError('Please answer the highlighted question before submitting.');
      const el = document.getElementById(`q-${firstMissing.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setHighlightId(null);
    submit();
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Centered>
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </Centered>
    );
  }

  if (error && !resolved) {
    return (
      <Centered>
        <div className="bg-white rounded-2xl border border-amber-200 p-6 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-700">{error}</p>
        </div>
      </Centered>
    );
  }

  if (result) {
    const isAttended = result.severity === 'RED';
    return (
      <Centered>
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center max-w-md">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Thank you</h2>
          <p className="text-gray-600 mt-2">
            Your feedback about nursing care has been received.
          </p>
          {result.severity !== 'GREEN' && (
            <p className="mt-3 text-sm text-blue-700 bg-blue-50 rounded-xl px-4 py-3">
              {isAttended
                ? 'A nursing supervisor has been alerted and will follow up with this location promptly.'
                : 'Our nursing team will review your feedback and follow up if needed.'}
            </p>
          )}
        </div>
      </Centered>
    );
  }

  if (!resolved) return null;

  // ── Privacy & data-retention notice (gate before the survey) ──────────────
  if (!consented) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-gray-900">Privacy &amp; Data Notice</span>
          </div>

          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <p>
              This short survey asks about the quality of nursing care at your bedside. Your
              participation is <strong>completely voluntary</strong> and your answers are{' '}
              <strong>anonymous</strong>.
            </p>
            <p>
              We do <strong>not</strong> ask for your name, contact details, or any medical
              information. Please don&apos;t include personal or identifying details in the comment
              box. The location shown comes only from the QR code you scanned.
            </p>
            <p>
              Your responses are used solely to monitor and improve nursing care. This survey is{' '}
              <strong>not part of your medical record</strong> and choosing not to respond will{' '}
              <strong>never affect your care or treatment</strong>.
            </p>
            <p>
              Any identifiable information you might enter (for example, in the comment box) will be{' '}
              <strong>deleted or de-identified within 7 days</strong>, unless retention is required
              by law or hospital policy. Aggregated, non-identifiable results may be kept to track
              care quality over time.
            </p>
            <p className="text-gray-500">
              Questions or concerns? Please contact the hospital&apos;s Patient Relations office.
            </p>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            By clicking &ldquo;Start Survey,&rdquo; you acknowledge that you have read this notice
            and understand how your survey responses will be used and retained.
          </p>

          <button
            type="button"
            onClick={() => setConsented(true)}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3.5 text-base font-semibold shadow-sm"
          >
            Start Survey
          </button>
        </div>
      </div>
    );
  }

  // ── Opening location-confirm screen ───────────────────────────────────────
  if (locationOk === null) {
    return (
      <Centered>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 max-w-md w-full">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-gray-900">{resolved.form.title}</span>
          </div>
          <p className="text-sm text-gray-500">You are submitting feedback for:</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{resolved.display}</p>
          <p className="text-base text-gray-700 mt-5 font-medium">Is this location correct?</p>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => setLocationOk(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3.5 text-base font-semibold shadow-sm"
            >
              Yes, this is correct
            </button>
            <button
              type="button"
              onClick={() => setLocationOk(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              No — I’m at a different location
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-5">{resolved.form.description}</p>
        </div>
      </Centered>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-lg font-bold text-gray-900">{resolved.form.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {resolved.display}
          {locationOk === false && (
            <span className="ml-2 text-amber-600 font-medium">(location marked as incorrect)</span>
          )}
        </p>

        {/* Progress */}
        <div className="mt-4" aria-hidden="true">
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${
                  requiredYesNo.length
                    ? (requiredYesNo.filter((q) => answers[q.id] !== undefined).length /
                        requiredYesNo.length) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {requiredYesNo.filter((q) => answers[q.id] !== undefined).length} of{' '}
            {requiredYesNo.length} answered
          </p>
        </div>

        <div className="mt-6 space-y-7">
          {choiceQuestions.map((q) => {
            const missing = highlightId === q.id && answers[q.id] === undefined;
            return (
            <div
              key={q.id}
              id={`q-${q.id}`}
              role="group"
              aria-label={q.text}
              className={
                missing
                  ? 'rounded-xl ring-2 ring-red-400 bg-red-50/60 p-3 -m-3 scroll-mt-24'
                  : 'scroll-mt-24'
              }
            >
              <p className="text-base font-medium text-gray-800">{q.text}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {q.type === 'RATING' ? (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`Rate ${n} of 5`}
                        aria-pressed={answers[q.id] === n}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                        className={`w-12 h-12 rounded-full border-2 text-base font-semibold transition-all ${
                          answers[q.id] === n
                            ? `${RATING_COLORS[n - 1]} text-white scale-110`
                            : 'border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : (
                  (q.type === 'YES_NO_NA'
                    ? ['Yes', 'No', 'Not applicable']
                    : ['Yes', 'No']
                  ).map((opt) => (
                    <ChoiceButton
                      key={opt}
                      label={opt}
                      selected={answers[q.id] === opt}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    />
                  ))
                )}
              </div>
            </div>
            );
          })}

          <div>
            <p className="text-base font-medium text-gray-800">
              Anything else you would like to share? (optional)
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your comment"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-500 leading-relaxed">
          By submitting this survey, you acknowledge that you have read the privacy and data
          retention notice and understand that identifiable survey data will be deleted or
          de-identified within 7 days, unless retention is required by law or hospital policy.
        </p>

        <button
          type="button"
          disabled={submitting}
          onClick={trySubmit}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-3.5 text-base font-semibold shadow-sm"
        >
          {submitting ? 'Submitting…' : 'Submit feedback'}
        </button>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4">{children}</div>;
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<Centered><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></Centered>}>
      <FeedbackInner />
    </Suspense>
  );
}
