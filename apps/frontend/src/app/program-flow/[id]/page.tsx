'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, CheckCircle2, Circle, AlertCircle,
  Building2, Globe, X, Check, ChevronDown, ClipboardList,
  Flag, Megaphone, BarChart2, Wrench, ShieldCheck, AlertTriangle,
  BellRing, Activity, ExternalLink, SquarePen, Plus, ChevronRight,
  UserCircle, Calendar, FileText, Target,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'SETUP',         label: 'Survey Setup',   short: 'Setup',      icon: ClipboardList },
  { key: 'EXECUTION',     label: 'Execution',      short: 'Execute',    icon: BarChart2 },
  { key: 'ROOT_CAUSE',    label: 'Root Cause',     short: 'Root Cause', icon: Flag },
  { key: 'REMEDIATION',   label: 'Remediation',    short: 'Remediate',  icon: Wrench },
  { key: 'COMMUNICATION', label: 'Communication',  short: 'Comms',      icon: Megaphone },
  { key: 'VALIDATION',    label: 'Validation',     short: 'Validate',   icon: ShieldCheck },
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

const CARD_STAGES = STAGES.slice(2);

type Tab = 'overview' | 'details' | 'checklists' | 'info';

const TABS: { key: Tab; label: string; Icon: any }[] = [
  { key: 'overview',   label: 'Overview',   Icon: Target },
  { key: 'details',    label: 'Details',    Icon: FileText },
  { key: 'checklists', label: 'Checklists', Icon: CheckCircle2 },
  { key: 'info',       label: 'Info',       Icon: Calendar },
];

// ── Progress ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct === 100 ? '#22c55e' : '#3b82f6';
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="flex-shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '26px 26px', transition: 'stroke-dashoffset 0.4s ease' }}
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

// ── Checklist checkbox row ────────────────────────────────────────────────────

