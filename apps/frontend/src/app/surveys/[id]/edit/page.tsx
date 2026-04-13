'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Plus, Trash2, GripVertical, ArrowLeft, Send, Save,
  ChevronDown, ChevronUp, Zap, Eye,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import SurveyPreviewModal from '@/components/surveys/SurveyPreviewModal';
import { useToast } from '@/components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionDraft {
  _id: string;
  id?: string;
  text: string;
  helpText: string;
  type: string;
  isRequired: boolean;
  options: string[];
  dimension?: string;
  source?: string;
  followUpThreshold?: number | null;
  followUpPrompt?: string;
}

const DIMENSIONS = [
  { value: 'ROLE_CLARITY',    label: 'Role Clarity',         group: 'Core' },
  { value: 'MANAGER_SUPPORT', label: 'Manager Support',      group: 'Core' },
  { value: 'RECOGNITION',     label: 'Recognition',          group: 'Core' },
  { value: 'GROWTH',          label: 'Growth & Development', group: 'Core' },
  { value: 'TEAM_COLLAB',     label: 'Team Collaboration',   group: 'Core' },
  { value: 'ENGAGEMENT',      label: 'Engagement & Energy',  group: 'Core' },
  { value: 'MEANINGFUL_WORK', label: 'Meaningful Work',      group: 'Core' },
  { value: 'STAFFING',        label: 'Staffing & Resources', group: 'Operational' },
  { value: 'SCHEDULING',      label: 'Scheduling',           group: 'Operational' },
  { value: 'WORKLOAD',        label: 'Workload',             group: 'Operational' },
  { value: 'COMMUNICATION',   label: 'Communication',        group: 'Operational' },
  { value: 'LEADERSHIP',      label: 'Leadership',           group: 'Operational' },
  { value: 'PATIENT_CARE',    label: 'Patient Care Quality', group: 'Operational' },
] as const;

