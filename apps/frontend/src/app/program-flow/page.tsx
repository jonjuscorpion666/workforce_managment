'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronRight, CheckCircle2, Circle, Clock, AlertCircle,
  Building2, Globe, X, Check, ChevronDown, ClipboardList,
  Flag, Users, Calendar, Megaphone, BarChart2, Wrench,
  ShieldCheck, AlertTriangle, BellRing, Activity, FileText,
  ExternalLink, SquarePen, GitBranch, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { AIDisclaimer } from '@/components/ui/AIDisclaimer';

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'SETUP',         label: 'Survey Setup',   short: 'Setup',     icon: ClipboardList },
  { key: 'EXECUTION',     label: 'Execution',      short: 'Execute',   icon: BarChart2 },
  { key: 'ROOT_CAUSE',    label: 'Root Cause',     short: 'Root Cause',icon: Flag },
  { key: 'REMEDIATION',   label: 'Remediation',    short: 'Remediate', icon: Wrench },
  { key: 'COMMUNICATION', label: 'Communication',  short: 'Comms',     icon: Megaphone },
  { key: 'VALIDATION',    label: 'Validation',     short: 'Validate',  icon: ShieldCheck },
] as const;

const CHECKLIST_ITEMS = [
  { key: 'meetingScheduled',     label: 'Kickoff meeting scheduled' },
  { key: 'questionsDrafted',     label: 'Survey questions drafted from objective' },
  { key: 'employeeScopeDefined', label: 'Employee scope defined' },
  { key: 'communicationDrafted', label: 'Communication message drafted' },
  { key: 'employeesNotified',    label: 'Employees notified & explained' },
] as const;

const STATUS_STYLES: Record<string, string> = {
  DRAFT:            'bg-gray-100 text-gray-600',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  ACTIVE:           'bg-green-100 text-green-700',
  REJECTED:         'bg-red-100 text-red-700',
  COMPLETED:        'bg-blue-100 text-blue-700',
  CANCELLED:        'bg-gray-100 text-gray-400',
};

const STATUS_ACCENT: Record<string, string> = {
  DRAFT:            'border-l-gray-300',
  PENDING_APPROVAL: 'border-l-amber-400',
  ACTIVE:           'border-l-green-500',
  REJECTED:         'border-l-red-500',
  COMPLETED:        'border-l-blue-500',
  CANCELLED:        'border-l-gray-200',
};

// ── Circular progress ring ────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const r      = 17;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color  = pct === 100 ? '#22c55e' : '#3b82f6';
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '22px 22px', transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

function getPct(program: any): number {
  if (program.status === 'COMPLETED') return 100;
  const stageIdx = STAGES.findIndex((s) => s.key === program.currentStage);
  if (stageIdx <= 0) {
    const done = program.checklistProgress?.completed ?? 0;
    const total = program.checklistProgress?.total ?? 5;
    return total > 0 ? Math.round((done / total) * (100 / STAGES.length)) : 0;
  }
  return Math.round((stageIdx / STAGES.length) * 100);
}

const CARD_STAGES = STAGES.slice(2); // Root Cause → Validation

// ── Program card ──────────────────────────────────────────────────────────────