function CheckRow({ checked, label, auto, onClick }: {
  checked: boolean; label: string; auto?: boolean; onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
        checked ? 'bg-green-50 border-green-200' : `bg-white border-gray-200 ${onClick ? 'hover:border-gray-300 cursor-pointer' : ''}`
      }`}
    >
      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
        checked ? 'bg-green-500 border-green-500' : 'border-gray-300'
      }`}>
        {checked && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      <span className={`text-sm flex-1 ${checked ? 'text-green-700 line-through' : 'text-gray-700'}`}>{label}</span>
      {auto && <span className="text-[10px] text-gray-400">auto</span>}
    </Tag>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { hasRole } = useAuth();

  const [activeTab, setActiveTab]         = useState<Tab>('overview');
  const [rejectReason, setRejectReason]   = useState('');
  const [showReject, setShowReject]       = useState(false);
  const [surveyPicker, setSurveyPicker]   = useState(false);
  const [commMessage, setCommMessage]     = useState('');
  const [setupOpen, setSetupOpen]         = useState(false);
  const [execOpen, setExecOpen]           = useState(false);
  const [rootCauseOpen, setRootCauseOpen] = useState(false);
  const [remOpen, setRemOpen]             = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [newIssue, setNewIssue]           = useState({ title: '', severity: 'MEDIUM' });
  const [rcFindings, setRcFindings]       = useState('');
  const [remPlan, setRemPlan]             = useState('');

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: program, isLoading } = useQuery<any>({
    queryKey: ['program', id],
    queryFn: () => api.get(`/programs/${id}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: surveys = [] } = useQuery<any[]>({
    queryKey: ['surveys'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  // Sync local text state on first load
  useEffect(() => {
    if (!program) return;
    setCommMessage(program.setupChecklist?.communicationMessage ?? '');
    setRcFindings(program.rootCauseChecklist?.findings ?? '');
    setRemPlan(program.remediationChecklist?.actionPlan ?? '');
    setSetupOpen(program.currentStage === 'SETUP');
    setExecOpen(program.currentStage === 'EXECUTION');
    setRootCauseOpen(program.currentStage === 'ROOT_CAUSE');
    setRemOpen(program.currentStage === 'REMEDIATION');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  const inExecOrLater = program && ['EXECUTION', 'ROOT_CAUSE', 'REMEDIATION', 'COMMUNICATION', 'VALIDATION', 'COMPLETED'].includes(program.currentStage);
  const inRCOrLater   = program && (['ROOT_CAUSE', 'REMEDIATION', 'COMMUNICATION', 'VALIDATION'].includes(program.currentStage) || program.status === 'COMPLETED');
  const inRemOrLater  = program && (['REMEDIATION', 'COMMUNICATION', 'VALIDATION'].includes(program.currentStage) || program.status === 'COMPLETED');

  const { data: participation } = useQuery<any>({
    queryKey: ['participation', program?.linkedSurveyId],
    queryFn: () => api.get('/responses/participation/status', { params: { surveyId: program.linkedSurveyId } }).then((r) => r.data),
    enabled: !!(inExecOrLater && program?.linkedSurveyId),
    refetchInterval: inExecOrLater ? 30_000 : false,
  });

  const { data: relatedWork = [] } = useQuery<any[]>({
    queryKey: ['related-work', id],
    queryFn: () => api.get(`/programs/${id}/related-work`).then((r) => r.data),
    enabled: !!inRCOrLater,
    refetchInterval: inRCOrLater ? 30_000 : false,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['program', id] });
    qc.invalidateQueries({ queryKey: ['programs'] });
  };

  const checklistMutation = useMutation({
    mutationFn: (u: Record<string, any>) => api.patch(`/programs/${id}/checklist`, u),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update checklist'),
  });

  const execChecklistMutation = useMutation({
    mutationFn: (u: Record<string, any>) => api.patch(`/programs/${id}/execution-checklist`, u),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update'),
  });

  const rootCauseMutation = useMutation({
    mutationFn: (u: Record<string, any>) => api.patch(`/programs/${id}/root-cause-checklist`, u),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update'),
  });

  const remediationMutation = useMutation({
    mutationFn: (u: Record<string, any>) => api.patch(`/programs/${id}/remediation-checklist`, u),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update'),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/programs/${id}/submit`),
    onSuccess: () => { invalidate(); toast.success('Submitted for approval'); },
    onError: () => toast.error('Failed to submit'),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/programs/${id}/approve`),
    onSuccess: () => { invalidate(); toast.success('Program approved'); },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/programs/${id}/reject`, { reason: rejectReason }),
    onSuccess: () => { invalidate(); setShowReject(false); toast.success('Rejected'); },
    onError: () => toast.error('Failed to reject'),
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      let surveyPublished = false;
      if (program.currentStage === 'SETUP' && program.linkedSurveyId) {
        const linked = (surveys as any[]).find((s) => s.id === program.linkedSurveyId);
        if (linked && linked.status !== 'ACTIVE') {
          try {
            await api.post(`/surveys/${program.linkedSurveyId}/publish`);
            surveyPublished = true;
          } catch (e: any) {
            const msg = e?.response?.data?.message;
            toast.error(msg ? `Survey: ${msg}` : 'Survey could not be published — publish it separately');
          }
        } else if (linked?.status === 'ACTIVE') {
          surveyPublished = true;
        }
      }
      const result = await api.post(`/programs/${id}/advance`);
      return { result, surveyPublished };
    },
    onSuccess: ({ surveyPublished }) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['surveys'] });
      if (program.currentStage === 'SETUP') {
        if (surveyPublished) {
          toast.success('Survey published — program moved to Execution');
          execChecklistMutation.mutate({ surveyLaunched: true });
        } else {
          toast.success('Program moved to Execution — publish survey when ready');
        }
      } else {
        toast.success('Stage advanced');
      }
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to advance stage');
    },
  });

  const linkSurveyMutation = useMutation({
    mutationFn: (surveyId: string) => api.patch(`/programs/${id}/survey`, { surveyId }),
    onSuccess: (_, surveyId) => {
      const linked = (surveys as any[]).find((s) => s.id === surveyId);
      const scopeDefined = !!(linked?.targetOrgUnitIds?.length || linked?.targetRoles?.length || linked?.focusGroupUserIds?.length || linked?.targetShifts?.length || (linked?.targetScope && linked.targetScope !== 'SYSTEM'));
      checklistMutation.mutate({ questionsDrafted: true, employeeScopeDefined: scopeDefined });
      invalidate();
      setSurveyPicker(false);
      toast.success(scopeDefined ? 'Survey linked — scope auto-detected' : 'Survey linked');
    },
    onError: () => toast.error('Failed to link survey'),
  });

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      const audienceMode = program.scope === 'GLOBAL' ? 'SYSTEM' : 'COMBINATION';
      const targetOrgUnitIds = program.scope === 'GLOBAL' ? [] : (program.targetHospitalIds ?? []);
      const { data: ann } = await api.post('/announcements', {
        title: `Reminder: Please complete the ${program.name} survey`,
        body: 'This is a friendly reminder to complete the survey. Your anonymous feedback helps us improve.',
        type: 'SURVEY_LAUNCH', priority: 'HIGH', audienceMode, targetOrgUnitIds,
        linkedSurveyId: program.linkedSurveyId,
      });
      await api.post(`/announcements/${ann.id}/publish`);
    },
    onSuccess: () => {
      const history = [...(program.executionChecklist?.reminderHistory ?? []), new Date().toISOString()];
      execChecklistMutation.mutate({ reminderSent: true, reminderHistory: history });
      toast.success('Reminder sent');
    },
    onError: () => toast.error('Failed to send reminder'),
  });

  const closeSurveyMutation = useMutation({
    mutationFn: () => api.post(`/surveys/${program.linkedSurveyId}/close`),
    onSuccess: () => {
      execChecklistMutation.mutate({ surveyClosed: true });
      qc.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Survey closed');
    },
    onError: () => toast.error('Failed to close survey'),
  });

  const sendAnnouncementMutation = useMutation({
    mutationFn: async () => {
      const audienceMode = program.scope === 'GLOBAL' ? 'SYSTEM' : 'COMBINATION';
      const targetOrgUnitIds = program.scope === 'GLOBAL' ? [] : (program.targetHospitalIds ?? []);
      const { data: ann } = await api.post('/announcements', {
        title: `Survey: ${program.name}`, body: commMessage.trim(),
        type: 'SURVEY_LAUNCH', priority: 'MEDIUM', audienceMode, targetOrgUnitIds,
        linkedSurveyId: program.linkedSurveyId,
      });
      await api.post(`/announcements/${ann.id}/publish`);
    },
    onSuccess: () => { checklistMutation.mutate({ employeesNotified: true }); invalidate(); toast.success('Announcement sent'); },
    onError: () => toast.error('Failed to send announcement'),
  });

  const createIssueMutation = useMutation({
    mutationFn: () => api.post('/issues', { title: newIssue.title.trim(), severity: newIssue.severity, programId: id, source: 'MANUAL' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['related-work', id] });
      rootCauseMutation.mutate({ issuesCreated: true });
      setNewIssue({ title: '', severity: 'MEDIUM' });
      setShowCreateIssue(false);
      toast.success('Issue created');
    },
    onError: () => toast.error('Failed to create issue'),
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading || !program) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="bg-white rounded-2xl h-44 animate-pulse" />
          <div className="bg-white rounded-2xl h-14 animate-pulse" />
          <div className="bg-white rounded-2xl h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const pct          = getPct(program);
  const stageIdx     = STAGES.findIndex((s) => s.key === program.currentStage);
  const nextStage    = STAGES[stageIdx + 1];
  const isLastStage  = stageIdx === STAGES.length - 1;
  const isCompleted  = program.status === 'COMPLETED';
  const scopeLabel   = program.scope === 'GLOBAL'
    ? 'Global'
    : (program.targetHospitals?.map((h: any) => h.name).join(', ') || 'Unit');

  const canApprove = (
    program.scope === 'GLOBAL'
      ? hasRole('SVP') || hasRole('SUPER_ADMIN')
      : hasRole('CNO') || hasRole('SVP') || hasRole('SUPER_ADMIN')
  ) && program.status === 'PENDING_APPROVAL';

  const cl = program.setupChecklist ?? {};
  const setupAllDone = cl.meetingScheduled && cl.questionsDrafted && cl.employeeScopeDefined && cl.communicationDrafted && cl.employeesNotified;

  const advanceBlockReason: string | null = (() => {
    if (program.status !== 'ACTIVE') return null;
    if (program.currentStage === 'SETUP') {
      if (!program.linkedSurveyId) return 'Link a survey first';
      if (!setupAllDone)           return 'Complete all setup checklist items';
    }
    if (program.currentStage === 'EXECUTION' && !program.executionChecklist?.surveyClosed)
      return 'Close the survey before advancing';
    if (program.currentStage === 'ROOT_CAUSE') {
      if (!program.rootCauseChecklist?.issuesCreated) return 'Create at least one issue first';
      if (!program.rootCauseChecklist?.teamAgreed)    return 'Get team agreement on root causes';
    }
    if (program.currentStage === 'REMEDIATION' && !program.remediationChecklist?.progressReviewed)
      return 'Mark progress as reviewed first';
    return null;
  })();

  const canAdvanceGated = program.status === 'ACTIVE' && !advanceBlockReason;

  // Progress counts for each stage
  const execCl      = program.executionChecklist   ?? {};
  const rcCl        = program.rootCauseChecklist   ?? {};
  const remCl       = program.remediationChecklist ?? {};
  const setupDone   = ['meetingScheduled','questionsDrafted','employeeScopeDefined','communicationDrafted','employeesNotified'].filter(k => !!(cl as any)[k]).length;
  const execDone    = ['surveyLaunched','reminderSent','surveyClosed'].filter(k => !!(execCl as any)[k]).length;
  const rcDone      = ['resultsReviewed','findingsDocumented','issuesCreated','teamAgreed'].filter(k => !!(rcCl as any)[k]).length;
  const remDone     = ['actionPlanDrafted','tasksAssigned','progressReviewed'].filter(k => !!(remCl as any)[k]).length;

  const linkedSurvey    = (surveys as any[]).find((s) => s.id === program.linkedSurveyId);
  const surveyHasScope  = !!(linkedSurvey?.targetOrgUnitIds?.length || linkedSurvey?.targetRoles?.length || linkedSurvey?.focusGroupUserIds?.length || linkedSurvey?.targetShifts?.length || (linkedSurvey?.targetScope && linkedSurvey.targetScope !== 'SYSTEM'));
  const responseCount   = participation?.responseCount ?? 0;
  const closesAt        = linkedSurvey?.closesAt ? new Date(linkedSurvey.closesAt) : null;
  const daysLeft        = closesAt ? Math.ceil((closesAt.getTime() - Date.now()) / 86_400_000) : null;
  const surveyLive      = execCl.surveyLaunched  ?? linkedSurvey?.status === 'ACTIVE';
  const surveyClosed    = execCl.surveyClosed    ?? linkedSurvey?.status === 'CLOSED';
  const reminderSent    = execCl.reminderSent    ?? false;
  const reminderHistory: string[] = execCl.reminderHistory ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">

        {/* Back link */}
        <button onClick={() => router.push('/program-flow')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium">
          <ChevronLeft className="w-4 h-4" /> All Programs
        </button>

        {/* ── Header card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-gray-400 mb-0.5">{program.programId}</p>
              <h1 className="text-xl font-bold text-gray-900 truncate">{program.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[program.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {program.status.replace(/_/g, ' ')}
                </span>
                <span className="text-sm text-gray-400">{scopeLabel}</span>
                <span className="text-gray-300">·</span>
                <span className="text-sm font-semibold text-gray-700">{pct}% complete</span>
              </div>
            </div>

            {/* Progress ring */}
            <div className="relative flex items-center justify-center flex-shrink-0 bg-white rounded-full shadow-sm border border-gray-100 w-16 h-16">
              <ProgressRing pct={pct} />
              <div className="absolute text-center">
                <p className={`text-[13px] font-bold leading-none ${pct === 100 ? 'text-green-600' : 'text-blue-600'}`}>{pct}%</p>
              </div>
            </div>
          </div>

          {/* Stage circles — Root Cause → Validation */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {CARD_STAGES.map((s, i) => {
              const idx    = i + 2;
              const done   = isCompleted || idx < stageIdx;
              const active = !isCompleted && idx === stageIdx;
              const Icon   = s.icon;
              return (
                <div key={s.key} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs ${
                  done ? 'border-green-200 bg-green-50' : active ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'
                }`}>
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    : <Circle className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-blue-400' : 'text-gray-300'}`} />
                  }
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${done ? 'text-green-500' : active ? 'text-blue-400' : 'text-gray-300'}`} />
                  <span className={`font-medium truncate ${done ? 'text-green-700' : active ? 'text-blue-600' : 'text-gray-400'}`}>{s.short}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tab nav ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} type="button" onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === key ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Problem Statement</p>
                <p className="text-sm text-gray-700">{program.problemStatement || '—'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Objective</p>
                <p className="text-sm text-gray-700">{program.objective || '—'}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Checklist Progress</p>
              {[
                { label: 'Setup Checklist',       done: setupDone, total: 5 },
                { label: 'Execution Orchestrator', done: execDone,  total: 3 },
                { label: 'Root Cause Analysis',    done: rcDone,    total: 4 },
                { label: 'Remediation',            done: remDone,   total: 3 },
              ].map(({ label, done, total }) => (
                <div key={label} className="flex items-center gap-4 mb-3 last:mb-0">
                  <span className="text-sm text-gray-600 w-48 flex-shrink-0">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-400 h-1.5 rounded-full transition-all"
                      style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{done}/{total}</span>
                </div>
              ))}
            </div>

            {/* Rejection banner */}
            {program.status === 'REJECTED' && program.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-red-600 uppercase mb-1">Rejected</p>
                <p className="text-sm text-red-700">{program.rejectionReason}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Details tab ──────────────────────────────────────────────────── */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Problem</p>
              <p className="text-sm text-gray-700">{program.problemStatement || '—'}</p>
            </div>
            <div className="border-t border-gray-50 pt-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Objective</p>
              <p className="text-sm text-gray-700">{program.objective || '—'}</p>
            </div>
            <div className="border-t border-gray-50 pt-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Success Criteria</p>
              <p className="text-sm text-gray-700">{program.successCriteria || '—'}</p>
            </div>
          </div>
        )}

        {/* ── Checklists tab ───────────────────────────────────────────────── */}
        {activeTab === 'checklists' && (
          <div className="space-y-2">

            {/* SETUP CHECKLIST */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button type="button" onClick={() => setSetupOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700 tracking-wide">SETUP CHECKLIST</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${setupDone === 5 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                    {setupDone}/5 done
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${setupOpen ? 'rotate-180' : ''}`} />
              </button>

              {setupOpen && (
                <div className="border-t border-gray-50 px-5 pb-5 pt-3 space-y-2">

                  {/* Meeting */}
                  <div className={`rounded-lg border overflow-hidden ${cl.meetingScheduled ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${cl.meetingScheduled ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {cl.meetingScheduled && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-sm flex-1 ${cl.meetingScheduled ? 'text-green-700 line-through' : 'text-gray-700'}`}>Kickoff meeting scheduled</span>
                      <span className="text-[10px] text-gray-400">auto</span>
                    </div>
                    <div className="border-t border-gray-100 bg-blue-50/50 px-3 py-2.5 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5">Date → ticks above</p>
                          <input type="date"
                            className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            value={cl.meetingDate ?? ''}
                            onChange={(e) => checklistMutation.mutate({ meetingDate: e.target.value, meetingScheduled: !!e.target.value })}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5">Attendees</p>
                          <input type="text"
                            className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="Names / roles"
                            value={cl.meetingAttendees ?? ''}
                            onChange={(e) => checklistMutation.mutate({ meetingAttendees: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Notes</p>
                        <textarea rows={2}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="Key decisions…"
                          value={cl.meetingNotes ?? ''}
                          onChange={(e) => checklistMutation.mutate({ meetingNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Questions drafted + scope — auto */}
                  {CHECKLIST_ITEMS.filter(({ key }) => !['meetingScheduled','communicationDrafted','employeesNotified'].includes(key)).map(({ key, label }) => {
                    const checked = !!(cl as any)[key];
                    const isAuto  = (key === 'questionsDrafted' && !!program.linkedSurveyId) || (key === 'employeeScopeDefined' && surveyHasScope);
                    return (
                      <CheckRow key={key} checked={checked} label={label} auto={isAuto}
                        onClick={isAuto ? undefined : () => checklistMutation.mutate({ [key]: !checked })}
                      />
                    );
                  })}

                  {/* Linked survey */}
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Linked Survey</p>
                    {program.linkedSurveyId ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <p className="text-sm text-green-700 flex-1 truncate">{linkedSurvey?.title ?? 'Survey linked'}</p>
                        <a href={`/surveys/${program.linkedSurveyId}`} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      </div>
                    ) : (
                      !surveyPicker ? (
                        <button onClick={() => setSurveyPicker(true)}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                          <Plus className="w-4 h-4" /> Link a survey
                        </button>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                          {(surveys as any[]).filter((s) => s.status !== 'ARCHIVED').map((s) => (
                            <button key={s.id} type="button" onClick={() => linkSurveyMutation.mutate(s.id)}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                              <p className="font-medium text-gray-800 truncate">{s.title}</p>
                              <p className="text-xs text-gray-400">{s.status} · {s.type}</p>
                            </button>
                          ))}
                          {(surveys as any[]).length === 0 && <p className="text-sm text-gray-400 px-3 py-3">No surveys available</p>}
                        </div>
                      )
                    )}
                  </div>

                  {/* Communication message */}
                  {(() => {
                    const drafted  = !!(cl.communicationMessage?.trim());
                    const notified = !!(cl.employeesNotified);
                    return (
                      <div className={`rounded-lg border overflow-hidden ${drafted ? 'border-green-200' : 'border-gray-200'}`}>
                        <div className={`flex items-center gap-3 px-3 py-2.5 ${drafted ? 'bg-green-50' : 'bg-white'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${drafted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {drafted && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={`text-sm flex-1 ${drafted ? 'text-green-700 line-through' : 'text-gray-700'}`}>Communication message drafted</span>
                          <span className="text-[10px] text-gray-400">auto</span>
                        </div>
                        <div className="border-t border-gray-100 bg-amber-50/40 px-3 py-2.5 space-y-2">
                          <p className="text-[10px] text-gray-400">Message employees will receive → ticks above</p>
                          <textarea rows={4}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder:text-gray-400"
                            placeholder={`Hi team,\n\nWe're running a short survey this week…`}
                            value={commMessage}
                            onChange={(e) => setCommMessage(e.target.value)}
                            onBlur={() => {
                              const t = commMessage.trim();
                              checklistMutation.mutate({ communicationMessage: t, communicationDrafted: !!t });
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              disabled={!program.linkedSurveyId || !commMessage.trim() || sendAnnouncementMutation.isPending || notified}
                              onClick={() => sendAnnouncementMutation.mutate()}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-lg">
                              <Megaphone className="w-3.5 h-3.5" />
                              {sendAnnouncementMutation.isPending ? 'Sending…' : notified ? 'Sent ✓' : 'Send to Employees'}
                            </button>
                            {!program.linkedSurveyId && <p className="text-[10px] text-amber-600">Link a survey first</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Employees notified */}
                  <CheckRow checked={!!(cl.employeesNotified)} label="Employees notified & explained" auto />
                </div>
              )}
            </div>

            {/* EXECUTION ORCHESTRATOR */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button type="button" onClick={() => setExecOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700 tracking-wide">EXECUTION ORCHESTRATOR</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${execDone === 3 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                    {execDone}/3 done
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${execOpen ? 'rotate-180' : ''}`} />
              </button>

              {execOpen && (
                <div className="border-t border-gray-50 px-5 pb-5 pt-3 space-y-2">
                  {/* Stats bar */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Responses collected</p>
                        <p className="text-3xl font-bold text-blue-700 mt-0.5">{responseCount}</p>
                        {reminderHistory.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-1">{reminderHistory.length} reminder{reminderHistory.length !== 1 ? 's' : ''} sent</p>
                        )}
                      </div>
                      <div className="text-right space-y-1.5">
                        <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${surveyLive && !surveyClosed ? 'bg-green-100 text-green-700' : surveyClosed ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                          <Activity className="w-3 h-3" />
                          {surveyClosed ? 'Survey closed' : surveyLive ? 'Live' : 'Not yet live'}
                        </div>
                        {closesAt && !surveyClosed && daysLeft !== null && (
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400">Closes {closesAt.toLocaleDateString()}</p>
                            <p className={`text-[10px] font-semibold ${daysLeft <= 1 ? 'text-red-600' : daysLeft <= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                              {daysLeft > 0 ? `${daysLeft}d remaining` : daysLeft === 0 ? 'Closes today' : 'Past close date'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <CheckRow checked={surveyLive} label="Survey is live" auto />

                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-blue-100 bg-blue-50">
                    <BarChart2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-blue-700 flex-1">Responses collected</span>
                    <span className="text-sm font-bold text-blue-700">{responseCount}</span>
                  </div>

                  {/* Reminder */}
                  <div className={`rounded-lg border overflow-hidden ${reminderSent ? 'border-green-200' : 'border-gray-200'}`}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 ${reminderSent ? 'bg-green-50' : 'bg-white'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${reminderSent ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {reminderSent && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-sm flex-1 ${reminderSent ? 'text-green-700 line-through' : 'text-gray-700'}`}>Reminder sent to non-responders</span>
                      <span className="text-[10px] text-gray-400">auto</span>
                    </div>
                    {!surveyClosed && (
                      <div className="border-t border-gray-100 bg-amber-50/40 px-3 py-2">
                        <button onClick={() => sendReminderMutation.mutate()}
                          disabled={sendReminderMutation.isPending || !program.linkedSurveyId}
                          className="flex items-center gap-2 text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-40">
                          <BellRing className="w-3.5 h-3.5" />
                          {sendReminderMutation.isPending ? 'Sending…' : reminderHistory.length > 0 ? `Send another reminder (${reminderHistory.length} sent)` : 'Send reminder announcement'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Survey closed */}
                  <div className={`rounded-lg border overflow-hidden ${surveyClosed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${surveyClosed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {surveyClosed && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-sm flex-1 ${surveyClosed ? 'text-green-700 line-through' : 'text-gray-700'}`}>Survey closed</span>
                      <span className="text-[10px] text-gray-400">auto</span>
                    </div>
                    {!surveyClosed && (
                      <div className="border-t border-gray-100 px-3 py-2">
                        <button onClick={() => closeSurveyMutation.mutate()}
                          disabled={closeSurveyMutation.isPending || !program.linkedSurveyId}
                          className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-40">
                          {closeSurveyMutation.isPending ? 'Closing…' : 'Close survey now'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ROOT CAUSE ANALYSIS */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button type="button" onClick={() => setRootCauseOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700 tracking-wide">ROOT CAUSE ANALYSIS</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${rcDone === 4 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                    {rcDone}/4 done
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${rootCauseOpen ? 'rotate-180' : ''}`} />
              </button>

              {rootCauseOpen && (
                <div className="border-t border-gray-50 px-5 pb-5 pt-3 space-y-2">

                  {/* 1. Results reviewed */}
                  <div className={`rounded-lg border overflow-hidden ${rcCl.resultsReviewed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                    <button type="button" onClick={() => rootCauseMutation.mutate({ resultsReviewed: !rcCl.resultsReviewed })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${rcCl.resultsReviewed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {rcCl.resultsReviewed && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-sm flex-1 ${rcCl.resultsReviewed ? 'text-green-700 line-through' : 'text-gray-700'}`}>Survey results reviewed</span>
                      {program.linkedSurveyId && (
                        <a href={`/surveys/${program.linkedSurveyId}`} onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700">
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      )}
                    </button>
                  </div>

                  {/* 2. Findings documented */}
                  {(() => {
                    const documented = !!rcCl.findingsDocumented;
                    return (
                      <div className={`rounded-lg border overflow-hidden ${documented ? 'border-green-200' : 'border-gray-200'}`}>
                        <div className={`flex items-center gap-3 px-3 py-2.5 ${documented ? 'bg-green-50' : 'bg-white'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${documented ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {documented && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={`text-sm flex-1 ${documented ? 'text-green-700 line-through' : 'text-gray-700'}`}>Key findings / themes documented</span>
                          <span className="text-[10px] text-gray-400">auto</span>
                        </div>
                        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2.5">
                          <p className="text-[10px] text-gray-400 mb-1">Document root causes identified → ticks above</p>
                          <textarea rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                            placeholder="e.g. Night shift nurses report inadequate handover time…"
                            value={rcFindings}
                            onChange={(e) => setRcFindings(e.target.value)}
                            onBlur={() => { const t = rcFindings.trim(); rootCauseMutation.mutate({ findings: t, findingsDocumented: !!t }); }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Issues created */}
                  {(() => {
                    const count   = (relatedWork as any[]).length;
                    const checked = count > 0;
                    return (
                      <div className={`rounded-lg border overflow-hidden ${checked ? 'border-green-200' : 'border-gray-200'}`}>
                        <div className={`flex items-center gap-3 px-3 py-2.5 ${checked ? 'bg-green-50' : 'bg-white'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {checked && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={`text-sm flex-1 ${checked ? 'text-green-700 line-through' : 'text-gray-700'}`}>Issues created from findings</span>
                          {count > 0 && <span className="text-[10px] font-bold text-blue-600">{count}</span>}
                          <span className="text-[10px] text-gray-400">auto</span>
                        </div>
                        <div className="border-t border-gray-100 px-3 py-2.5 space-y-2">
                          {(relatedWork as any[]).map((issue) => (
                            <div key={issue.id} className="space-y-0.5">
                              <a href={`/issues/${issue.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 group">
                                <AlertCircle className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
                                <span className="flex-1 truncate font-medium">{issue.title}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  issue.status === 'RESOLVED' || issue.status === 'CLOSED' ? 'bg-green-100 text-green-700' :
                                  issue.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                }`}>{issue.status.replace(/_/g, ' ')}</span>
                              </a>
                              {(issue.tasks ?? []).map((task: any) => (
                                <div key={task.id} className="flex items-center gap-2 pl-5 text-xs text-gray-500">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'DONE' ? 'bg-green-400' : task.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                                  <span className="flex-1 truncate">{task.title}</span>
                                  <span className={`text-[10px] ${task.status === 'DONE' ? 'text-green-600' : 'text-gray-400'}`}>{task.status.replace(/_/g, ' ')}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                          {!showCreateIssue ? (
                            <button onClick={() => setShowCreateIssue(true)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                              <Plus className="w-3.5 h-3.5" /> Create issue from finding
                            </button>
                          ) : (
                            <div className="space-y-2 pt-1">
                              <input
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="Issue title…"
                                value={newIssue.title}
                                onChange={(e) => setNewIssue((n) => ({ ...n, title: e.target.value }))}
                              />
                              <div className="flex gap-2">
                                <select value={newIssue.severity} onChange={(e) => setNewIssue((n) => ({ ...n, severity: e.target.value }))}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                                  {['CRITICAL','HIGH','MEDIUM','LOW'].map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button onClick={() => createIssueMutation.mutate()}
                                  disabled={!newIssue.title.trim() || createIssueMutation.isPending}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                                  {createIssueMutation.isPending ? 'Creating…' : 'Create'}
                                </button>
                                <button onClick={() => setShowCreateIssue(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 4. Team agreed */}
                  <CheckRow checked={!!rcCl.teamAgreed} label="Team agreed on root causes"
                    onClick={() => rootCauseMutation.mutate({ teamAgreed: !rcCl.teamAgreed })}
                  />
                </div>
              )}
            </div>

            {/* REMEDIATION */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button type="button" onClick={() => setRemOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700 tracking-wide">REMEDIATION</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${remDone === 3 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                    {remDone}/3 done
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${remOpen ? 'rotate-180' : ''}`} />
              </button>

              {remOpen && (
                <div className="border-t border-gray-50 px-5 pb-5 pt-3 space-y-2">

                  {/* 1. Action plan */}
                  {(() => {
                    const drafted = !!remCl.actionPlanDrafted;
                    return (
                      <div className={`rounded-lg border overflow-hidden ${drafted ? 'border-green-200' : 'border-gray-200'}`}>
                        <div className={`flex items-center gap-3 px-3 py-2.5 ${drafted ? 'bg-green-50' : 'bg-white'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${drafted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {drafted && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={`text-sm flex-1 ${drafted ? 'text-green-700 line-through' : 'text-gray-700'}`}>Action plan drafted</span>
                          <span className="text-[10px] text-gray-400">auto</span>
                        </div>
                        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2.5">
                          <p className="text-[10px] text-gray-400 mb-1">Outline remediation actions → ticks above</p>
                          <textarea rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                            placeholder="e.g. 1. Revise handover protocol — owner: Charge Nurse, due May 15&#10;2. Escalation training — owner: HR, due May 30…"
                            value={remPlan}
                            onChange={(e) => setRemPlan(e.target.value)}
                            onBlur={() => { const t = remPlan.trim(); remediationMutation.mutate({ actionPlan: t, actionPlanDrafted: !!t }); }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Issue tracker */}
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white">
                      <BarChart2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">Issue resolution progress</span>
                      <span className="text-[10px] font-bold text-blue-600">
                        {(relatedWork as any[]).filter((i) => ['RESOLVED','CLOSED'].includes(i.status)).length}/{(relatedWork as any[]).length}
                      </span>
                    </div>
                    {(relatedWork as any[]).length > 0 && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {(relatedWork as any[]).map((issue) => (
                          <div key={issue.id} className="px-3 py-2 space-y-1.5 hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${issue.status === 'RESOLVED' || issue.status === 'CLOSED' ? 'text-green-400' : issue.status === 'IN_PROGRESS' ? 'text-blue-400' : 'text-gray-300'}`} />
                              <span className="flex-1 text-sm font-medium text-gray-700 truncate">{issue.title}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${issue.status === 'RESOLVED' || issue.status === 'CLOSED' ? 'bg-green-100 text-green-700' : issue.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                {issue.status.replace(/_/g, ' ')}
                              </span>
                              <a href={`/issues/${issue.id}`} className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0">
                                <SquarePen className="w-3 h-3" /> Tasks
                              </a>
                            </div>
                            {(issue.tasks ?? []).length > 0 && (
                              <div className="pl-5 space-y-1">
                                {(issue.tasks ?? []).map((task: any) => (
                                  <div key={task.id} className="flex items-center gap-2 text-xs text-gray-500">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'DONE' ? 'bg-green-400' : task.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                                    <span className="flex-1 truncate">{task.title}</span>
                                    <span className={`text-[10px] ${task.status === 'DONE' ? 'text-green-600' : 'text-gray-400'}`}>{task.status.replace(/_/g, ' ')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(relatedWork as any[]).length === 0 && (
                      <p className="text-xs text-gray-400 px-3 py-2">No issues linked yet — create them in Root Cause Analysis</p>
                    )}
                  </div>

                  {/* 3. Tasks assigned */}
                  <CheckRow checked={!!remCl.tasksAssigned} label="Tasks assigned with owners & due dates"
                    onClick={() => remediationMutation.mutate({ tasksAssigned: !remCl.tasksAssigned })}
                  />

                  {/* 4. Progress reviewed */}
                  <CheckRow checked={!!remCl.progressReviewed} label="Progress formally reviewed"
                    onClick={() => remediationMutation.mutate({ progressReviewed: !remCl.progressReviewed })}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Info tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: UserCircle, label: 'Owner',              value: program.ownerName ?? '—' },
                { icon: Calendar,   label: 'Target Launch',      value: program.targetLaunchDate ? formatDate(program.targetLaunchDate) : '—' },
                { icon: Calendar,   label: 'Target Completion',  value: program.targetCompletionDate ? formatDate(program.targetCompletionDate) : '—' },
                { icon: UserCircle, label: 'Approved By',        value: program.approverName ?? 'Pending' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-gray-400" style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Linked survey */}
            <div className="mt-6 pt-5 border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Linked Survey</p>
              {linkedSurvey ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-green-800 flex-1 truncate">{linkedSurvey.title}</p>
                  <a href={`/surveys/${program.linkedSurveyId}`}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No survey linked yet</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Sticky action footer ─────────────────────────────────────────────── */}
      {(program.status === 'DRAFT' || program.status === 'ACTIVE' || canApprove) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 z-20">
          <div className="max-w-3xl mx-auto space-y-2">

            {/* Submit for approval */}
            {program.status === 'DRAFT' && (
              <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                <ShieldCheck className="w-4 h-4" />
                {submitMutation.isPending ? 'Submitting…' : `Submit for ${program.scope === 'GLOBAL' ? 'SVP' : 'CNO'} Approval`}
              </button>
            )}

            {/* Approve / Reject */}
            {canApprove && !showReject && (
              <div className="flex gap-2">
                <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {approveMutation.isPending ? 'Approving…' : 'Approve'}
                </button>
                <button onClick={() => setShowReject(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl text-sm border border-red-200">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            )}

            {canApprove && showReject && (
              <div className="space-y-2">
                <textarea rows={2} placeholder="Reason for rejection…"
                  className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => rejectMutation.mutate()} disabled={!rejectReason.trim() || rejectMutation.isPending}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                    {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                  <button onClick={() => setShowReject(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </div>
            )}

            {/* Advance stage */}
            {program.status === 'ACTIVE' && (
              <div className="space-y-1.5">
                <button onClick={() => canAdvanceGated && advanceMutation.mutate()}
                  disabled={!canAdvanceGated || advanceMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                  {isLastStage ? (
                    <><CheckCircle2 className="w-4 h-4" /> {advanceMutation.isPending ? 'Completing…' : 'Mark Complete'}</>
                  ) : (
                    <><ChevronRight className="w-4 h-4" /> {advanceMutation.isPending ? 'Advancing…' : `Advance to ${nextStage?.label}`}</>
                  )}
                </button>
                {advanceBlockReason && (
                  <p className="text-[11px] text-center text-amber-600 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {advanceBlockReason}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
