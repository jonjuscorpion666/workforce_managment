'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';

// ── Answer input components ────────────────────────────────────────────────────

function LikertScale({ value, onChange, max = 5 }: { value: number | null; onChange: (v: number) => void; max?: number }) {
  const labels: Record<number, { low: string; high: string }> = {
    5:  { low: 'Strongly Disagree', high: 'Strongly Agree' },
    10: { low: 'Not at all',        high: 'Extremely' },
  };
  const l = labels[max] ?? { low: '1', high: String(max) };
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-all ${
              value === n
                ? 'bg-blue-600 border-blue-600 text-white shadow'
                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
            }`}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{l.low}</span><span>{l.high}</span>
      </div>
    </div>
  );
}

function YesNo({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-3">
      {['Yes', 'No'].map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
            value === opt ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
          }`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function RatingStars({ value, onChange, max = 5 }: { value: number | null; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`text-2xl transition-all ${value !== null && n <= value ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}>
          ★
        </button>
      ))}
    </div>
  );
}

function MultipleChoice({ options, value, onChange }: { options: string[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
            value === opt ? 'bg-blue-50 border-blue-400 text-blue-800 font-medium' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-200'
          }`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SurveyRespondPage() {
  const { token } = useParams<{ token: string }>();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [followUps, setFollowUps] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  // Step 1: resolve token → programId + surveyId
  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useQuery({
    queryKey: ['resolve-token', token],
    queryFn: () => api.get(`/responses/resolve-token/${token}`).then((r) => r.data),
    retry: false,
  });

  // Step 2: fetch survey questions
  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: ['survey', tokenData?.surveyId],
    queryFn: () => api.get(`/surveys/${tokenData.surveyId}`).then((r) => r.data),
    enabled: !!tokenData?.surveyId,
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const formattedAnswers = questions.map((q: any) => ({
        questionId: q.id,
        value: answers[q.id] ?? null,
        text: followUps[q.id] ?? undefined,
      }));
      return api.post('/responses/submit', {
        surveyId:  tokenData.surveyId,
        programId: tokenData.programId,
        answers:   formattedAnswers,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  // ── Loading / error states ─────────────────────────────────────────────────
  if (tokenLoading || surveyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (tokenError || !tokenData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="font-bold text-gray-800">Link not found</h2>
          <p className="text-sm text-gray-500">This survey link is invalid or has expired. Please contact your manager for a new link.</p>
        </div>
      </div>
    );
  }

  if (survey?.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-amber-100 shadow-sm p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <h2 className="font-bold text-gray-800">Survey not available</h2>
          <p className="text-sm text-gray-500">
            This survey is currently <strong>{survey?.status?.toLowerCase()}</strong> and is not accepting responses.
          </p>
        </div>
      </div>
    );
  }

  // ── Submitted screen ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-green-100 shadow-sm p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800">Thank you!</h2>
          <p className="text-sm text-gray-500">
            Your response has been recorded{survey?.isAnonymous ? ' anonymously' : ''}. Your feedback helps us improve.
          </p>
          {tokenData?.programName && (
            <p className="text-xs text-gray-400 border-t pt-3">{tokenData.programName}</p>
          )}
        </div>
      </div>
    );
  }

  const questions = [...(survey?.questions ?? [])].sort((a: any, b: any) => a.orderIndex - b.orderIndex);
  const q = questions[currentQ] as any;
  const isLast = currentQ === questions.length - 1;
  const answerValue = answers[q?.id];
  const canAdvance = !q?.isRequired || answerValue != null;

  function setAnswer(qId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  function showFollowUp(q: any) {
    if (q.followUpThreshold == null) return false;
    const v = answers[q.id];
    return v != null && typeof v === 'number' && v <= q.followUpThreshold;
  }

  function handleNext() {
    if (!canAdvance) return;
    if (isLast) {
      submitMutation.mutate();
    } else {
      setCurrentQ((i) => i + 1);
    }
  }

  // ── Survey form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
        <p className="text-xs text-gray-400 text-center">{tokenData.programName}</p>
        <h1 className="text-base font-bold text-gray-900 text-center mt-0.5">{survey?.title}</h1>
        {survey?.isAnonymous && (
          <p className="text-[11px] text-green-600 text-center mt-1">Your response is anonymous</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 py-8 gap-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Question {currentQ + 1} of {questions.length}
          </p>
          <p className="text-lg font-semibold text-gray-900 leading-snug">{q?.text}</p>
          {q?.helpText && <p className="text-sm text-gray-400">{q.helpText}</p>}
        </div>

        <div>
          {q?.type === 'LIKERT_5'        && <LikertScale  value={answerValue ?? null} onChange={(v) => setAnswer(q.id, v)} max={5} />}
          {q?.type === 'LIKERT_10'       && <LikertScale  value={answerValue ?? null} onChange={(v) => setAnswer(q.id, v)} max={10} />}
          {q?.type === 'NPS'             && <LikertScale  value={answerValue ?? null} onChange={(v) => setAnswer(q.id, v)} max={10} />}
          {q?.type === 'RATING'          && <RatingStars  value={answerValue ?? null} onChange={(v) => setAnswer(q.id, v)} />}
          {q?.type === 'YES_NO'          && <YesNo        value={answerValue ?? null} onChange={(v) => setAnswer(q.id, v)} />}
          {q?.type === 'MULTIPLE_CHOICE' && <MultipleChoice options={q.options ?? []} value={answerValue ?? null} onChange={(v) => setAnswer(q.id, v)} />}
          {q?.type === 'OPEN_TEXT'       && (
            <textarea rows={4} placeholder="Share your thoughts…"
              value={answerValue ?? ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          )}

          {/* Follow-up prompt */}
          {showFollowUp(q) && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-orange-700 font-medium">{q.followUpPrompt || 'Can you tell us more?'}</p>
              <textarea rows={3} placeholder="Your answer…"
                value={followUps[q.id] ?? ''}
                onChange={(e) => setFollowUps((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="w-full border border-orange-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none bg-orange-50"
              />
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="mt-auto space-y-3">
          <button onClick={handleNext} disabled={!canAdvance || submitMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-colors">
            {submitMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              : isLast
                ? <><CheckCircle2 className="w-4 h-4" /> Submit Response</>
                : <>Next <ChevronRight className="w-4 h-4" /></>
            }
          </button>
          {currentQ > 0 && (
            <button onClick={() => setCurrentQ((i) => i - 1)} className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              ← Back
            </button>
          )}
          {!q?.isRequired && (
            <button onClick={handleNext} className="w-full px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              Skip this question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