const SOURCES = [
  { value: 'CUSTOM',     label: 'Custom' },
  { value: 'GALLUP_Q12', label: 'Gallup Q12' },
  { value: 'UWES',       label: 'UWES' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
] as const;

const ALL_QUESTION_TYPES = [
  { value: 'LIKERT_5',        label: 'Likert Scale (1–5)' },
  { value: 'LIKERT_10',       label: 'Likert Scale (1–10)' },
  { value: 'NPS',             label: 'NPS (0–10)' },
  { value: 'YES_NO',          label: 'Yes / No' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'OPEN_TEXT',       label: 'Open Text' },
  { value: 'RATING',          label: 'Rating (1–5)' },
] as const;

const DIRECTOR_QUESTION_TYPES = [
  { value: 'LIKERT_5',  label: 'Likert Scale (1–5)' },
  { value: 'YES_NO',    label: 'Yes / No' },
  { value: 'OPEN_TEXT', label: 'Open Text' },
  { value: 'RATING',    label: 'Rating (1–5)' },
] as const;

const DIRECTOR_MAX_QUESTIONS = 5;

function makeQuestion(): QuestionDraft {
  return {
    _id: Math.random().toString(36).slice(2),
    text: '', helpText: '', type: 'LIKERT_5', isRequired: true, options: [],
    dimension: '', source: 'CUSTOM', followUpThreshold: null, followUpPrompt: '',
  };
}

// ─── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  q, index, total, onChange, onRemove, onMoveUp, onMoveDown, allowedTypes,
}: {
  q: QuestionDraft; index: number; total: number;
  onChange: (u: QuestionDraft) => void;
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
  allowedTypes: readonly { value: string; label: string }[];
}) {
  const [optionInput, setOptionInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isNumeric = ['LIKERT_5', 'LIKERT_10', 'NPS', 'RATING'].includes(q.type);
  const maxThreshold = q.type === 'NPS' ? 6 : q.type === 'LIKERT_10' ? 5 : 3;
  const hasAdvancedConfig = !!(q.dimension || q.followUpThreshold != null);

  function addOption() {
    const val = optionInput.trim();
    if (!val) return;
    onChange({ ...q, options: [...q.options, val] });
    setOptionInput('');
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <GripVertical className="w-4 h-4 text-gray-300" />
        <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">Q{index + 1}</span>
        {q.dimension && (
          <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full hidden sm:inline">
            {DIMENSIONS.find((d) => d.value === q.dimension)?.label ?? q.dimension}
          </span>
        )}
        {q.followUpThreshold != null && (
          <span className="text-[10px] font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full hidden sm:inline">
            Follow-up ≤{q.followUpThreshold}
          </span>
        )}
        <div className="flex gap-1 ml-auto">
          <button onClick={onMoveUp}   disabled={index === 0}         className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronUp   className="w-4 h-4 text-gray-500" /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronDown className="w-4 h-4 text-gray-500" /></button>
          <button onClick={() => { if (window.confirm('Remove this question?')) onRemove(); }} className="p-1 rounded hover:bg-red-100 ml-1"><Trash2 className="w-4 h-4 text-red-400" /></button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <input className="input text-sm font-medium" placeholder="Question text *" value={q.text} onChange={(e) => onChange({ ...q, text: e.target.value })} />
        <input className="input text-sm text-gray-500" placeholder="Help text (optional)" value={q.helpText} onChange={(e) => onChange({ ...q, helpText: e.target.value })} />
        <div className="flex items-center gap-3 flex-wrap">
          <select className="input text-sm flex-1 min-w-[180px]" value={q.type} onChange={(e) => onChange({ ...q, type: e.target.value, options: [], followUpThreshold: null })}>
            {allowedTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={q.isRequired} onChange={(e) => onChange({ ...q, isRequired: e.target.checked })} className="w-4 h-4 accent-blue-600" />
            Required
          </label>
        </div>
        {q.type === 'MULTIPLE_CHOICE' && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Answer Options</p>
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">{opt}</span>
                <button onClick={() => onChange({ ...q, options: q.options.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input text-sm flex-1" placeholder="Add option..." value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())} />
              <button onClick={addOption} className="btn-secondary text-sm px-3">Add</button>
            </div>
          </div>
        )}

        {/* ── Advanced options ── */}
        <div className="border-t border-gray-100 pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Advanced options — dimension, source &amp; follow-up
            {hasAdvancedConfig && (
              <span className="ml-1 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">configured</span>
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-2 pb-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Dimension</label>
                  <select
                    className="input text-xs"
                    value={q.dimension || ''}
                    onChange={(e) => onChange({ ...q, dimension: e.target.value })}
                  >
                    <option value="">— None —</option>
                    <optgroup label="Core (Gallup/UWES)">
                      {DIMENSIONS.filter((d) => d.group === 'Core').map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Operational (Healthcare)">
                      {DIMENSIONS.filter((d) => d.group === 'Operational').map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
                  <select
                    className="input text-xs"
                    value={q.source || 'CUSTOM'}
                    onChange={(e) => onChange({ ...q, source: e.target.value })}
                  >
                    {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {isNumeric && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="accent-orange-500"
                      checked={q.followUpThreshold != null}
                      onChange={(e) => onChange({
                        ...q,
                        followUpThreshold: e.target.checked ? Math.min(2, maxThreshold) : null,
                        followUpPrompt: e.target.checked ? (q.followUpPrompt || '') : '',
                      })}
                    />
                    <span className="font-medium text-orange-700">Enable follow-up for low scores</span>
                  </label>
                  {q.followUpThreshold != null && (
                    <div className="pl-5 space-y-2 bg-orange-50 border border-orange-100 rounded-lg p-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Show follow-up when score ≤ <span className="text-orange-600 font-bold text-sm">{q.followUpThreshold}</span>
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={maxThreshold}
                          value={q.followUpThreshold}
                          onChange={(e) => onChange({ ...q, followUpThreshold: Number(e.target.value) })}
                          className="w-full accent-orange-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>1 (very low)</span><span>{maxThreshold}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up prompt</label>
                        <input
                          className="input text-xs"
                          placeholder="Tell us more about your experience..."
                          value={q.followUpPrompt || ''}
                          onChange={(e) => onChange({ ...q, followUpPrompt: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function EditSurveyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasRole } = useAuth();
  const toast = useToast();

  const isSVP      = hasRole('SVP') || hasRole('SUPER_ADMIN');
  const isDirector = hasRole('DIRECTOR');
  const questionTypes = isDirector ? DIRECTOR_QUESTION_TYPES : ALL_QUESTION_TYPES;
  const maxQuestions  = isDirector ? DIRECTOR_MAX_QUESTIONS : Infinity;

  // Form state
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective]     = useState('');
  const [type, setType]               = useState('PULSE');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [opensAt, setOpensAt]         = useState('');
  const [closesAt, setClosesAt]       = useState('');
  const [questions, setQuestions]     = useState<QuestionDraft[]>([makeQuestion()]);
  const [error, setError]             = useState('');
  const [loaded, setLoaded]           = useState(false);

  // Load existing survey
  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => api.get(`/surveys/${id}`).then((r) => r.data),
  });

  // Pre-fill form once survey loads
  useEffect(() => {
    if (!survey || loaded) return;
    setTitle(survey.title ?? '');
    setDescription(survey.description ?? '');
    setObjective(survey.objective ?? '');
    setType(survey.type ?? 'PULSE');
    setIsAnonymous(survey.isAnonymous ?? true);
    setOpensAt(survey.opensAt ? survey.opensAt.slice(0, 16) : '');
    setClosesAt(survey.closesAt ? survey.closesAt.slice(0, 16) : '');
    if (survey.questions?.length) {
      setQuestions(
        [...survey.questions]
          .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
          .map((q: any) => ({
            _id: Math.random().toString(36).slice(2),
            id: q.id,
            text: q.text ?? '',
            helpText: q.helpText ?? '',
            type: q.type ?? 'LIKERT_5',
            isRequired: q.isRequired ?? true,
            options: q.options ?? [],
            dimension: q.dimension ?? '',
            source: q.source ?? 'CUSTOM',
            followUpThreshold: q.followUpThreshold ?? null,
            followUpPrompt: q.followUpPrompt ?? '',
          }))
      );
    }
    setLoaded(true);
  }, [survey, loaded]);

  function updateQ(index: number, updated: QuestionDraft) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? updated : q)));
  }
  function removeQ(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }
  function moveQ(index: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const next = [...qs];
      const tmp = next[index]; next[index] = next[index + dir]; next[index + dir] = tmp;
      return next;
    });
  }
  function addQ() {
    if (questions.length >= maxQuestions) return;
    setQuestions((qs) => [...qs, makeQuestion()]);
  }

  function buildPayload() {
    return {
      title, description, objective, type, isAnonymous,
      opensAt:  opensAt  || undefined,
      closesAt: closesAt || undefined,
      questions: questions.map((q, i) => ({
        text: q.text, helpText: q.helpText, type: q.type,
        isRequired: q.isRequired, options: q.options, orderIndex: i,
        dimension: q.dimension || undefined,
        source: q.source || undefined,
        followUpThreshold: q.followUpThreshold ?? undefined,
        followUpPrompt: q.followUpPrompt || undefined,
      })),
    };
  }

  function validate() {
    if (!title.trim()) { setError('Title is required.'); return false; }
    if (questions.some((q) => !q.text.trim())) { setError('All questions must have text.'); return false; }
    setError('');
    return true;
  }

  const saveDraft = useMutation({
    mutationFn: (data: any) => api.patch(`/surveys/${id}`, data),
    onSuccess: () => { toast.success('Survey saved as draft'); router.push('/surveys'); },
    onError: () => toast.error('Failed to save survey'),
  });

  const saveAndPublish = useMutation({
    mutationFn: async (data: any) => {
      await api.patch(`/surveys/${id}`, data);
      await api.post(`/surveys/${id}/publish`);
    },
    onSuccess: () => { toast.success('Survey published'); router.push('/surveys'); },
    onError: () => toast.error('Failed to publish survey'),
  });

  const saveAndRequestApproval = useMutation({
    mutationFn: async (data: any) => {
      await api.patch(`/surveys/${id}`, data);
      await api.post(`/surveys/${id}/request-approval`);
    },
    onSuccess: () => { toast.success('Survey submitted for approval'); router.push('/surveys'); },
    onError: () => toast.error('Failed to submit survey for approval'),
  });

  const needsApproval = !isSVP;
  const isPending     = saveDraft.isPending || saveAndPublish.isPending || saveAndRequestApproval.isPending;
  const [showPreview, setShowPreview] = useState(false);
  const [pendingAction, setPendingAction] = useState<'publish' | 'approve' | null>(null);

  if (isLoading) return <div className="p-8 text-gray-400">Loading survey...</div>;
  if (survey?.status !== 'DRAFT') {
    return (
      <div className="max-w-xl mx-auto pt-16 text-center space-y-4">
        <p className="text-gray-600">This survey is <strong>{survey?.status}</strong> and cannot be edited.</p>
        <Link href="/surveys" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Surveys
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/surveys" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Survey</h1>
            <p className="text-gray-500 text-sm">Draft — make changes and save or publish</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={isPending}
            onClick={() => { if (validate()) saveDraft.mutate(buildPayload()); }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button
            disabled={isPending}
            onClick={() => {
              if (!validate()) return;
              setPendingAction(needsApproval ? 'approve' : 'publish');
              setShowPreview(true);
            }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Eye className="w-4 h-4" />
            {needsApproval ? 'Preview & Submit' : 'Preview & Publish'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      {/* Metadata */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Survey Details</h2>
        <input className="input" placeholder="Survey title *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input resize-none" rows={2} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <textarea className="input resize-none" rows={2} placeholder="Objective (optional)" value={objective} onChange={(e) => setObjective(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select className="input text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              {['PULSE','ANNUAL','ONBOARDING','EXIT','AD_HOC','VALIDATION'].map((t) => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase().replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none pb-2">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              Anonymous responses
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Opens At</label>
            <input className="input text-sm" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Closes At</label>
            <input className="input text-sm" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Questions <span className="text-gray-400 font-normal text-sm">({questions.length}{isDirector ? `/${DIRECTOR_MAX_QUESTIONS}` : ''})</span>
          </h2>
        </div>
        {questions.map((q, i) => (
          <QuestionCard
            key={q._id} q={q} index={i} total={questions.length}
            allowedTypes={questionTypes}
            onChange={(u) => updateQ(i, u)}
            onRemove={() => removeQ(i)}
            onMoveUp={() => moveQ(i, -1)}
            onMoveDown={() => moveQ(i, 1)}
          />
        ))}
        {questions.length < maxQuestions && (
          <button onClick={addQ} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Add Question
          </button>
        )}
      </div>

      {showPreview && (
        <SurveyPreviewModal
          title={title}
          description={description}
          objective={objective}
          type={type}
          isAnonymous={isAnonymous}
          questions={questions}
          onClose={() => setShowPreview(false)}
          confirmLabel={pendingAction === 'publish' ? 'Confirm & Publish' : 'Confirm & Submit for Approval'}
          confirmIcon={pendingAction === 'publish' ? 'publish' : 'submit'}
          isPending={isPending}
          onConfirm={() => {
            const payload = buildPayload();
            if (pendingAction === 'publish') saveAndPublish.mutate(payload);
            else saveAndRequestApproval.mutate(payload);
          }}
        />
      )}
    </div>
  );
}
