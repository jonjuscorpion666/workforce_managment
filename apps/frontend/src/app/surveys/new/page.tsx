'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Plus, Trash2, GripVertical, ArrowLeft, Send, Save,
  ChevronDown, ChevronUp, Globe, Building2, LayoutGrid,
  ShieldCheck, Target, Info, AlertTriangle, Clock, Lock,
  Users, MessageSquare, Zap, BookmarkPlus, Eye,
} from 'lucide-react';
import SurveyPreviewModal from '@/components/surveys/SurveyPreviewModal';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

const ALL_QUESTION_TYPES = [
  { value: 'LIKERT_5',        label: 'Likert Scale (1–5)' },
  { value: 'LIKERT_10',       label: 'Likert Scale (1–10)' },
  { value: 'NPS',             label: 'NPS (0–10)' },
  { value: 'YES_NO',          label: 'Yes / No' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'OPEN_TEXT',       label: 'Open Text' },
  { value: 'RATING',          label: 'Rating (1–5)' },
] as const;

// Director can only use simple, pre-defined question types — no NPS, no branching
const DIRECTOR_QUESTION_TYPES = [
  { value: 'LIKERT_5', label: 'Likert Scale (1–5)' },
  { value: 'YES_NO',   label: 'Yes / No' },
  { value: 'OPEN_TEXT',label: 'Open Text' },
  { value: 'RATING',   label: 'Rating (1–5)' },
] as const;

// ─── Dimension & Source constants ─────────────────────────────────────────────

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

const ALL_SURVEY_TYPES = [
  { value: 'PULSE',       label: 'Pulse' },
  { value: 'ANNUAL',      label: 'Annual' },
  { value: 'ONBOARDING',  label: 'Onboarding' },
  { value: 'EXIT',        label: 'Exit' },
  { value: 'AD_HOC',      label: 'Ad-Hoc' },
  { value: 'VALIDATION',  label: 'Validation' },
] as const;

// Directors are restricted to pulse surveys only
const DIRECTOR_MAX_QUESTIONS = 5;

type TargetScope = 'SYSTEM' | 'HOSPITAL' | 'UNIT';

interface OrgUnit {
  id: string;
  name: string;
  code: string;
  level: string;
  location: string;
}

