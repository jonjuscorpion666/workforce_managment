'use client';

import { X, Eye, CheckCircle2, Send, Zap } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Question {
  _id?: string;
  text: string;
  helpText?: string;
  type: string;
  isRequired?: boolean;
  options?: string[];
}

interface SurveyPreviewModalProps {
  title: string;
  description?: string;
  objective?: string;
  type?: string;
  isAnonymous?: boolean;
  questions: Question[];
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmIcon?: 'publish' | 'submit';
  isPending?: boolean;
  /** When true, the confirm button is not disabled for empty question lists (e.g. approval flow) */
  allowEmptyConfirm?: boolean;
}

function QuestionPreview({ q, index }: { q: Question; index: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-start gap-2">
        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {q.text || <span className="text-gray-400 italic">No question text</span>}
            {q.isRequired && <span className="text-red-500 ml-1">*</span>}
          </p>
          {q.helpText && <p className="text-xs text-gray-400 mt-0.5">{q.helpText}</p>}
        </div>
      </div>

      <div className="ml-8">
        {(q.type === 'LIKERT_5' || q.type === 'RATING') && (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                <input type="radio" name={`q-${index}`} disabled className="accent-blue-600" />
                <span className="text-xs text-gray-500">{n}</span>
              </label>
            ))}
            <span className="text-xs text-gray-400 ml-2">Strongly disagree → Strongly agree</span>
          </div>
        )}
        {q.type === 'LIKERT_10' && (
          <div className="flex items-center gap-2 flex-wrap">
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                <input type="radio" name={`q-${index}`} disabled className="accent-blue-600" />
                <span className="text-xs text-gray-500">{n}</span>
              </label>
            ))}
          </div>
        )}
        {q.type === 'NPS' && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 flex-wrap">
              {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input type="radio" name={`q-${index}`} disabled className="accent-blue-600" />
                  <span className="text-xs text-gray-500">{n}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Not at all likely</span><span>Extremely likely</span>
            </div>
          </div>
        )}
        {q.type === 'YES_NO' && (
          <div className="flex gap-4">
            {['Yes', 'No'].map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="radio" name={`q-${index}`} disabled className="accent-blue-600" />
                {opt}
              </label>
            ))}
          </div>
        )}
        {q.type === 'MULTIPLE_CHOICE' && (
          <div className="space-y-2">
            {(q.options ?? []).length === 0
              ? <p className="text-xs text-amber-600 italic">No options added yet</p>
              : (q.options ?? []).map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="checkbox" disabled className="accent-blue-600" />
                    {opt}
                  </label>
                ))
            }
          </div>
        )}
        {q.type === 'OPEN_TEXT' && (
          <textarea
            disabled rows={3}
            placeholder="Staff will type their answer here..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-400 resize-none"
          />
        )}
      </div>
    </div>
  );
}

export default function SurveyPreviewModal({
  title, description, objective, type, isAnonymous,
  questions, onClose, onConfirm, confirmLabel, confirmIcon = 'publish', isPending, allowEmptyConfirm = false,
}: SurveyPreviewModalProps) {
  useEscapeKey(onClose);
  const safeQuestions = questions ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl h-full bg-gray-50 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Survey Preview</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Staff view</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Survey header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {type && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium uppercase">
                  {type}
                </span>
              )}
              {isAnonymous && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Anonymous
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title || 'Untitled Survey'}</h2>
            {description && <p className="text-sm text-gray-600">{description}</p>}
            {objective && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-700">
                <strong>Objective:</strong> {objective}
              </div>
            )}
            <p className="text-xs text-gray-400">{safeQuestions.length} question{safeQuestions.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Questions */}
          {safeQuestions.map((q, i) => (
            <QuestionPreview key={q._id ?? i} q={q} index={i} />
          ))}

          {safeQuestions.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No questions added yet.</div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm">
            Back to Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending || (!allowEmptyConfirm && safeQuestions.length === 0) || !title.trim()}
            className={`btn-primary flex items-center gap-2 text-sm ${
              confirmIcon === 'publish'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {confirmIcon === 'publish'
              ? <Zap className="w-4 h-4" />
              : <Send className="w-4 h-4" />
            }
            {isPending ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
