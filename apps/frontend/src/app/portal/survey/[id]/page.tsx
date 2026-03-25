'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useNurseAuth } from '@/lib/nurse-auth';

interface Question {
  id: string;
  text: string;
  helpText?: string;
  type: string;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  questions: Question[];
}

type AnswerValue = number | string | null;

// ─── Question input components ────────────────────────────────────────────────

function LikertRow({ max, value, onChange }: { max: number; value: AnswerValue; onChange: (v: number) => void }) {
  const ends = max === 5
    ? { first: 'Strongly Disagree', last: 'Strongly Agree' }
    : { first: 'Not at all', last: 'Extremely' };
  return (
    <div className="mt-3">
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all
              ${value === n ? 'bg-blue-600 border-blue-600 text-white scale-110' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-400">
        <span>{ends.first}</span><span>{ends.last}</span>
      </div>
    </div>
  );
}

function NPSRow({ value, onChange }: { value: AnswerValue; onChange: (v: number) => void }) {
  return (
    <div className="mt-3">
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-9 h-9 rounded border-2 text-sm font-semibold transition-all
              ${value === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-400">
        <span>0 — Not likely</span><span>10 — Extremely likely</span>
      </div>
    </div>
  );
}

function QuestionCard({ question, index, value, onChange }: {
  question: Question; index: number; value: AnswerValue; onChange: (v: AnswerValue) => void;
}) {
  return (
    <div className={`bg-white rounded-xl border-2 transition-colors p-5
      ${value !== null && value !== undefined && value !== '' ? 'border-blue-200' : 'border-gray-200'}`}>
      <div className="flex gap-3">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
          ${value !== null && value !== undefined && value !== '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {value !== null && value !== undefined && value !== '' ? '✓' : index + 1}
        </span>
        <div className="flex-1">
          <p className="font-medium text-gray-900">
            {question.text}
            {question.isRequired && <span className="text-red-400 ml-1">*</span>}
          </p>
          {question.helpText && <p className="text-sm text-gray-400 mt-1">{question.helpText}</p>}

          {(question.type === 'LIKERT_5' || question.type === 'RATING') && (
            <LikertRow max={5} value={value} onChange={onChange} />
          )}
          {question.type === 'LIKERT_10' && (
            <LikertRow max={10} value={value} onChange={onChange} />
          )}
          {question.type === 'NPS' && (
            <NPSRow value={value} onChange={onChange} />
          )}
          {question.type === 'YES_NO' && (
            <div className="flex gap-3 mt-3">
              {['Yes', 'No'].map((opt) => (
                <button key={opt} type="button" onClick={() => onChange(opt)}
                  className={`px-6 py-2 rounded-lg border-2 text-sm font-medium transition-all
                    ${value === opt ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-700 hover:border-blue-400'}`}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {question.type === 'MULTIPLE_CHOICE' && question.options && (
            <div className="flex flex-col gap-2 mt-3">
              <p className="text-xs text-gray-400 mb-1">Select all that apply</p>
              {question.options.map((opt) => {
                const selected: string[] = Array.isArray(value) ? (value as any) : [];
                const checked = selected.includes(opt);
                const toggle = () => {
                  const next = checked ? selected.filter((v) => v !== opt) : [...selected, opt];
                  onChange(next as any);
                };
                return (
                  <label key={opt} onClick={toggle}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 text-sm cursor-pointer transition-all select-none
                      ${checked ? 'bg-blue-50 border-blue-500 text-blue-800 font-medium' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}>
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                      ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                      {checked && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>}
                    </span>
                    {opt}
                  </label>
                );
              })}
            </div>
          )}
          {question.type === 'OPEN_TEXT' && (
            <textarea
              className="w-full mt-3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 bg-gray-50"
              placeholder="Type your response here..."
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function NurseSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { nurse, isAuthenticated, accessToken } = useNurseAuth();

  const [survey, setSurvey]       = useState<Survey | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [answers, setAnswers]     = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validErr, setValidErr]   = useState('');

  // Guard
  useEffect(() => {
    if (!isAuthenticated) router.replace('/portal/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (accessToken) localStorage.setItem('access_token', accessToken);
  }, [accessToken]);

  useEffect(() => {
    api.get(`/surveys/${id}`)
      .then((r) => setSurvey(r.data))
      .catch(() => setError('Survey not found or no longer available.'))
      .finally(() => setLoading(false));
  }, [id]);

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setValidErr('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = survey!.questions
      .filter((q) => q.isRequired && (answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === ''))
      .map((_, i) => i + 1);

    if (missing.length > 0) {
      setValidErr(`Please answer required question(s): ${missing.join(', ')}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/responses/submit', {
        surveyId: id,
        isAnonymous: true,          // always anonymous from nurse portal
        respondentId: null,         // never stored
        orgUnitId: nurse?.orgUnit?.id,
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value: typeof value === 'number' ? value : Array.isArray(value) ? value : undefined,
          text: typeof value === 'string' ? value : undefined,
        })),
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setValidErr('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) return null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading survey...</p>
    </div>
  );

  if (error || !survey) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
        <p className="text-red-600 font-medium">{error || 'Survey not found.'}</p>
        <Link href="/portal" className="text-blue-600 text-sm mt-4 inline-block">← Back to portal</Link>
      </div>
    </div>
  );

  const answered  = Object.values(answers).filter((v) => Array.isArray(v) ? (v as any[]).length > 0 : (v !== null && v !== undefined && v !== '')).length;
  const total     = survey.questions.length;
  const progress  = total > 0 ? Math.round((answered / total) * 100) : 0;

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Response Submitted!</h2>
        <p className="text-gray-500 text-sm mb-1">
          Your feedback has been recorded <span className="font-semibold text-green-700">anonymously</span>.
        </p>
        <p className="text-gray-400 text-xs mb-6">Your name was never attached to these answers.</p>
        <Link href="/portal"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
          Back to Portal
        </Link>
      </div>
    </div>
  );

  return (
    <div className="pb-16">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/portal" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{survey.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{answered}/{total}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Anonymous
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Survey description */}
        {survey.description && (
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">{survey.description}</p>
        )}

        {validErr && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
            {validErr}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {survey.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              value={answers[q.id] ?? null}
              onChange={(v) => setAnswer(q.id, v)}
            />
          ))}

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
            >
              {submitting ? 'Submitting anonymously...' : 'Submit Anonymous Response'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Your name will not be stored with this submission.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
