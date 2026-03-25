'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

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
  isAnonymous: boolean;
  status: string;
  questions: Question[];
}

type AnswerValue = number | string | null;

function LikertScale({ question, value, onChange, max }: {
  question: Question;
  value: AnswerValue;
  onChange: (v: number) => void;
  max: number;
}) {
  const labels: Record<number, { first: string; last: string }> = {
    5:  { first: 'Strongly Disagree', last: 'Strongly Agree' },
    10: { first: 'Not at all',        last: 'Extremely' },
  };
  return (
    <div>
      <div className="flex gap-2 flex-wrap mt-3">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all
              ${value === n
                ? 'bg-blue-600 border-blue-600 text-white scale-110'
                : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'}`}
          >
            {n}
          </button>
        ))}
      </div>
      {labels[max] && (
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>{labels[max].first}</span>
          <span>{labels[max].last}</span>
        </div>
      )}
    </div>
  );
}

function NPSScale({ value, onChange }: { value: AnswerValue; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex gap-1 flex-wrap mt-3">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded border-2 text-sm font-semibold transition-all
              ${value === n
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-400">
        <span>0 — Not likely at all</span>
        <span>10 — Extremely likely</span>
      </div>
    </div>
  );
}

function QuestionCard({ question, value, onChange, index }: {
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  index: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="font-medium text-gray-900 leading-snug">
            {question.text}
            {question.isRequired && <span className="text-red-500 ml-1">*</span>}
          </p>
          {question.helpText && (
            <p className="text-sm text-gray-500 mt-1">{question.helpText}</p>
          )}

          <div className="mt-3">
            {question.type === 'LIKERT_5' && (
              <LikertScale question={question} value={value} onChange={onChange} max={5} />
            )}
            {question.type === 'LIKERT_10' && (
              <LikertScale question={question} value={value} onChange={onChange} max={10} />
            )}
            {question.type === 'NPS' && (
              <NPSScale value={value} onChange={onChange} />
            )}
            {question.type === 'RATING' && (
              <LikertScale question={question} value={value} onChange={onChange} max={5} />
            )}
            {question.type === 'YES_NO' && (
              <div className="flex gap-3 mt-3">
                {['Yes', 'No'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={`px-6 py-2 rounded-lg border-2 text-sm font-medium transition-all
                      ${value === opt
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-blue-400'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {question.type === 'MULTIPLE_CHOICE' && question.options && (
              <div className="flex flex-col gap-2 mt-3">
                {question.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={`text-left px-4 py-2.5 rounded-lg border-2 text-sm transition-all
                      ${value === opt
                        ? 'bg-blue-50 border-blue-500 text-blue-800 font-medium'
                        : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {question.type === 'OPEN_TEXT' && (
              <textarea
                className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                placeholder="Share your thoughts..."
                value={(value as string) || ''}
                onChange={(e) => onChange(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SurveyPage() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    api.get(`/surveys/${id}`)
      .then((r) => setSurvey(r.data))
      .catch(() => setError('Survey not found or no longer available.'))
      .finally(() => setLoading(false));
  }, [id]);

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setValidationError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate required questions
    const unanswered = survey!.questions
      .filter((q) => q.isRequired && (answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === ''))
      .map((q) => q.orderIndex + 1);

    if (unanswered.length > 0) {
      setValidationError(`Please answer required question(s): ${unanswered.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/responses/submit', {
        surveyId: id,
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value: typeof value === 'number' ? value : undefined,
          text: typeof value === 'string' ? value : undefined,
        })),
      });
      setSubmitted(true);
    } catch {
      setValidationError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading survey...</div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">{error || 'Survey not found.'}</p>
        </div>
      </div>
    );
  }

  if (survey.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center shadow-sm">
          <p className="text-xl font-semibold text-gray-700 mb-2">Survey Closed</p>
          <p className="text-gray-500 text-sm">This survey is no longer accepting responses.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-green-200 p-10 max-w-md text-center shadow-sm">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h2>
          <p className="text-gray-500 text-sm">Your response has been recorded{survey.isAnonymous ? ' anonymously' : ''}.</p>
        </div>
      </div>
    );
  }

  const answered = Object.values(answers).filter((v) => v !== null && v !== undefined && v !== '').length;
  const total = survey.questions.length;
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            {survey.isAnonymous && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Anonymous
              </span>
            )}
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {total} question{total !== 1 ? 's' : ''}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">{survey.description}</p>
          )}

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{answered} of {total} answered</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Questions */}
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

          {validationError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {validationError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {submitting ? 'Submitting...' : 'Submit Response'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Workforce Transformation Platform
        </p>
      </div>
    </div>
  );
}
