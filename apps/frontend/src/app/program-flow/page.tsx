'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronRight, CheckCircle2, Circle, Clock, AlertCircle,
  Building2, Globe, X, Check, ChevronDown, ClipboardList,
  Flag, Users, Calendar, Megaphone, BarChart2, Wrench,
  ShieldCheck, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

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

// ── Stage progress bar ────────────────────────────────────────────────────────

function StageBar({ currentStage, status }: { currentStage: string; status: string }) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);
  const isCompleted = status === 'COMPLETED';

  return (
    <div className="flex items-center gap-0.5 mt-2">
      {STAGES.map((s, i) => {
        const done    = isCompleted || i < currentIdx;
        const active  = !isCompleted && i === currentIdx;
        return (
          <div key={s.key} className="flex items-center gap-0.5 flex-1">
            <div title={s.label} className={`h-1.5 w-full rounded-full transition-colors ${
              done   ? 'bg-green-500' :
              active ? 'bg-amber-400' :
                       'bg-gray-200'
            }`} />
          </div>
        );
      })}
    </div>
  );
}

// ── Program card ──────────────────────────────────────────────────────────────

function ProgramCard({ program, onClick }: { program: any; onClick: () => void }) {
  const currentStageLabel = STAGES.find((s) => s.key === program.currentStage)?.label ?? program.currentStage;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border-l-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-4 ${STATUS_ACCENT[program.status] ?? 'border-l-gray-300'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold font-mono bg-gray-900 text-gray-100 px-2 py-0.5 rounded">
              {program.programId}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[program.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {program.status.replace(/_/g, ' ')}
            </span>
            {program.scope === 'GLOBAL' ? (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                <Globe className="w-2.5 h-2.5" /> Global
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                <Building2 className="w-2.5 h-2.5" />
                {program.targetHospitals?.map((h: any) => h.name).join(', ') || 'Hospital'}
              </span>
            )}
          </div>

          {/* Name */}
          <p className="font-semibold text-gray-900 text-sm truncate">{program.name}</p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span>{currentStageLabel}</span>
            {program.ownerName && <span>· {program.ownerName}</span>}
            <span>· {formatDate(program.createdAt)}</span>
          </div>

          {/* Stage bar */}
          <StageBar currentStage={program.currentStage} status={program.status} />

          {/* Checklist progress (only in SETUP) */}
          {program.currentStage === 'SETUP' && program.checklistProgress && (
            <p className="text-[10px] text-gray-400 mt-1.5">
              Setup checklist: {program.checklistProgress.completed}/{program.checklistProgress.total} done
            </p>
          )}

          {/* Pending approval callout */}
          {program.status === 'PENDING_APPROVAL' && (
            <p className="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Awaiting {program.scope === 'GLOBAL' ? 'SVP' : 'CNO'} approval
            </p>
          )}
          {program.status === 'REJECTED' && program.rejectionReason && (
            <p className="text-[10px] text-red-500 mt-1 truncate">↩ {program.rejectionReason}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ── Create Program modal ──────────────────────────────────────────────────────

function CreateProgramModal({ hospitals, onClose, onCreated }: {
  hospitals: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', scope: 'HOSPITAL_SPECIFIC', targetHospitalIds: [] as string[],
    problemStatement: '', objective: '', successCriteria: '',
    targetLaunchDate: '', targetCompletionDate: '',
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/programs', {
      ...form,
      targetHospitalIds: form.scope === 'GLOBAL' ? [] : form.targetHospitalIds,
      targetLaunchDate:      form.targetLaunchDate || undefined,
      targetCompletionDate:  form.targetCompletionDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program created');
      onCreated();
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Problem statement <span className="text-red-500">*</span></label>
            <textarea rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="e.g. ICU turnover rose 18% last quarter"
              value={form.problemStatement}
              onChange={(e) => setForm((f) => ({ ...f, problemStatement: e.target.value }))}
            />
          </div>

          {/* Objective */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Objective <span className="text-red-500">*</span></label>
            <textarea rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="e.g. Identify root causes of disengagement in night shift nurses"
              value={form.objective}
              onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
            />
          </div>

          {/* Success criteria */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Success criteria <span className="text-gray-400">(optional)</span></label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. Response rate >60%, actionable themes identified"
              value={form.successCriteria}
              onChange={(e) => setForm((f) => ({ ...f, successCriteria: e.target.value }))}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target launch</label>
              <input type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.targetLaunchDate}
                onChange={(e) => setForm((f) => ({ ...f, targetLaunchDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target completion</label>
              <input type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.targetCompletionDate}
                onChange={(e) => setForm((f) => ({ ...f, targetCompletionDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
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

// ── Program detail drawer ─────────────────────────────────────────────────────

function ProgramDrawer({ program, surveys, onClose }: {
  program: any;
  surveys: any[];
  onClose: () => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject]     = useState(false);
  const [surveyPicker, setSurveyPicker] = useState(false);

  const canApprove = (
    program.scope === 'GLOBAL'
      ? hasRole('SVP') || hasRole('SUPER_ADMIN')
      : hasRole('CNO') || hasRole('SVP') || hasRole('SUPER_ADMIN')
  ) && program.status === 'PENDING_APPROVAL';

  const canAdvance = program.status === 'ACTIVE';
  const canSubmit  = program.status === 'DRAFT';

  const checklistMutation = useMutation({
    mutationFn: (update: Record<string, any>) => api.patch(`/programs/${program.id}/checklist`, update),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
    onError: () => toast.error('Failed to update checklist'),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/programs/${program.id}/submit`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['programs'] }); toast.success('Submitted for approval'); },
    onError:   () => toast.error('Failed to submit'),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/programs/${program.id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['programs'] }); toast.success('Program approved'); },
    onError:   () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/programs/${program.id}/reject`, { reason: rejectReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['programs'] }); setShowReject(false); toast.success('Program rejected'); },
    onError:   () => toast.error('Failed to reject'),
  });

  const advanceMutation = useMutation({
    mutationFn: () => api.post(`/programs/${program.id}/advance`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['programs'] }); toast.success('Stage advanced'); },
    onError:   () => toast.error('Failed to advance stage'),
  });

  const linkSurveyMutation = useMutation({
    mutationFn: (surveyId: string) => api.patch(`/programs/${program.id}/survey`, { surveyId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['programs'] }); setSurveyPicker(false); toast.success('Survey linked'); },
    onError:   () => toast.error('Failed to link survey'),
  });

  const stageIdx     = STAGES.findIndex((s) => s.key === program.currentStage);
  const nextStage    = STAGES[stageIdx + 1];
  const isLastStage  = stageIdx === STAGES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between z-10">
          <div>
            <p className="text-[10px] font-bold font-mono text-gray-400">{program.programId}</p>
            <h2 className="font-bold text-gray-900 mt-0.5">{program.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[program.status] ?? ''}`}>
                {program.status.replace(/_/g, ' ')}
              </span>
              {program.scope === 'GLOBAL'
                ? <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> Global</span>
                : <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Building2 className="w-2.5 h-2.5" />{program.targetHospitals?.map((h: any) => h.name).join(', ')}</span>
              }
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">

          {/* Stage progress */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stage Progress</p>
            <div className="space-y-1.5">
              {STAGES.map((s, i) => {
                const done    = program.status === 'COMPLETED' || i < stageIdx;
                const active  = program.status !== 'COMPLETED' && i === stageIdx;
                const Icon    = s.icon;
                return (
                  <div key={s.key} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${active ? 'bg-amber-50 border border-amber-200' : done ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : active
                        ? <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    }
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${done ? 'text-green-500' : active ? 'text-amber-500' : 'text-gray-300'}`} />
                    <span className={`text-sm font-medium ${done ? 'text-green-700' : active ? 'text-amber-700' : 'text-gray-400'}`}>{s.label}</span>
                    {active && <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">Current</span>}
                    {done  && <CheckCircle2 className="ml-auto w-3.5 h-3.5 text-green-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Problem & Objective */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Problem</p>
              <p className="text-sm text-gray-800">{program.problemStatement}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Objective</p>
              <p className="text-sm text-gray-800">{program.objective}</p>
            </div>
            {program.successCriteria && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Success Criteria</p>
                <p className="text-sm text-gray-800">{program.successCriteria}</p>
              </div>
            )}
          </div>

          {/* Setup checklist (always visible) */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Setup Checklist</p>
            <div className="space-y-1.5">

              {/* Meeting — auto-ticks when date is entered */}
              <div className={`rounded-lg border overflow-hidden ${program.setupChecklist?.meetingScheduled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                {/* Checklist row — read-only, driven by meeting details */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    program.setupChecklist?.meetingScheduled ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {program.setupChecklist?.meetingScheduled && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`text-sm flex-1 ${program.setupChecklist?.meetingScheduled ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                    Kickoff meeting scheduled
                  </span>
                  <span className="text-[10px] text-gray-400">auto</span>
                </div>

                {/* Meeting details — always visible */}
                <div className="border-t border-gray-100 bg-blue-50/50 px-3 py-2.5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">Date <span className="text-blue-400">→ ticks above</span></p>
                      <input type="date"
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        value={program.setupChecklist?.meetingDate ?? ''}
                        onChange={(e) => checklistMutation.mutate({
                          meetingDate:      e.target.value,
                          meetingScheduled: !!e.target.value,
                        })}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">Attendees</p>
                      <input type="text"
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="Names / roles"
                        value={program.setupChecklist?.meetingAttendees ?? ''}
                        onChange={(e) => checklistMutation.mutate({ meetingAttendees: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Notes</p>
                    <textarea rows={2}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                      placeholder="Key decisions made…"
                      value={program.setupChecklist?.meetingNotes ?? ''}
                      onChange={(e) => checklistMutation.mutate({ meetingNotes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Other checklist items — manually ticked */}
              {CHECKLIST_ITEMS.filter(({ key }) => key !== 'meetingScheduled').map(({ key, label }) => {
                const checked = !!(program.setupChecklist?.[key]);
                return (
                  <button key={key} type="button"
                    disabled={program.status === 'COMPLETED' || program.status === 'CANCELLED'}
                    onClick={() => checklistMutation.mutate({ [key]: !checked })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      checked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      checked ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}>
                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={`text-sm ${checked ? 'text-green-700 line-through' : 'text-gray-700'}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linked survey */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Linked Survey</p>
            {program.linkedSurveyId ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 flex-1 truncate">
                  {surveys.find((s) => s.id === program.linkedSurveyId)?.title ?? 'Survey linked'}
                </p>
              </div>
            ) : (
              <div>
                {!surveyPicker ? (
                  <button onClick={() => setSurveyPicker(true)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    <Plus className="w-4 h-4" /> Link a survey
                  </button>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {surveys.filter((s) => s.status !== 'ARCHIVED').map((s) => (
                      <button key={s.id} type="button"
                        onClick={() => linkSurveyMutation.mutate(s.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        <p className="font-medium text-gray-800 truncate">{s.title}</p>
                        <p className="text-xs text-gray-400">{s.status} · {s.type}</p>
                      </button>
                    ))}
                    {surveys.length === 0 && (
                      <p className="text-sm text-gray-400 px-3 py-3">No surveys available</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            {program.ownerName && (
              <div><p className="font-semibold text-gray-400 mb-0.5">Owner</p><p>{program.ownerName}</p></div>
            )}
            {program.targetLaunchDate && (
              <div><p className="font-semibold text-gray-400 mb-0.5">Target launch</p><p>{formatDate(program.targetLaunchDate)}</p></div>
            )}
            {program.targetCompletionDate && (
              <div><p className="font-semibold text-gray-400 mb-0.5">Target completion</p><p>{formatDate(program.targetCompletionDate)}</p></div>
            )}
            {program.approverName && (
              <div><p className="font-semibold text-gray-400 mb-0.5">Approved by</p><p>{program.approverName}</p></div>
            )}
          </div>

          {/* Rejection reason */}
          {program.status === 'REJECTED' && program.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-0.5">Rejected</p>
              <p className="text-sm text-red-700">{program.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Action footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 space-y-2">

          {/* Submit for approval */}
          {canSubmit && (
            <button onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              <ShieldCheck className="w-4 h-4" />
              {submitMutation.isPending ? 'Submitting…' : `Submit for ${program.scope === 'GLOBAL' ? 'SVP' : 'CNO'} Approval`}
            </button>
          )}

          {/* Approve / Reject */}
          {canApprove && !showReject && (
            <div className="flex gap-2">
              <button onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                <CheckCircle2 className="w-4 h-4" />
                {approveMutation.isPending ? 'Approving…' : 'Approve'}
              </button>
              <button onClick={() => setShowReject(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2.5 rounded-xl text-sm border border-red-200 transition-colors">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          )}

          {/* Reject form */}
          {canApprove && showReject && (
            <div className="space-y-2">
              <textarea rows={2} placeholder="Reason for rejection…"
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => { rejectMutation.mutate(); }}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition-colors">
                  {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Reject'}
                </button>
                <button onClick={() => setShowReject(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Advance stage */}
          {canAdvance && (
            <button onClick={() => advanceMutation.mutate()}
              disabled={advanceMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              {isLastStage ? (
                <><CheckCircle2 className="w-4 h-4" /> {advanceMutation.isPending ? 'Completing…' : 'Mark Complete'}</>
              ) : (
                <><ChevronRight className="w-4 h-4" /> {advanceMutation.isPending ? 'Advancing…' : `Advance to ${nextStage?.label}`}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgramFlowPage() {
  const { hasRole } = useAuth();
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  const [showCreate, setShowCreate]         = useState(false);
  const [selected, setSelected]             = useState<any>(null);

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

  // Keep drawer in sync with latest data
  const selectedProgram = selected
    ? (programs.find((p) => p.id === selected.id) ?? selected)
    : null;

  const pending = programs.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const active  = programs.filter((p) => p.status === 'ACTIVE').length;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Program Flow</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage engagement programs across their full lifecycle</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> New Program
          </button>
        )}
      </div>

      {/* Stats strip */}
      {programs.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: programs.length,                                         color: 'text-gray-700' },
            { label: 'Active',   value: active,                                                  color: 'text-green-600' },
            { label: 'Pending',  value: pending,                                                 color: 'text-amber-600' },
            { label: 'Complete', value: programs.filter((p) => p.status === 'COMPLETED').length, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
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

        {(hospitalFilter || statusFilter) && (
          <button onClick={() => { setHospitalFilter(''); setStatusFilter(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear
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
      ) : (
        <div className="space-y-3">
          {programs.map((p) => (
            <ProgramCard key={p.id} program={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateProgramModal
          hospitals={hospitals}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}

      {selectedProgram && (
        <ProgramDrawer
          program={selectedProgram}
          surveys={surveys}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