interface QuestionDraft {
  _id: string;
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

function makeQuestion(defaultType = 'LIKERT_5'): QuestionDraft {
  return {
    _id: Math.random().toString(36).slice(2),
    text: '',
    helpText: '',
    type: defaultType,
    isRequired: true,
    options: [],
    dimension: '',
    source: 'CUSTOM',
    followUpThreshold: null,
    followUpPrompt: '',
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
        {q.source && q.source !== 'CUSTOM' && (
          <span className="text-[10px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full hidden sm:inline">
            {q.source}
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

        {/* ── Advanced options (dimension, source, follow-up) ── */}
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
                    <span className="text-gray-400 font-normal">(Option C deep-dive)</span>
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

// ─── Scope option button ───────────────────────────────────────────────────────

function ScopeOption({
  value, current, icon: Icon, label, description, disabled, onClick,
}: {
  value: TargetScope; current: TargetScope; icon: React.ElementType;
  label: string; description: string; disabled?: boolean; onClick: () => void;
}) {
  const active = value === current;
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`flex-1 flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left
        ${disabled ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' :
          active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
    >
      <div className="flex items-center gap-2 w-full">
        <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : disabled ? 'text-gray-300' : 'text-gray-400'}`} />
        <span className={`text-sm font-semibold ${active ? 'text-blue-700' : disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
        {disabled && <Lock className="w-3 h-3 text-gray-300 ml-auto" />}
        {active && !disabled && <span className="ml-auto w-2 h-2 rounded-full bg-blue-600" />}
      </div>
      <p className={`text-xs ${active ? 'text-blue-500' : 'text-gray-400'}`}>{description}</p>
    </button>
  );
}

// ─── No-Access screen (Manager / Staff) ───────────────────────────────────────

function NoAccessScreen({ role }: { role: 'MANAGER' | 'STAFF' | 'unknown' }) {
  const isManager = role === 'MANAGER';
  return (
    <div className="max-w-lg mx-auto pt-16 text-center space-y-6">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
        <Lock className="w-8 h-8 text-gray-400" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Survey Creation Not Available</h1>
        <p className="text-gray-500 text-sm mt-2">
          {isManager
            ? 'Managers are not recommended to create surveys directly — this helps maintain data consistency and avoids survey fatigue across teams.'
            : 'Staff members respond to surveys and submit feedback, but do not create surveys.'}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-left space-y-3">
        <p className="text-sm font-semibold text-blue-800">
          {isManager ? 'What you can do instead:' : 'How you participate:'}
        </p>
        <ul className="space-y-2">
          {isManager ? (
            <>
              <li className="flex items-start gap-2 text-sm text-blue-700">
                <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Request a survey</strong> — submit a request to your CNO or SVP describing the issue you want to surface</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-blue-700">
                <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Provide input</strong> — contribute questions or objectives when your CNO is building a hospital-level survey</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-blue-700">
                <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Act on results</strong> — access your department's survey results and drive action plans</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-2 text-sm text-blue-700">
                <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Respond to surveys</strong> — complete surveys shared with your team or hospital unit</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-blue-700">
                <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Submit feedback</strong> — use the Speak Up feature to raise concerns anonymously</span>
              </li>
            </>
          )}
        </ul>
      </div>

      <div className="flex gap-3 justify-center">
        <Link href="/surveys" className="btn-secondary text-sm flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Surveys
        </Link>
        {isManager && (
          <Link href="/speakup" className="btn-primary text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Submit a Request
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function NewSurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('from') || '/surveys';
  const { user, hasRole } = useAuth();
  const toast = useToast();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isSVP       = hasRole('SVP') || hasRole('SUPER_ADMIN');
  const isCNO       = hasRole('CNO');
  const isDirector  = hasRole('DIRECTOR');
  const isManager   = hasRole('MANAGER');
  const isStaff     = hasRole('STAFF');
  const userOrgUnit = user?.orgUnit ?? null;

  // Block Manager and Staff from creating surveys (only after mount to avoid hydration mismatch)
  if (mounted && isManager) return <NoAccessScreen role="MANAGER" />;
  if (mounted && isStaff)   return <NoAccessScreen role="STAFF" />;

  const questionTypes  = isDirector ? DIRECTOR_QUESTION_TYPES : ALL_QUESTION_TYPES;
  const surveyTypes    = isDirector ? [{ value: 'PULSE', label: 'Pulse' }] : ALL_SURVEY_TYPES;
  const maxQuestions   = isDirector ? DIRECTOR_MAX_QUESTIONS : Infinity;

  // Survey metadata
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective]     = useState('');
  const [type, setType]               = useState<string>('PULSE');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [opensAt, setOpensAt]         = useState('');
  const [closesAt, setClosesAt]       = useState('');

  // Targeting scope — Director locked to UNIT, CNO locked to HOSPITAL
  const defaultScope: TargetScope = isDirector ? 'UNIT' : isCNO ? 'HOSPITAL' : 'SYSTEM';
  const [targetScope, setTargetScope]             = useState<TargetScope>(defaultScope);
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);

  // Focus group
  const [isFocusGroup, setIsFocusGroup]           = useState(false);
  const [focusGroupUserIds, setFocusGroupUserIds]  = useState<string[]>([]);

  const [questions, setQuestions]     = useState<QuestionDraft[]>([makeQuestion()]);
  const [error, setError]             = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiSelected, setAiSelected]   = useState<Set<number>>(new Set());
  const [aiStep, setAiStep]           = useState<'pick'|'review'>('pick');

  // Program linking
  const [linkedProgramId, setLinkedProgramId] = useState('');
  const [aiProgramId, setAiProgramId]         = useState('');

  function applyProgram(programId: string) {
    setLinkedProgramId(programId);
    setAiProgramId(programId);
    const p = (programs as any[]).find((x: any) => x.id === programId);
    if (!p) return;
    if (p.objective)        setObjective(p.objective);
    if (p.problemStatement) setDescription(p.problemStatement);
    if (!title && p.name)   setTitle(p.name);
  }

  // Fetch all org units for targeting
  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/org/units').then((r) => r.data),
  });
  const hospitals = orgUnits.filter((u) => u.level === 'HOSPITAL');

  // Fetch users for focus group picker
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users', { params: { limit: 500 } }).then((r) => r.data.data),
    enabled: isFocusGroup,
  });

  // Fetch programs for AI generation context picker
  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ['programs-list'],
    queryFn: () => api.get('/programs').then((r) => r.data),
  });

  // Pre-fill program from ?programId= query param (e.g. "Create new & link" from program-flow)
  useEffect(() => {
    const pid = searchParams.get('programId');
    if (pid && (programs as any[]).length > 0 && !linkedProgramId) {
      applyProgram(pid);
    }
  }, [searchParams, (programs as any[]).length]); // eslint-disable-line react-hooks/exhaustive-deps

  const aiGenerateMutation = useMutation({
    mutationFn: (programId: string) => api.post('/surveys/ai-generate', { programId }).then(r => r.data),
    onSuccess: (data) => {
      setAiSuggestions(data.questions ?? []);
      setAiSelected(new Set((data.questions ?? []).map((_: any, i: number) => i)));
      setAiStep('review');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'AI generation failed'),
  });

  // Pre-select CNO's own hospital once org units load
  useEffect(() => {
    if (isCNO && userOrgUnit && hospitals.length > 0 && selectedHospitals.length === 0) {
      const own = hospitals.find((h) => h.id === userOrgUnit.id);
      if (own) setSelectedHospitals([own.id]);
    }
  }, [isCNO, userOrgUnit, hospitals.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-set Director's own department as the target unit
  useEffect(() => {
    if (isDirector && userOrgUnit && selectedHospitals.length === 0) {
      setSelectedHospitals([userOrgUnit.id]);
    }
  }, [isDirector, userOrgUnit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [appliedTemplateName, setAppliedTemplateName] = useState('');

  // Fetch templates
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['survey-templates'],
    queryFn: () => api.get('/surveys/templates').then((r) => r.data),
  });

  function applyTemplate(t: any) {
    setTitle(t.title);
    setDescription(t.description ?? '');
    setObjective(t.objective ?? '');
    setType(t.type);
    setIsAnonymous(t.isAnonymous);
    if (!isDirector && !isCNO && t.targetScope) setTargetScope(t.targetScope as TargetScope);
    if (t.focusGroupUserIds?.length) { setIsFocusGroup(true); setFocusGroupUserIds(t.focusGroupUserIds); }
    const qs = (t.questions ?? [])
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
      .map((q: any) => ({
        _id: Math.random().toString(36).slice(2),
        text: q.text, helpText: q.helpText ?? '',
        type: q.type, isRequired: q.isRequired, options: q.options ?? [],
        dimension: q.dimension ?? '',
        source: q.source ?? 'CUSTOM',
        followUpThreshold: q.followUpThreshold ?? null,
        followUpPrompt: q.followUpPrompt ?? '',
      }));
    setQuestions(isDirector ? qs.slice(0, DIRECTOR_MAX_QUESTIONS) : qs.length ? qs : [makeQuestion()]);
    setAppliedTemplateName(t.title);
    setShowTemplatePicker(false);
  }

  // Fetch governance config
  const { data: governance } = useQuery<{
    requiresSvpApproval: boolean;
    mustUseTemplate: boolean;
    directorRequiresApproval: boolean;
  }>({
    queryKey: ['governance'],
    queryFn: () => api.get('/surveys/governance').then((r) => r.data),
  });

  const cnoNeedsApproval      = isCNO      && (governance?.requiresSvpApproval      ?? true);
  const directorNeedsApproval = isDirector && (governance?.directorRequiresApproval ?? true);
  const needsApproval         = cnoNeedsApproval || directorNeedsApproval;

  function toggleHospital(id: string) {
    if (isCNO || isDirector) return;
    setSelectedHospitals((prev) => prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]);
  }

  // ── helpers ──
  async function linkProgramIfSelected(surveyId: string) {
    if (linkedProgramId) {
      await api.patch(`/programs/${linkedProgramId}/survey`, { surveyId });
    }
  }

  // ── mutations ──
  const saveDraft = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/surveys', data);
      await linkProgramIfSelected(res.data.id);
      return res.data;
    },
    onSuccess: () => { toast.success('Survey saved as draft'); router.push(fromUrl); },
    onError: () => toast.error('Failed to save survey'),
  });

  const saveAndRequestApproval = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/surveys', data);
      await api.post(`/surveys/${res.data.id}/request-approval`);
      await linkProgramIfSelected(res.data.id);
      return res.data;
    },
    onSuccess: () => { toast.success('Survey submitted for approval'); router.push(fromUrl); },
    onError: () => toast.error('Failed to submit survey for approval'),
  });

  const saveAndPublish = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/surveys', data);
      await api.post(`/surveys/${res.data.id}/publish`);
      await linkProgramIfSelected(res.data.id);
      return res.data;
    },
    onSuccess: () => { toast.success('Survey published'); router.push(fromUrl); },
    onError: () => toast.error('Failed to publish survey'),
  });

  function buildPayload() {
    return {
      title, description, objective, type, isAnonymous,
      opensAt:  opensAt  || undefined,
      closesAt: closesAt || undefined,
      targetScope,
      targetOrgUnitIds: targetScope === 'SYSTEM' ? [] : selectedHospitals,
      focusGroupUserIds: isFocusGroup && focusGroupUserIds.length ? focusGroupUserIds : [],
      questions: questions.map((q, i) => ({
        text: q.text, helpText: q.helpText || undefined,
        type: q.type, isRequired: q.isRequired,
        options: q.options.length ? q.options : undefined,
        orderIndex: i,
        dimension: q.dimension || undefined,
        source: q.source || undefined,
        followUpThreshold: q.followUpThreshold ?? undefined,
        followUpPrompt: q.followUpPrompt || undefined,
      })),
    };
  }

  function validate() {
    if (!title.trim())              { setError('Survey title is required.'); return false; }
    if ((isCNO || isDirector) && !objective.trim()) {
      setError('Objective is required — it helps reviewers evaluate your request.'); return false;
    }
    if (targetScope === 'HOSPITAL' && selectedHospitals.length === 0 && !isCNO) {
      setError('Select at least one hospital to target.'); return false;
    }
    if (isDirector && questions.length > DIRECTOR_MAX_QUESTIONS) {
      setError(`Directors can submit up to ${DIRECTOR_MAX_QUESTIONS} questions per survey.`); return false;
    }
    if (questions.length === 0)     { setError('Add at least one question.'); return false; }
    const blank = questions.findIndex((q) => !q.text.trim());
    if (blank !== -1)               { setError(`Question ${blank + 1} is missing text.`); return false; }
    return true;
  }

  const [showPreview, setShowPreview] = useState(false);
  const [pendingAction, setPendingAction] = useState<'publish' | 'approve' | null>(null);

  function handleDraft()   { if (!validate()) return; setError(''); saveDraft.mutate(buildPayload()); }
  function handleApproval(){ if (!validate()) return; setError(''); setPendingAction('approve'); setShowPreview(true); }
  function handlePublish() { if (!validate()) return; setError(''); setPendingAction('publish'); setShowPreview(true); }

  function addQuestion() {
    if (questions.length >= maxQuestions) return;
    setQuestions((p) => [...p, makeQuestion()]);
  }
  function updateQuestion(i: number, u: QuestionDraft) { setQuestions((p) => p.map((q, idx) => idx === i ? u : q)); }
  function removeQuestion(i: number) { setQuestions((p) => p.filter((_, idx) => idx !== i)); }
  function moveUp(i: number) {
    if (i === 0) return;
    setQuestions((p) => { const n = [...p]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; });
  }
  function moveDown(i: number) {
    if (i === questions.length - 1) return;
    setQuestions((p) => { const n = [...p]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; });
  }

  const isBusy = saveDraft.isPending || saveAndRequestApproval.isPending || saveAndPublish.isPending;
  const atQuestionLimit = questions.length >= maxQuestions;

  const targetSummary = isFocusGroup && focusGroupUserIds.length > 0
    ? `Focus group · ${focusGroupUserIds.length} person${focusGroupUserIds.length !== 1 ? 's' : ''}`
    : isFocusGroup
      ? 'Focus group (no members yet)'
      : targetScope === 'SYSTEM'
        ? 'All Franciscan Health hospitals'
        : selectedHospitals.length > 0
          ? `${selectedHospitals.length} hospital${selectedHospitals.length > 1 ? 's' : ''} selected`
          : targetScope === 'UNIT'
            ? 'Your department'
            : 'No target selected';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={fromUrl} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">New Survey</h1>
          <p className="text-gray-500 text-sm mt-0.5" suppressHydrationWarning>
            {!mounted ? '' : isDirector
              ? `Department pulse survey — ${userOrgUnit?.name ?? 'Your department'}`
              : isCNO
                ? `Hospital-level survey — ${userOrgUnit?.name ?? 'Your hospital'}`
                : 'Build, target, and launch across the organisation'}
          </p>
        </div>
        {mounted && isSVP && (
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Full Authority
          </div>
        )}
        {mounted && isCNO && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <Building2 className="w-3.5 h-3.5" /> Hospital CNO
          </div>
        )}
        {mounted && isDirector && (
          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5" /> Director
          </div>
        )}
      </div>

      {/* Template picker */}
      {templates.length > 0 && (
        <div className="border border-violet-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTemplatePicker((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 hover:bg-violet-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-800">Start from a Template</span>
              {appliedTemplateName && (
                <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                  Using: {appliedTemplateName}
                </span>
              )}
              <span className="text-xs text-violet-500 font-normal">{templates.length} available</span>
            </div>
            {showTemplatePicker
              ? <ChevronDown className="w-4 h-4 text-violet-400" />
              : <ChevronDown className="w-4 h-4 text-violet-400 -rotate-90" />
            }
          </button>

          {showTemplatePicker && (
            <div className="p-4 bg-white border-t border-violet-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((t: any) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="text-left p-3 rounded-lg border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all group"
                  >
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-violet-700 leading-snug">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400">{t.type}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{(t.questions ?? []).length} question{(t.questions ?? []).length !== 1 ? 's' : ''}</span>
                      {t.isAnonymous && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400">Anonymous</span>
                        </>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.description}</p>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Selecting a template pre-fills the form — you can edit everything before saving.</p>
            </div>
          )}
        </div>
      )}

      {/* Director governance notice */}
      {isDirector && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-800">Director — Governed Access</p>
              <p className="text-xs text-purple-600 mt-0.5">
                You can create department-level pulse surveys only. To avoid survey fatigue, surveys are
                capped at {DIRECTOR_MAX_QUESTIONS} questions, restricted to simple question types, and
                require approval before going live.
              </p>
            </div>
          </div>
          <ul className="pl-8 space-y-1">
            {[
              `Max ${DIRECTOR_MAX_QUESTIONS} questions per survey`,
              'Pulse surveys only — no annual, exit, or onboarding types',
              'Simple question types only (no NPS or branching logic)',
              'Department / unit scope only — cannot target other hospitals',
              directorNeedsApproval ? 'Requires CNO or SVP approval before launch' : 'Auto-approved — launches immediately',
            ].map((rule) => (
              <li key={rule} className="text-xs text-purple-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />{rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CNO missing orgUnit warning */}
      {isCNO && !userOrgUnit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Hospital not assigned to your account</p>
            <p className="text-xs text-red-600 mt-0.5">
              Ask your System Admin to re-run the database seed so your account is linked to your hospital.
              You can still draft a survey but targeting will default to your hospital once assigned.
            </p>
          </div>
        </div>
      )}

      {/* Approval notice (CNO or Director) */}
      {needsApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {isDirector ? 'CNO / SVP Approval Required' : 'SVP Approval Required'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {isDirector
                ? 'Your survey will be reviewed by your CNO (or SVP) before it reaches your team. This helps prevent survey fatigue.'
                : "Your survey will be submitted to the SVP for review before it can go live. You'll be notified once it's approved or if changes are requested."}
            </p>
          </div>
        </div>
      )}

      {/* CNO scope restriction notice */}
      {isCNO && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            As a CNO, your surveys are scoped to your hospital and its units only.
            System-wide surveys are created by the SVP. Your survey cannot override or replace active system-wide surveys.
          </p>
        </div>
      )}

      {/* ── Survey Details ────────────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Survey Details</h2>

        {/* Program picker */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-semibold text-blue-800">Link to Program <span className="font-normal text-blue-500">(optional)</span></p>
          </div>
          <select
            value={linkedProgramId}
            onChange={(e) => applyProgram(e.target.value)}
            className="w-full border border-blue-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Select a program to auto-fill details…</option>
            {(programs as any[]).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {linkedProgramId && (() => {
            const p = (programs as any[]).find((x: any) => x.id === linkedProgramId);
            return p ? (
              <div className="grid grid-cols-1 gap-1.5 text-xs text-blue-800">
                {p.objective        && <p><span className="font-semibold">Objective:</span> {p.objective}</p>}
                {p.problemStatement && <p><span className="font-semibold">Problem:</span> {p.problemStatement}</p>}
                {p.successCriteria  && <p><span className="font-semibold">Expected Result:</span> {p.successCriteria}</p>}
              </div>
            ) : null;
          })()}
          {linkedProgramId && (
            <p className="text-[10px] text-blue-500">Survey will be linked to this program when saved. Objective and problem have been auto-filled below.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
          <input className="input" placeholder="e.g. ICU Team Pulse — March" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input resize-none h-20 text-sm" placeholder="Brief description shown to respondents..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
            <Target className="w-4 h-4 text-gray-400" />
            Objective {(isCNO || isDirector) && <span className="text-red-500">*</span>}
          </label>
          <textarea
            className="input resize-none h-20 text-sm"
            placeholder={
              isDirector
                ? 'Describe the team issue — e.g. Understand overtime causes in Night Shift ICU team...'
                : isCNO
                  ? 'Describe the local issue this survey addresses — e.g. Identify root causes of ICU overtime in March...'
                  : 'What is this survey trying to achieve? e.g. Identify top drivers of nurse turnover...'}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {(isCNO || isDirector) ? 'Required — helps reviewers evaluate your request' : 'Internal use only — not shown to respondents'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Survey Type</label>
            {isDirector ? (
              <div className="input text-sm bg-gray-50 text-gray-500 flex items-center gap-2 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" /> Pulse (Directors only)
              </div>
            ) : (
              <select className="input text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                {surveyTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center gap-3 pt-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span>Anonymous responses</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opens At</label>
            <input type="datetime-local" className="input text-sm" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closes At</label>
            <input type="datetime-local" className="input text-sm" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Targeting ─────────────────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Target Audience</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{targetSummary}</span>
        </div>

        <div className="flex gap-3">
          <ScopeOption
            value="SYSTEM" current={targetScope}
            icon={Globe} label="System-Wide" description="All 11 Franciscan Health hospitals"
            disabled={isCNO || isDirector}
            onClick={() => { setTargetScope('SYSTEM'); setSelectedHospitals([]); }}
          />
          <ScopeOption
            value="HOSPITAL" current={targetScope}
            icon={Building2} label="Specific Hospitals"
            description={isCNO ? `Locked to ${userOrgUnit?.name?.replace('Franciscan Health ', '') ?? 'your hospital'}` : isDirector ? 'Not available for Directors' : 'Choose one or more hospitals'}
            disabled={isDirector}
            onClick={() => { setTargetScope('HOSPITAL'); if (isCNO && userOrgUnit) setSelectedHospitals([userOrgUnit.id]); }}
          />
          <ScopeOption
            value="UNIT" current={targetScope}
            icon={LayoutGrid} label="Specific Unit" description={isDirector ? 'Your department / unit' : 'Department or unit level'}
            onClick={() => setTargetScope('UNIT')}
          />
        </div>

        {/* Director locked to UNIT — contextual info */}
        {isDirector && targetScope === 'UNIT' && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
            <Lock className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-purple-800">{userOrgUnit?.name ?? 'Your department'}</p>
              <p className="text-xs text-purple-500 mt-0.5">Your survey is scoped to your department only — it will not reach other units or hospitals</p>
            </div>
          </div>
        )}

        {/* System-wide confirmation (SVP) */}
        {targetScope === 'SYSTEM' && !isCNO && !isDirector && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Launching across all hospitals</p>
              <p className="text-xs text-blue-500 mt-0.5">This survey will be distributed to nurses at all 11 Franciscan Health locations.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {hospitals.map((h) => (
                  <span key={h.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{h.name.replace('Franciscan Health ', '')}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hospital multi-select (SVP) or locked single hospital (CNO) */}
        {targetScope === 'HOSPITAL' && !isDirector && (
          <div>
            {isCNO ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{userOrgUnit?.name ?? 'Your hospital'}</p>
                  <p className="text-xs text-amber-500">{userOrgUnit?.location} · Your survey is scoped to this hospital only</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Select hospitals</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSelectedHospitals(hospitals.map((h) => h.id))} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Select all</button>
                    <span className="text-gray-300">|</span>
                    <button type="button" onClick={() => setSelectedHospitals([])} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hospitals.map((h) => {
                    const checked = selectedHospitals.includes(h.id);
                    return (
                      <label key={h.id} onClick={() => toggleHospital(h.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all select-none
                          ${checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                          {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${checked ? 'text-blue-800' : 'text-gray-700'}`}>{h.name.replace('Franciscan Health ', '')}</p>
                          <p className="text-xs text-gray-400">{h.location}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {selectedHospitals.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2 font-medium">{selectedHospitals.length} of {hospitals.length} hospitals selected</p>
                )}
              </>
            )}
          </div>
        )}

        {targetScope === 'UNIT' && !isDirector && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
            Unit-level targeting available once department/unit org units are configured.
          </div>
        )}

        {/* ── Focus Group ── */}
        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => { setIsFocusGroup(!isFocusGroup); if (isFocusGroup) setFocusGroupUserIds([]); }}
              className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-1 ${isFocusGroup ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isFocusGroup ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Focus Group</p>
              <p className="text-xs text-gray-400">Restrict this survey to specific people only</p>
            </div>
          </label>

          {isFocusGroup && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500 font-medium">Select users in this focus group:</p>
              {allUsers.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Loading users…</p>
              ) : (
                <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {allUsers.map((u: any) => {
                    const selected = focusGroupUserIds.includes(u.id);
                    return (
                      <label key={u.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-indigo-50 transition-colors ${selected ? 'bg-indigo-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => setFocusGroupUserIds((prev) =>
                            selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email} · {u.roles?.[0]?.name ?? '—'}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {focusGroupUserIds.length > 0 && (
                <p className="text-xs text-indigo-600 font-medium">{focusGroupUserIds.length} person{focusGroupUserIds.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Questions ──────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">Questions <span className="text-gray-400 font-normal text-sm">({questions.length}{isDirector ? `/${DIRECTOR_MAX_QUESTIONS}` : ''})</span></h2>
            {isDirector && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${atQuestionLimit ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}`}>
                {DIRECTOR_MAX_QUESTIONS - questions.length} remaining
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setAiStep('pick'); setAiSuggestions([]); if (linkedProgramId) { setAiProgramId(linkedProgramId); } setShowAiModal(true); }}
              className="flex items-center gap-1.5 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-xl transition-colors">
              <Zap className="w-4 h-4" /> Generate with AI
            </button>
            <button
              onClick={addQuestion}
              disabled={atQuestionLimit}
              title={atQuestionLimit ? `Directors are limited to ${DIRECTOR_MAX_QUESTIONS} questions` : undefined}
              className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>
        </div>

        {isDirector && (
          <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            Available types: Likert 1–5, Yes/No, Open Text, Rating. NPS and custom-logic types are not available at this level.
          </div>
        )}

        {questions.map((q, i) => (
          <QuestionCard key={q._id} q={q} index={i} total={questions.length}
            allowedTypes={questionTypes}
            onChange={(u) => updateQuestion(i, u)} onRemove={() => removeQuestion(i)}
            onMoveUp={() => moveUp(i)} onMoveDown={() => moveDown(i)} />
        ))}

        {questions.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400 text-sm">
            No questions yet — click "Add Question" to start building
          </div>
        )}

        {!atQuestionLimit && (
          <button onClick={addQuestion}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add another question
          </button>
        )}

        {atQuestionLimit && (
          <div className="w-full py-3 border-2 border-dashed border-red-200 rounded-xl text-red-400 text-sm flex items-center justify-center gap-2 bg-red-50">
            <Lock className="w-4 h-4" /> Question limit reached ({DIRECTOR_MAX_QUESTIONS}/{DIRECTOR_MAX_QUESTIONS})
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* ── Sticky action bar ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            <span>{questions.length} question{questions.length !== 1 ? 's' : ''}{isDirector ? ` / ${DIRECTOR_MAX_QUESTIONS}` : ''}</span>
            <span className="text-gray-300">·</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${targetScope === 'SYSTEM' ? 'bg-blue-100 text-blue-700' :
                targetScope === 'UNIT'   ? 'bg-purple-100 text-purple-700' :
                selectedHospitals.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
              {targetSummary}
            </span>
            {isAnonymous && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Anonymous</span>}
            {needsApproval && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Needs Approval</span>}
          </div>

          <div className="flex gap-3">
            <button onClick={handleDraft} disabled={isBusy} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saveDraft.isPending ? 'Saving...' : 'Save Draft'}
            </button>

            {needsApproval ? (
              <button onClick={handleApproval} disabled={isBusy} className="flex items-center gap-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                <Eye className="w-4 h-4" />
                {isDirector ? 'Preview & Submit' : 'Preview & Submit for Approval'}
              </button>
            ) : (
              <button onClick={handlePublish} disabled={isBusy} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                <Eye className="w-4 h-4" />
                Preview & Publish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview modal ───────────────────────────────────────────────────────── */}
      {showPreview && (
        <SurveyPreviewModal
          title={title}
          description={description}
          objective={objective}
          type={type}
          isAnonymous={isAnonymous}
          questions={questions}
          onClose={() => setShowPreview(false)}
          confirmLabel={pendingAction === 'publish' ? 'Confirm & Publish' : isDirector ? 'Confirm & Submit for Approval' : 'Confirm & Submit for SVP Approval'}
          confirmIcon={pendingAction === 'publish' ? 'publish' : 'submit'}
          isPending={isBusy}
          onConfirm={() => {
            const payload = buildPayload();
            if (pendingAction === 'publish') saveAndPublish.mutate(payload);
            else saveAndRequestApproval.mutate(payload);
          }}
        />
      )}

      {/* ── AI Generate Modal ── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-600" />
                <h3 className="font-semibold text-gray-900">Generate Questions with AI</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {aiStep === 'pick' && (
                <>
                  <p className="text-sm text-gray-500">Select the program this survey is for. The AI will read its objective, problem statement and success criteria, then pick the best matching questions from your question bank.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                    <select value={aiProgramId} onChange={e => setAiProgramId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                      <option value="">Select a program…</option>
                      {(programs as any[]).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {aiProgramId && (() => {
                      const p = (programs as any[]).find((x: any) => x.id === aiProgramId);
                      return p ? (
                        <div className="mt-2 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 space-y-1 text-xs text-violet-800">
                          {p.objective        && <p><strong>Objective:</strong> {p.objective}</p>}
                          {p.problemStatement && <p><strong>Problem:</strong> {p.problemStatement}</p>}
                          {p.successCriteria  && <p><strong>Success criteria:</strong> {p.successCriteria}</p>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <button
                    onClick={() => aiGenerateMutation.mutate(aiProgramId)}
                    disabled={!aiProgramId || aiGenerateMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm">
                    {aiGenerateMutation.isPending
                      ? <><span className="animate-spin inline-block">⟳</span> Generating…</>
                      : <><Zap className="w-4 h-4" /> Generate Questions</>}
                  </button>
                </>
              )}

              {aiStep === 'review' && aiSuggestions.length > 0 && (
                <>
                  <p className="text-sm text-gray-500">AI suggested <strong>{aiSuggestions.length} questions</strong>. Deselect any you don't want, then click Add to Survey.</p>
                  <div className="space-y-2">
                    {aiSuggestions.map((q: any, i: number) => (
                      <label key={i} className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer transition-colors ${aiSelected.has(i) ? 'border-violet-300 bg-violet-50' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                        <input type="checkbox" checked={aiSelected.has(i)}
                          onChange={e => setAiSelected(prev => { const s = new Set(prev); e.target.checked ? s.add(i) : s.delete(i); return s; })}
                          className="mt-0.5 rounded accent-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 font-medium">{q.text}</p>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{q.type}</span>
                            <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{q.category}</span>
                            <span className="text-[10px] font-semibold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{q.framework}</span>
                          </div>
                          {q.helpText && <p className="text-xs text-gray-400 mt-1">{q.helpText}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setAiStep('pick')} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">← Back</button>
                    <button
                      disabled={aiSelected.size === 0}
                      onClick={() => {
                        const toAdd = aiSuggestions
                          .filter((_: any, i: number) => aiSelected.has(i))
                          .map((q: any) => ({
                            ...makeQuestion(q.type),
                            text:              q.text,
                            helpText:          q.helpText ?? '',
                            type:              q.type,
                            options:           q.options ?? [],
                            followUpThreshold: q.followUpThreshold ?? null,
                            followUpPrompt:    q.followUpPrompt ?? '',
                            dimension:         q.category ?? '',
                            source:            q.framework ?? 'CUSTOM',
                            isRequired:        true,
                          }));
                        setQuestions(prev => [...prev.filter(q => q.text.trim()), ...toAdd]);
                        setShowAiModal(false);
                        toast.success(`${toAdd.length} questions added to survey`);
                      }}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm">
                      Add {aiSelected.size} Question{aiSelected.size !== 1 ? 's' : ''} to Survey
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