function ProgramCard({ program, surveys, onClick }: { program: any; surveys: any[]; onClick: () => void }) {
  const pct          = getPct(program);
  const stageIdx     = STAGES.findIndex((s) => s.key === program.currentStage);
  const isCompleted  = program.status === 'COMPLETED';
  const linkedSurvey = surveys.find((s) => s.id === program.linkedSurveyId);
  const scopeLabel   = program.scope === 'GLOBAL'
    ? 'Global'
    : program.targetHospitals?.map((h: any) => h.name).join(', ') || 'Hospital';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all px-5 py-4 border-l-4 ${STATUS_ACCENT[program.status] ?? 'border-l-gray-200'}`}
    >
      <div className="flex items-center gap-4">
        {/* Left content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-bold text-gray-900 text-base truncate">{program.name}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[program.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {program.status.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] text-gray-400 flex-shrink-0">{scopeLabel}</span>
          </div>

          {/* Stage pills — all 6 stages */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2.5">
            {STAGES.map((s, i) => {
              const done   = isCompleted || i < stageIdx;
              const active = !isCompleted && i === stageIdx;
              const Icon   = s.icon;
              return (
                <div key={s.key} className="flex items-center gap-1">
                  {done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-blue-400' : 'text-gray-200'}`} />
                  )}
                  <Icon className={`w-3 h-3 flex-shrink-0 ${done ? 'text-green-500' : active ? 'text-blue-400' : 'text-gray-300'}`} />
                  <span className={`text-xs font-medium ${done ? 'text-green-600' : active ? 'text-blue-600' : 'text-gray-400'}`}>
                    {s.short}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
            {program.ownerName && <span>Owner: <span className="text-gray-600 font-medium">{program.ownerName}</span></span>}
            {program.targetCompletionDate && <span>Target: <span className="text-gray-600 font-medium">{formatDate(program.targetCompletionDate)}</span></span>}
            {linkedSurvey && (
              <span className="flex items-center gap-1 text-blue-500 min-w-0">
                <ClipboardList className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[250px]">{linkedSurvey.title}</span>
              </span>
            )}
            {program.status === 'PENDING_APPROVAL' && (
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <Clock className="w-3 h-3" /> Awaiting {program.scope === 'GLOBAL' ? 'SVP' : 'CNO'} approval
              </span>
            )}
          </div>
        </div>

        {/* Right — ring + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex items-center justify-center">
            <ProgressRing pct={pct} />
            <div className="absolute text-center">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <>
                  <p className="text-[10px] font-bold leading-none text-blue-600">{pct}%</p>
                  <p className="text-[8px] text-gray-400 leading-none mt-0.5">DONE</p>
                </>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>
    </button>
  );
}

// ── Create Program modal ──────────────────────────────────────────────────────

function CreateProgramModal({ hospitals, onClose, onCreated }: {
  hospitals: any[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', scope: 'HOSPITAL_SPECIFIC', targetHospitalIds: [] as string[],
    problemStatement: '', objective: '', successCriteria: '',
    targetLaunchDate: '', targetCompletionDate: '',
  });
  const [enhancing, setEnhancing] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function suggestObjective() {
    if (!form.problemStatement.trim()) return;
    setSuggesting(true);
    try {
      const { data } = await api.post('/programs/ai-suggest-objective', { problemStatement: form.problemStatement });
      setForm((f) => ({ ...f, objective: data.objective, successCriteria: data.successCriteria }));
      toast.success('Objective & success criteria generated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Suggestion failed');
    } finally {
      setSuggesting(false);
    }
  }

  async function enhance(field: 'problemStatement' | 'objective' | 'successCriteria', fieldContext: string) {
    const text = form[field];
    if (!text.trim()) return;
    setEnhancing(field);
    try {
      const { data } = await api.post('/programs/ai-enhance', { text, fieldContext });
      setForm((f) => ({ ...f, [field]: data.enhanced }));
      toast.success('Text enhanced');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Enhancement failed');
    } finally {
      setEnhancing(null);
    }
  }

  const mutation = useMutation({
    mutationFn: () => api.post('/programs', {
      ...form,
      targetHospitalIds: form.scope === 'GLOBAL' ? [] : form.targetHospitalIds,
      targetLaunchDate:      form.targetLaunchDate || undefined,
      targetCompletionDate:  form.targetCompletionDate || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program created');
      onCreated(res.data.id);
    },
    onError: () => toast.error('Failed to create program'),
  });

  function toggleHospital(id: string) {
    setForm((f) => ({
      ...f,
      targetHospitalIds: f.targetHospitalIds.includes(id)
        ? f.targetHospitalIds.filter((h) => h !== id)
        : [...f.targetHospitalIds, id],
    }));
  }

  const canSubmit = form.name.trim() && form.problemStatement.trim() && form.objective.trim() &&
    (form.scope === 'GLOBAL' || form.targetHospitalIds.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">New Program</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Program name <span className="text-red-500">*</span></label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. Q2 Nurse Engagement — Carmel Hospital"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Scope <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {[
                { value: 'HOSPITAL_SPECIFIC', label: 'Hospital-specific', icon: Building2 },
                { value: 'GLOBAL',            label: 'Global (all hospitals)', icon: Globe },
              ].map(({ value, label, icon: Icon }) => (
                <button key={value} type="button"
                  onClick={() => setForm((f) => ({ ...f, scope: value }))}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    form.scope === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Hospital picker */}
          {form.scope === 'HOSPITAL_SPECIFIC' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Target hospital(s) <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                {hospitals.map((h) => (
                  <button key={h.id} type="button"
                    onClick={() => toggleHospital(h.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                      form.targetHospitalIds.includes(h.id) ? 'bg-blue-50' : ''
                    }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      form.targetHospitalIds.includes(h.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {form.targetHospitalIds.includes(h.id) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {h.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Problem statement */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">Problem statement <span className="text-red-500">*</span></label>
              <button type="button" onClick={() => enhance('problemStatement', 'problem statement for a healthcare workforce improvement program')}
                disabled={!form.problemStatement.trim() || !!enhancing}
                className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <Sparkles className="w-3 h-3" />{enhancing === 'problemStatement' ? 'Enhancing…' : 'Enhance'}
              </button>
            </div>
            <textarea rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="e.g. ICU turnover rose 18% last quarter"
              value={form.problemStatement}
              onChange={(e) => setForm((f) => ({ ...f, problemStatement: e.target.value }))}
            />
            <AIDisclaimer />
          </div>

          {/* Objective */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">Objective <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={suggestObjective}
                  disabled={!form.problemStatement.trim() || suggesting || !!enhancing}
                  title="Auto-generate objective & success criteria from your problem statement"
                  className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Sparkles className="w-3 h-3" />{suggesting ? 'Suggesting…' : 'Suggest from problem'}
                </button>
                {form.objective.trim() && (
                  <>
                    <span className="text-gray-200">|</span>
                    <button type="button" onClick={() => enhance('objective', 'objective/goal for a healthcare workforce improvement program')}
                      disabled={!!enhancing || suggesting}
                      className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                      <Sparkles className="w-3 h-3" />{enhancing === 'objective' ? 'Enhancing…' : 'Enhance'}
                    </button>
                  </>
                )}
              </div>
            </div>
            <textarea rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="e.g. Identify root causes of disengagement in night shift nurses"
              value={form.objective}
              onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
            />
            <AIDisclaimer />
          </div>

          {/* Success criteria */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">Success criteria <span className="text-gray-400">(optional)</span></label>
              {form.successCriteria.trim() && (
                <button type="button" onClick={() => enhance('successCriteria', 'success criteria / measurable outcomes for a healthcare workforce improvement program')}
                  disabled={!!enhancing || suggesting}
                  className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Sparkles className="w-3 h-3" />{enhancing === 'successCriteria' ? 'Enhancing…' : 'Enhance'}
                </button>
              )}
            </div>
            <textarea rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="e.g. Response rate >60%, actionable themes identified"
              value={form.successCriteria}
              onChange={(e) => setForm((f) => ({ ...f, successCriteria: e.target.value }))}
            />
            <AIDisclaimer />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target launch</label>
              <input type="date"
                min={today}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.targetLaunchDate}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && v < today) return;
                  setForm((f) => ({ ...f, targetLaunchDate: v }));
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target completion</label>
              <input type="date"
                min={form.targetLaunchDate || today}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.targetCompletionDate}
                onChange={(e) => {
                  const v = e.target.value;
                  const floor = form.targetLaunchDate || today;
                  if (v && v < floor) return;
                  setForm((f) => ({ ...f, targetCompletionDate: v }));
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {mutation.isPending ? 'Creating…' : 'Create Program'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgramFlowPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [statusFilter, setStatusFilter]     = useState('ACTIVE');
  const [searchQuery, setSearchQuery]       = useState('');
  const [showCreate, setShowCreate]         = useState(false);

  const canCreate = hasRole('SVP') || hasRole('SUPER_ADMIN') || hasRole('CNO') || hasRole('DIRECTOR');

  const { data: programs = [], isLoading } = useQuery<any[]>({
    queryKey: ['programs', hospitalFilter, statusFilter],
    queryFn: () => api.get('/programs', {
      params: {
        ...(hospitalFilter ? { hospitalId: hospitalFilter } : {}),
        ...(statusFilter   ? { status:     statusFilter   } : {}),
      },
    }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: orgUnits = [] } = useQuery<any[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/org/units').then((r) => r.data),
    staleTime: 10 * 60_000,
  });

  const { data: surveys = [] } = useQuery<any[]>({
    queryKey: ['surveys'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const hospitals = (orgUnits as any[]).filter((u) => u.level === 'HOSPITAL');

  const active    = programs.filter((p) => p.status === 'ACTIVE').length;
  const completed = programs.filter((p) => p.status === 'COMPLETED').length;
  const draft     = programs.filter((p) => p.status === 'DRAFT').length;

  const filteredPrograms = programs.filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Program Flow</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track improvement programs from root cause through remediation and validation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/program-flow/diagram"
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-600 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm border border-gray-200 transition-colors">
            <GitBranch className="w-4 h-4" /> Flow Diagram
          </Link>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> New Program
            </button>
          )}
        </div>
      </div>

      {/* Stats strip */}
      {programs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active',    value: active,    color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Completed', value: completed, color: 'text-blue-600',  bg: 'bg-blue-50' },
            { label: 'Draft',     value: draft,     color: 'text-gray-600',  bg: 'bg-gray-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl border border-gray-100 shadow-sm p-4 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search bar */}
      {programs.length > 0 && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search programs…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pl-9"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={hospitalFilter}
          onChange={(e) => setHospitalFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All hospitals</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All statuses</option>
          {['DRAFT','PENDING_APPROVAL','ACTIVE','REJECTED','COMPLETED','CANCELLED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        {(hospitalFilter || statusFilter !== 'ACTIVE') && (
          <button onClick={() => { setHospitalFilter(''); setStatusFilter('ACTIVE'); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
            <X className="w-3.5 h-3.5" /> Reset filters
          </button>
        )}
      </div>

      {/* Programs list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
          <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">No programs yet</p>
          <p className="text-gray-400 text-sm mt-1">Create the first engagement program to get started.</p>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
              <Plus className="w-4 h-4" /> New Program
            </button>
          )}
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-500 text-sm">No programs match &ldquo;{searchQuery}&rdquo;</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPrograms.map((p) => (
            <ProgramCard key={p.id} program={p} surveys={surveys} onClick={() => router.push(`/program-flow/${p.id}`)} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateProgramModal
          hospitals={hospitals}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); router.push(`/program-flow/${id}?tab=checklists`); }}
        />
      )}

    </div>
  );
}
