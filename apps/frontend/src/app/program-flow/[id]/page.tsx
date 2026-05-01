'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, CheckCircle2, Circle, AlertCircle,
  Building2, Globe, X, Check, ChevronDown, ClipboardList,
  Flag, Megaphone, BarChart2, Wrench, ShieldCheck, AlertTriangle,
  BellRing, Activity, ExternalLink, SquarePen, Plus, ChevronRight,
  UserCircle, Calendar, FileText, Target, Sparkles, TrendingDown,
  Users, Star, Trash2, Lock,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { AIDisclaimer } from '@/components/ui/AIDisclaimer';

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
  const searchParams = useSearchParams();
  const toast = useToast();
  const qc = useQueryClient();
  const { hasRole } = useAuth();

  const initialTab: Tab = (() => {
    const t = searchParams?.get('tab');
    return t === 'details' || t === 'checklists' || t === 'info' || t === 'overview' ? t : 'overview';
  })();
  const [activeTab, setActiveTab]         = useState<Tab>(initialTab);
  const [rejectReason, setRejectReason]   = useState('');
  const [showReject, setShowReject]       = useState(false);
  const [cancelReason, setCancelReason]   = useState('');
  const [showCancel, setShowCancel]       = useState(false);
  const [surveyPicker, setSurveyPicker]   = useState(false);
  const [commMessage, setCommMessage]     = useState('');
  const [setupOpen, setSetupOpen]         = useState(false);
  const [execOpen, setExecOpen]           = useState(false);
  const [rootCauseOpen, setRootCauseOpen] = useState(false);
  const [remOpen, setRemOpen]             = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [newIssue, setNewIssue]           = useState({ title: '', severity: 'MEDIUM' });
  const [rcFindings, setRcFindings]       = useState('');
  const [showAiIssues, setShowAiIssues]   = useState(false);
  const [aiIssueDrafts, setAiIssueDrafts] = useState<{ title: string; description: string; severity: string; selected: boolean }[]>([]);
  const [enhancing, setEnhancing]         = useState<string | null>(null);
  const [suggesting, setSuggesting]       = useState(false);
  const [generatingCommMsg, setGeneratingCommMsg] = useState(false);
  const [editProblem, setEditProblem]     = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editCriteria, setEditCriteria]   = useState('');
  const [remPlan, setRemPlan]             = useState('');
  const [commOpen, setCommOpen]           = useState(false);
  const [valOpen, setValOpen]             = useState(false);
  const [commReport, setCommReport]       = useState('');
  const [valOutcomes, setValOutcomes]     = useState('');
  const [meetingAttendees, setMeetingAttendees] = useState('');
  const [meetingNotes, setMeetingNotes]         = useState('');

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

  // Used to grey-out surveys already linked to another program in the picker
  const { data: allPrograms = [] } = useQuery<any[]>({
    queryKey: ['programs'],
    queryFn: () => api.get('/programs').then((r) => r.data),
    staleTime: 60_000,
    enabled: surveyPicker,
  });
  // Only lock surveys that are actively linked to a non-terminal program
  const takenSurveyIds = new Set(
    (allPrograms as any[])
      .filter((p) => p.id !== id && p.linkedSurveyId && !['COMPLETED', 'CANCELLED'].includes(p.status))
      .map((p) => p.linkedSurveyId),
  );

  // Sync local text state on first load
  useEffect(() => {
    if (!program) return;
    setEditProblem(program.problemStatement ?? '');
    setEditObjective(program.objective ?? '');
    setEditCriteria(program.successCriteria ?? '');
    setCommMessage(program.setupChecklist?.communicationMessage ?? '');
    setRcFindings(program.rootCauseChecklist?.findings ?? '');
    setRemPlan(program.remediationChecklist?.actionPlan ?? '');
    setSetupOpen(program.currentStage === 'SETUP');
    setExecOpen(program.currentStage === 'EXECUTION');
    setRootCauseOpen(program.currentStage === 'ROOT_CAUSE');
    setRemOpen(program.currentStage === 'REMEDIATION');
    setCommReport(program.communicationChecklist?.report ?? '');
    setValOutcomes(program.validationChecklist?.outcomesDoc ?? '');
    setCommOpen(program.currentStage === 'COMMUNICATION');
    setValOpen(program.currentStage === 'VALIDATION');
    setMeetingAttendees(program.setupChecklist?.meetingAttendees ?? '');
    setMeetingNotes(program.setupChecklist?.meetingNotes ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  const inExecOrLater = program && ['EXECUTION', 'ROOT_CAUSE', 'REMEDIATION', 'COMMUNICATION', 'VALIDATION', 'COMPLETED'].includes(program.currentStage);
  const inRCOrLater   = program && (['ROOT_CAUSE', 'REMEDIATION', 'COMMUNICATION', 'VALIDATION'].includes(program.currentStage) || program.status === 'COMPLETED');
  const inRemOrLater  = program && (['REMEDIATION', 'COMMUNICATION', 'VALIDATION'].includes(program.currentStage) || program.status === 'COMPLETED');
  const inCommOrLater = program && (['COMMUNICATION', 'VALIDATION'].includes(program.currentStage) || program.status === 'COMPLETED');
  const inValOrLater  = program && (program.currentStage === 'VALIDATION' || program.status === 'COMPLETED');

  const { data: participation } = useQuery<any>({
    queryKey: ['participation', program?.linkedSurveyId, program?.id],
    queryFn: () => api.get('/responses/participation/status', {
      params: { surveyId: program.linkedSurveyId, programId: program.id },
    }).then((r) => r.data),
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

  const communicationMutation = useMutation({
    mutationFn: (u: Record<string, any>) => api.patch(`/programs/${id}/communication-checklist`, u),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update'),
  });

  const validationMutation = useMutation({
    mutationFn: (u: Record<string, any>) => api.patch(`/programs/${id}/validation-checklist`, u),
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

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/programs/${id}/cancel`, { reason: cancelReason }),
    onSuccess: () => { invalidate(); setShowCancel(false); setCancelReason(''); toast.success('Program cancelled'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to cancel'),
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

  const unlinkSurveyMutation = useMutation({
    mutationFn: () => api.patch(`/programs/${id}/unlink-survey`),
    onSuccess: () => { invalidate(); toast.success('Survey unlinked'); },
    onError: () => toast.error('Failed to unlink survey'),
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

  // ── Survey summary (results card) ─────────────────────────────────────────

  const { data: surveySummary, isError: surveySummaryError } = useQuery<any>({
    queryKey: ['survey-summary', id],
    queryFn: () => api.get(`/programs/${id}/survey-summary`).then((r) => r.data),
    enabled: !!program?.linkedSurveyId,
    staleTime: 5 * 60_000,
  });

  const updateProgramMutation = useMutation({
    mutationFn: (u: Record<string, any>) => api.patch(`/programs/${id}`, u),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to save'),
  });

  async function suggestObjective() {
    if (!editProblem.trim()) return;
    setSuggesting(true);
    try {
      const { data } = await api.post('/programs/ai-suggest-objective', { problemStatement: editProblem });
      setEditObjective(data.objective);
      setEditCriteria(data.successCriteria);
      updateProgramMutation.mutate({ objective: data.objective, successCriteria: data.successCriteria });
      toast.success('Objective & success criteria generated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Suggestion failed');
    } finally {
      setSuggesting(false);
    }
  }

  async function generateCommMessage() {
    setGeneratingCommMsg(true);
    try {
      const { data } = await api.post(`/programs/${id}/ai-communication-message`);
      setCommMessage(data.message);
      checklistMutation.mutate({ communicationMessage: data.message, communicationDrafted: true });
      toast.success('Communication message generated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Generation failed');
    } finally {
      setGeneratingCommMsg(false);
    }
  }

  // ── AI mutations ──────────────────────────────────────────────────────────

  const aiRootCausesMutation = useMutation({
    mutationFn: () => api.post(`/programs/${id}/ai-root-causes`).then((r) => r.data),
    onSuccess: (data) => {
      setRcFindings(data.suggestions);
      rootCauseMutation.mutate({ findings: data.suggestions, findingsDocumented: true });
      toast.success('Root causes suggested — edit as needed');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'AI suggestion failed'),
  });

  const aiIssuesMutation = useMutation({
    mutationFn: () => api.post(`/programs/${id}/ai-issues`).then((r) => r.data),
    onSuccess: (data) => {
      setAiIssueDrafts((data.issues ?? []).map((i: any) => ({ ...i, selected: true })));
      setShowAiIssues(true);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'AI suggestion failed'),
  });

  const createAiIssuesMutation = useMutation({
    mutationFn: async () => {
      const selected = aiIssueDrafts.filter((d) => d.selected);
      for (const issue of selected) {
        await api.post('/issues', { title: issue.title, description: issue.description, severity: issue.severity, programId: id, source: 'MANUAL' });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['related-work', id] });
      rootCauseMutation.mutate({ issuesCreated: true });
      setShowAiIssues(false);
      setAiIssueDrafts([]);
      toast.success('Issues created successfully');
    },
    onError: () => toast.error('Failed to create some issues'),
  });

  // ── AI text enhancement ───────────────────────────────────────────────────

  async function enhance(fieldKey: string, fieldContext: string, value: string, setter: (v: string) => void) {
    if (!value.trim()) return;
    setEnhancing(fieldKey);
    try {
      const { data } = await api.post('/programs/ai-enhance', { text: value, fieldContext });
      setter(data.enhanced);
      toast.success('Text enhanced');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Enhancement failed');
    } finally {
      setEnhancing(null);
    }
  }

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

  const canCancel = (hasRole('SVP') || hasRole('SUPER_ADMIN')) &&
    ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE'].includes(program.status);

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
    if (program.currentStage === 'COMMUNICATION' && !program.communicationChecklist?.employeesUpdated)
      return 'Notify employees of outcomes before advancing';
    if (program.currentStage === 'VALIDATION' && !program.validationChecklist?.successEvaluated)
      return 'Evaluate success criteria before completing';
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
  const commCl   = program.communicationChecklist ?? {};
  const valCl    = program.validationChecklist    ?? {};
  const commDone = ['reportPrepared', 'leadershipBriefed', 'employeesUpdated', 'documentationSaved'].filter(k => !!(commCl as any)[k]).length;
  const valDone  = ['followUpPlanned', 'metricsReviewed', 'successEvaluated', 'outcomesDocumented'].filter(k => !!(valCl as any)[k]).length;

  const checklistDone  = setupDone + execDone + rcDone + remDone + commDone + valDone;
  const checklistTotal = 23;
  const checklistDotColor =
    checklistDone === 0            ? 'bg-gray-300'
    : checklistDone < checklistTotal ? 'bg-yellow-400'
    :                                  'bg-green-500';

  const detailsFilled =
    [program.problemStatement, program.objective, program.successCriteria].filter(v => !!v?.trim()).length;
  const detailsDotColor =
    detailsFilled === 0 ? 'bg-gray-300'
    : detailsFilled < 3 ? 'bg-yellow-400'
    :                     'bg-green-500';
  const overviewDotColor = detailsDotColor;
  const infoDotColor     = 'bg-green-500';

  const tabDotColor: Record<Tab, string> = {
    overview:   overviewDotColor,
    details:    detailsDotColor,
    checklists: checklistDotColor,
    info:       infoDotColor,
  };

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

          {/* Stage circles — all 6 stages */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {STAGES.map((s, i) => {
              const done   = isCompleted || i < stageIdx;
              const active = !isCompleted && i === stageIdx;
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
              <span className={`w-2 h-2 rounded-full ${tabDotColor[key]}`} />
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
                { label: 'Communication',          done: commDone,  total: 4 },
                { label: 'Validation',             done: valDone,   total: 4 },
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

            {/* Problem statement */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Problem Statement</p>
                <button type="button"
                  onClick={() => enhance('editProblem', 'problem statement for a healthcare workforce improvement program', editProblem, setEditProblem)}
                  disabled={!editProblem.trim() || !!enhancing || suggesting}
                  className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Sparkles className="w-3 h-3" />{enhancing === 'editProblem' ? 'Enhancing…' : 'Enhance'}
                </button>
              </div>
              <textarea rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                value={editProblem}
                onChange={(e) => setEditProblem(e.target.value)}
                onBlur={() => editProblem.trim() !== program.problemStatement && updateProgramMutation.mutate({ problemStatement: editProblem.trim() })}
              />
              <AIDisclaimer />
            </div>

            {/* Objective */}
            <div className="border-t border-gray-50 pt-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Objective</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={suggestObjective}
                    disabled={!editProblem.trim() || suggesting || !!enhancing}
                    title="Generate objective & success criteria from problem statement"
                    className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Sparkles className="w-3 h-3" />{suggesting ? 'Suggesting…' : 'Suggest'}
                  </button>
                  {editObjective.trim() && (
                    <>
                      <span className="text-gray-200">|</span>
                      <button type="button"
                        onClick={() => enhance('editObjective', 'objective/goal for a healthcare workforce improvement program', editObjective, setEditObjective)}
                        disabled={!!enhancing || suggesting}
                        className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Sparkles className="w-3 h-3" />{enhancing === 'editObjective' ? 'Enhancing…' : 'Enhance'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <textarea rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                value={editObjective}
                onChange={(e) => setEditObjective(e.target.value)}
                onBlur={() => editObjective.trim() !== program.objective && updateProgramMutation.mutate({ objective: editObjective.trim() })}
              />
              <AIDisclaimer />
            </div>

            {/* Success criteria */}
            <div className="border-t border-gray-50 pt-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Success Criteria</p>
                {editCriteria.trim() && (
                  <button type="button"
                    onClick={() => enhance('editCriteria', 'success criteria / measurable outcomes for a healthcare workforce improvement program', editCriteria, setEditCriteria)}
                    disabled={!!enhancing || suggesting}
                    className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Sparkles className="w-3 h-3" />{enhancing === 'editCriteria' ? 'Enhancing…' : 'Enhance'}
                  </button>
                )}
              </div>
              <textarea rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                placeholder="e.g. Response rate >60%, actionable themes identified"
                value={editCriteria}
                onChange={(e) => setEditCriteria(e.target.value)}
                onBlur={() => editCriteria.trim() !== program.successCriteria && updateProgramMutation.mutate({ successCriteria: editCriteria.trim() })}
              />
              <AIDisclaimer />
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
                            value={meetingAttendees}
                            onChange={(e) => setMeetingAttendees(e.target.value)}
                            onBlur={() => checklistMutation.mutate({ meetingAttendees })}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[10px] text-gray-400">Notes</p>
                          <button type="button" onClick={() => enhance('meetingNotes', 'kick-off meeting notes for a healthcare workforce program', meetingNotes, setMeetingNotes)}
                            disabled={!meetingNotes.trim() || !!enhancing}
                            className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                            <Sparkles className="w-3 h-3" />{enhancing === 'meetingNotes' ? 'Enhancing…' : 'Enhance'}
                          </button>
                        </div>
                        <textarea rows={2}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="Key decisions…"
                          value={meetingNotes}
                          onChange={(e) => setMeetingNotes(e.target.value)}
                          onBlur={() => checklistMutation.mutate({ meetingNotes })}
                        />
                        <AIDisclaimer />
                      </div>
                    </div>
                  </div>

                  {/* Linked survey — position #2, auto-ticks questions drafted */}
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Linked Survey</p>
                    {program.linkedSurveyId ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <p className="text-sm text-green-700 flex-1 truncate">{linkedSurvey?.title ?? 'Survey linked'}</p>
                        <Link href={`/surveys/${program.linkedSurveyId}/edit?from=/program-flow/${id}`} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1 mr-1">
                          <ExternalLink className="w-3 h-3" /> Open
                        </Link>
                        <button
                          onClick={() => { if (window.confirm('Unlink this survey? This will reset the "Questions drafted" and "Scope defined" checkboxes.')) unlinkSurveyMutation.mutate(); }}
                          disabled={unlinkSurveyMutation.isPending}
                          className="text-[10px] text-red-500 hover:text-red-700 font-medium disabled:opacity-40">
                          Unlink
                        </button>
                      </div>
                    ) : (
                      !surveyPicker ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <button onClick={() => setSurveyPicker(true)}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            <Plus className="w-4 h-4" /> Link a survey
                          </button>
                          <span className="text-gray-300 text-xs">or</span>
                          <Link href={`/surveys/new?programId=${program.id}&from=/program-flow/${id}`}
                            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                            <Plus className="w-4 h-4" /> Create new &amp; link
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                            {(surveys as any[]).filter((s) => s.status !== 'ARCHIVED' && s.status !== 'CLOSED').map((s) => {
                              const taken = takenSurveyIds.has(s.id);
                              const takenBy = taken ? (allPrograms as any[]).find((p) => p.linkedSurveyId === s.id) : null;
                              return (
                                <button key={s.id} type="button"
                                  disabled={taken}
                                  onClick={() => linkSurveyMutation.mutate(s.id)}
                                  className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-50 last:border-0 ${taken ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}`}>
                                  <p className={`font-medium truncate ${taken ? 'text-gray-400' : 'text-gray-800'}`}>{s.title}</p>
                                  <p className="text-xs text-gray-400">
                                    {taken ? `Linked to "${takenBy?.name ?? 'another program'}"` : `${s.status} · ${s.type}`}
                                  </p>
                                </button>
                              );
                            })}
                            {(surveys as any[]).length === 0 && <p className="text-sm text-gray-400 px-3 py-3">No surveys available</p>}
                          </div>
                          <button type="button" onClick={() => setSurveyPicker(false)}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                            Cancel
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Questions drafted + scope — auto when survey linked */}
                  {CHECKLIST_ITEMS.filter(({ key }) => !['meetingScheduled','communicationDrafted','employeesNotified'].includes(key)).map(({ key, label }) => {
                    const checked = !!(cl as any)[key];
                    const isAuto  = (key === 'questionsDrafted' && !!program.linkedSurveyId) || (key === 'employeeScopeDefined' && surveyHasScope);
                    return (
                      <CheckRow key={key} checked={checked} label={label} auto={isAuto}
                        onClick={isAuto ? undefined : () => checklistMutation.mutate({ [key]: !checked })}
                      />
                    );
                  })}

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
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-gray-400">Message employees will receive → ticks above</p>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={generateCommMessage}
                                disabled={!program.problemStatement?.trim() || generatingCommMsg || !!enhancing}
                                title="Generate from problem statement & objective"
                                className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                                <Sparkles className="w-3 h-3" />{generatingCommMsg ? 'Generating…' : 'Generate'}
                              </button>
                              <button type="button" onClick={() => enhance('commMessage', 'employee communication message announcing a workforce survey', commMessage, setCommMessage)}
                                disabled={!commMessage.trim() || !!enhancing}
                                className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                                <Sparkles className="w-3 h-3" />{enhancing === 'commMessage' ? 'Enhancing…' : 'Enhance'}
                              </button>
                            </div>
                          </div>
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
                          <AIDisclaimer />
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              disabled={program.status !== 'ACTIVE' || !program.linkedSurveyId || !commMessage.trim() || sendAnnouncementMutation.isPending || notified}
                              onClick={() => sendAnnouncementMutation.mutate()}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-lg">
                              <Megaphone className="w-3.5 h-3.5" />
                              {sendAnnouncementMutation.isPending ? 'Sending…' : notified ? 'Sent ✓' : 'Send to Employees'}
                            </button>
                            {program.status !== 'ACTIVE'
                              ? <p className="text-[10px] text-amber-600">Available after SVP approval</p>
                              : !program.linkedSurveyId
                                ? <p className="text-[10px] text-amber-600">Link a survey first</p>
                                : null
                            }
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
            <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!inExecOrLater ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
              <button type="button" onClick={() => inExecOrLater && setExecOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-5 py-4 ${!inExecOrLater ? 'cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3">
                  {!inExecOrLater && <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                  <span className="text-sm font-bold text-gray-700 tracking-wide">EXECUTION ORCHESTRATOR</span>
                  {inExecOrLater
                    ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${execDone === 3 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>{execDone}/3 done</span>
                    : <span className="text-[11px] text-gray-400">Advance to Execution to unlock</span>
                  }
                </div>
                {inExecOrLater && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${execOpen ? 'rotate-180' : ''}`} />}
              </button>

              {execOpen && inExecOrLater && (
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

                  {/* Unique survey link for employees */}
                  {program.surveyToken && (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5 space-y-1.5">
                      <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Employee Survey Link</p>
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] text-indigo-700 bg-white border border-indigo-100 rounded px-2 py-1 flex-1 truncate">
                          {typeof window !== 'undefined' ? `${window.location.origin}/surveys/respond/${program.surveyToken ?? program.linkedSurveyId}` : `/surveys/respond/${program.surveyToken ?? program.linkedSurveyId}`}
                        </code>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/surveys/respond/${program.surveyToken ?? program.linkedSurveyId}`;
                            navigator.clipboard.writeText(url);
                            toast.success('Link copied');
                          }}
                          className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 rounded px-2 py-1 flex-shrink-0">
                          Copy
                        </button>
                      </div>
                      <p className="text-[10px] text-indigo-400">Unique to this program — responses are isolated from other programs</p>
                    </div>
                  )}

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
            <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!inRCOrLater ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
              <button type="button" onClick={() => inRCOrLater && setRootCauseOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-5 py-4 ${!inRCOrLater ? 'cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3">
                  {!inRCOrLater && <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                  <span className="text-sm font-bold text-gray-700 tracking-wide">ROOT CAUSE ANALYSIS</span>
                  {inRCOrLater
                    ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${rcDone === 4 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>{rcDone}/4 done</span>
                    : <span className="text-[11px] text-gray-400">Advance to Root Cause to unlock</span>
                  }
                </div>
                {inRCOrLater && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${rootCauseOpen ? 'rotate-180' : ''}`} />}
              </button>

              {rootCauseOpen && inRCOrLater && (
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
                        <Link href={`/surveys/${program.linkedSurveyId}/results?from=/program-flow/${id}`} onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700">
                          <ExternalLink className="w-3 h-3" /> View results
                        </Link>
                      )}
                    </button>

                    {/* Survey results summary card */}
                    {program.linkedSurveyId && surveySummary && (
                      <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-3 space-y-2.5">
                        {/* Stats row */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600 font-medium">{surveySummary.responseCount} responses</span>
                          </div>
                          {surveySummary.avgScore !== null && (
                            <div className="flex items-center gap-1.5">
                              <Star className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-xs font-semibold text-gray-700">Avg score: <span className={`${surveySummary.avgScore < 50 ? 'text-red-600' : surveySummary.avgScore < 70 ? 'text-amber-600' : 'text-green-600'}`}>{surveySummary.avgScore}/100</span></span>
                            </div>
                          )}
                        </div>

                        {/* Lowest scoring questions */}
                        {(surveySummary.lowestQuestions ?? []).length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1.5">
                              <TrendingDown className="w-3 h-3 text-red-400" />
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Lowest scoring</span>
                            </div>
                            <div className="space-y-1">
                              {(surveySummary.lowestQuestions as any[]).map((q: any) => (
                                <div key={q.id} className="flex items-center gap-2">
                                  <div className="flex-1 text-xs text-gray-600 truncate">{q.text}</div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${q.avg < 40 ? 'bg-red-100 text-red-700' : q.avg < 60 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>{q.avg}/100</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {surveySummary.responseCount === 0 && (
                          <p className="text-xs text-gray-400 italic">No responses yet.</p>
                        )}

                        {/* Links */}
                        <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                          <Link href={`/surveys/${program.linkedSurveyId}/results?from=/program-flow/${id}`}
                            className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700">
                            <ExternalLink className="w-3 h-3" /> View full results
                          </Link>
                          <span className="text-gray-300 text-[10px]">·</span>
                          <Link href={`/analytics?surveyId=${program.linkedSurveyId}`}
                            className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-700">
                            <BarChart2 className="w-3 h-3" /> More analytics available →
                          </Link>
                        </div>
                      </div>
                    )}

                    {program.linkedSurveyId && !surveySummary && !surveySummaryError && (
                      <div className="border-t border-gray-100 px-3 py-2">
                        <p className="text-[10px] text-gray-400">Loading survey results…</p>
                      </div>
                    )}
                    {program.linkedSurveyId && surveySummaryError && (
                      <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <p className="text-[10px] text-red-500">Could not load survey results</p>
                      </div>
                    )}
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
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-gray-400">Document root causes identified → ticks above</p>
                            <button
                              type="button"
                              onClick={() => aiRootCausesMutation.mutate()}
                              disabled={!program.linkedSurveyId || aiRootCausesMutation.isPending}
                              title={!program.linkedSurveyId ? 'Link a survey first' : 'AI-suggest root causes from survey data'}
                              className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                              <Sparkles className="w-3 h-3" />
                              {aiRootCausesMutation.isPending ? 'Thinking…' : 'AI suggest'}
                            </button>
                          </div>
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
                              <Link href={`/issues/${issue.id}?from=/program-flow/${id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 group">
                                <AlertCircle className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
                                <span className="flex-1 truncate font-medium">{issue.title}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  issue.status === 'RESOLVED' || issue.status === 'CLOSED' ? 'bg-green-100 text-green-700' :
                                  issue.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                }`}>{issue.status.replace(/_/g, ' ')}</span>
                              </Link>
                              {(issue.tasks ?? []).map((task: any) => (
                                <Link key={task.id} href={`/issues/${issue.id}?from=/program-flow/${id}`} className="flex items-center gap-2 pl-5 text-xs text-gray-500 hover:text-blue-600 group">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'DONE' ? 'bg-green-400' : task.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                                  <span className="flex-1 truncate group-hover:text-blue-600">{task.title}</span>
                                  <span className={`text-[10px] ${task.status === 'DONE' ? 'text-green-600' : 'text-gray-400'}`}>{task.status.replace(/_/g, ' ')}</span>
                                </Link>
                              ))}
                            </div>
                          ))}
                          {!showCreateIssue ? (
                            <div className="flex items-center gap-3 flex-wrap">
                              <button onClick={() => setShowCreateIssue(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                                <Plus className="w-3.5 h-3.5" /> Create issue from finding
                              </button>
                              <button
                                onClick={() => aiIssuesMutation.mutate()}
                                disabled={!rcFindings.trim() || aiIssuesMutation.isPending}
                                title={!rcFindings.trim() ? 'Save your findings first' : 'AI-suggest issues from findings'}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                                <Sparkles className="w-3.5 h-3.5" />
                                {aiIssuesMutation.isPending ? 'Thinking…' : 'AI suggest issues'}
                              </button>
                            </div>
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
            <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!inRemOrLater ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
              <button type="button" onClick={() => inRemOrLater && setRemOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-5 py-4 ${!inRemOrLater ? 'cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3">
                  {!inRemOrLater && <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                  <span className="text-sm font-bold text-gray-700 tracking-wide">REMEDIATION</span>
                  {inRemOrLater
                    ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${remDone === 3 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>{remDone}/3 done</span>
                    : <span className="text-[11px] text-gray-400">Advance to Remediation to unlock</span>
                  }
                </div>
                {inRemOrLater && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${remOpen ? 'rotate-180' : ''}`} />}
              </button>

              {remOpen && inRemOrLater && (
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
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-gray-400">Outline remediation actions → ticks above</p>
                            <button type="button" onClick={() => enhance('remPlan', 'remediation action plan for a healthcare workforce improvement program', remPlan, setRemPlan)}
                              disabled={!remPlan.trim() || !!enhancing}
                              className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                              <Sparkles className="w-3 h-3" />{enhancing === 'remPlan' ? 'Enhancing…' : 'Enhance'}
                            </button>
                          </div>
                          <textarea rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                            placeholder="e.g. 1. Revise handover protocol — owner: Charge Nurse, due May 15&#10;2. Escalation training — owner: HR, due May 30…"
                            value={remPlan}
                            onChange={(e) => setRemPlan(e.target.value)}
                            onBlur={() => { const t = remPlan.trim(); remediationMutation.mutate({ actionPlan: t, actionPlanDrafted: !!t }); }}
                          />
                          <AIDisclaimer />
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
                              <Link href={`/issues/${issue.id}?from=/program-flow/${id}`} className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0">
                                <SquarePen className="w-3 h-3" /> View
                              </Link>
                            </div>
                            {(issue.tasks ?? []).length > 0 && (
                              <div className="pl-5 space-y-1">
                                {(issue.tasks ?? []).map((task: any) => (
                                  <Link key={task.id} href={`/issues/${issue.id}?from=/program-flow/${id}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 group">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'DONE' ? 'bg-green-400' : task.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                                    <span className="flex-1 truncate group-hover:text-blue-600">{task.title}</span>
                                    <span className={`text-[10px] ${task.status === 'DONE' ? 'text-green-600' : 'text-gray-400'}`}>{task.status.replace(/_/g, ' ')}</span>
                                  </Link>
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

            {/* COMMUNICATION */}
            <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!inCommOrLater ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
              <button type="button" onClick={() => inCommOrLater && setCommOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-5 py-4 ${!inCommOrLater ? 'cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3">
                  {!inCommOrLater && <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                  <span className="text-sm font-bold text-gray-700 tracking-wide">COMMUNICATION</span>
                  {inCommOrLater
                    ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${commDone === 4 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>{commDone}/4 done</span>
                    : <span className="text-[11px] text-gray-400">Advance to Communication to unlock</span>
                  }
                </div>
                {inCommOrLater && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${commOpen ? 'rotate-180' : ''}`} />}
              </button>

              {commOpen && inCommOrLater && (
                <div className="border-t border-gray-50 px-5 pb-5 pt-3 space-y-2">

                  {/* 1. Report prepared — auto from text */}
                  {(() => {
                    const prepared = !!commCl.reportPrepared;
                    return (
                      <div className={`rounded-lg border overflow-hidden ${prepared ? 'border-green-200' : 'border-gray-200'}`}>
                        <div className={`flex items-center gap-3 px-3 py-2.5 ${prepared ? 'bg-green-50' : 'bg-white'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${prepared ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {prepared && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={`text-sm flex-1 ${prepared ? 'text-green-700 line-through' : 'text-gray-700'}`}>Findings report / presentation prepared</span>
                          <span className="text-[10px] text-gray-400">auto</span>
                        </div>
                        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-gray-400">Document outcomes and findings to share → ticks above</p>
                            <button type="button" onClick={() => enhance('commReport', 'findings report / leadership communication for a healthcare workforce program', commReport, setCommReport)}
                              disabled={!commReport.trim() || !!enhancing}
                              className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                              <Sparkles className="w-3 h-3" />{enhancing === 'commReport' ? 'Enhancing…' : 'Enhance'}
                            </button>
                          </div>
                          <textarea rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                            placeholder="e.g. Turnover reduced by 12% after revised handover protocol. Night shift satisfaction improved 23 points…"
                            value={commReport}
                            onChange={(e) => setCommReport(e.target.value)}
                            onBlur={() => { const t = commReport.trim(); communicationMutation.mutate({ report: t, reportPrepared: !!t }); }}
                          />
                          <AIDisclaimer />
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Leadership briefed — manual */}
                  <CheckRow checked={!!commCl.leadershipBriefed} label="Leadership briefed on outcomes"
                    onClick={() => communicationMutation.mutate({ leadershipBriefed: !commCl.leadershipBriefed })}
                  />

                  {/* 3. Employees updated — auto from send button */}
                  {(() => {
                    const updated = !!commCl.employeesUpdated;
                    return (
                      <div className={`rounded-lg border overflow-hidden ${updated ? 'border-green-200' : 'border-gray-200'}`}>
                        <div className={`flex items-center gap-3 px-3 py-2.5 ${updated ? 'bg-green-50' : 'bg-white'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${updated ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {updated && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={`text-sm flex-1 ${updated ? 'text-green-700 line-through' : 'text-gray-700'}`}>Employees informed of actions taken</span>
                          <span className="text-[10px] text-gray-400">auto</span>
                        </div>
                        {!updated && (
                          <div className="border-t border-gray-100 bg-amber-50/40 px-3 py-2">
                            <button
                              disabled={!program.linkedSurveyId || !commReport.trim()}
                              onClick={() => {
                                const audienceMode = program.scope === 'GLOBAL' ? 'SYSTEM' : 'COMBINATION';
                                const targetOrgUnitIds = program.scope === 'GLOBAL' ? [] : (program.targetHospitalIds ?? []);
                                api.post('/announcements', {
                                  title: `Update: ${program.name} — Actions taken`,
                                  body: commReport.trim() || `We have completed our review and taken action on the findings from the ${program.name} program. Thank you for your participation.`,
                                  type: 'GENERAL', priority: 'MEDIUM', audienceMode, targetOrgUnitIds,
                                  linkedSurveyId: program.linkedSurveyId,
                                }).then(({ data: ann }) => api.post(`/announcements/${ann.id}/publish`))
                                  .then(() => { communicationMutation.mutate({ employeesUpdated: true }); toast.success('Employees notified of outcomes'); })
                                  .catch(() => toast.error('Failed to send announcement'));
                              }}
                              className="flex items-center gap-2 text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Megaphone className="w-3.5 h-3.5" />
                              Send outcome announcement to employees
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 4. Documentation saved — manual */}
                  <CheckRow checked={!!commCl.documentationSaved} label="Documentation archived / published"
                    onClick={() => communicationMutation.mutate({ documentationSaved: !commCl.documentationSaved })}
                  />
                </div>
              )}
            </div>

            {/* VALIDATION */}
            <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!inValOrLater ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
              <button type="button" onClick={() => inValOrLater && setValOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-5 py-4 ${!inValOrLater ? 'cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3">
                  {!inValOrLater && <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                  <span className="text-sm font-bold text-gray-700 tracking-wide">VALIDATION</span>
                  {inValOrLater
                    ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${valDone === 4 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>{valDone}/4 done</span>
                    : <span className="text-[11px] text-gray-400">Advance to Validation to unlock</span>
                  }
                </div>
                {inValOrLater && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${valOpen ? 'rotate-180' : ''}`} />}
              </button>

              {valOpen && inValOrLater && (
                <div className="border-t border-gray-50 px-5 pb-5 pt-3 space-y-2">

                  {/* 1. Follow-up planned — manual */}
                  <CheckRow checked={!!valCl.followUpPlanned} label="Follow-up plan in place"
                    onClick={() => validationMutation.mutate({ followUpPlanned: !valCl.followUpPlanned })}
                  />

                  {/* 2. Metrics reviewed — manual */}
                  <CheckRow checked={!!valCl.metricsReviewed} label="Improvement metrics reviewed"
                    onClick={() => validationMutation.mutate({ metricsReviewed: !valCl.metricsReviewed })}
                  />

                  {/* 3. Success criteria evaluated — manual (gates advance) */}
                  <CheckRow checked={!!valCl.successEvaluated} label="Success criteria evaluated against original goals"
                    onClick={() => validationMutation.mutate({ successEvaluated: !valCl.successEvaluated })}
                  />

                  {/* 4. Outcomes documented — auto from text */}
                  {(() => {
                    const documented = !!valCl.outcomesDocumented;
                    return (
                      <div className={`rounded-lg border overflow-hidden ${documented ? 'border-green-200' : 'border-gray-200'}`}>
                        <div className={`flex items-center gap-3 px-3 py-2.5 ${documented ? 'bg-green-50' : 'bg-white'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${documented ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {documented && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={`text-sm flex-1 ${documented ? 'text-green-700 line-through' : 'text-gray-700'}`}>Program outcomes documented</span>
                          <span className="text-[10px] text-gray-400">auto</span>
                        </div>
                        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-gray-400">Document final outcomes and lessons learned → ticks above</p>
                            <button type="button" onClick={() => enhance('valOutcomes', 'program outcomes and lessons learned document for a healthcare workforce program', valOutcomes, setValOutcomes)}
                              disabled={!valOutcomes.trim() || !!enhancing}
                              className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                              <Sparkles className="w-3 h-3" />{enhancing === 'valOutcomes' ? 'Enhancing…' : 'Enhance'}
                            </button>
                          </div>
                          <textarea rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                            placeholder="e.g. Program achieved 85% of success criteria. Turnover reduced 12%. Key lesson: earlier manager engagement would have accelerated impact…"
                            value={valOutcomes}
                            onChange={(e) => setValOutcomes(e.target.value)}
                            onBlur={() => { const t = valOutcomes.trim(); validationMutation.mutate({ outcomesDoc: t, outcomesDocumented: !!t }); }}
                          />
                          <AIDisclaimer />
                        </div>
                      </div>
                    );
                  })()}
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
                  <Link href={`/surveys/${program.linkedSurveyId}/edit?from=/program-flow/${id}`}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No survey linked yet</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Sticky action footer ─────────────────────────────────────────────── */}
      {(program.status === 'DRAFT' || program.status === 'ACTIVE' || canApprove || canCancel) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 z-20">
          <div className="max-w-3xl mx-auto space-y-2">

            {/* Cancel — SVP/SUPER_ADMIN on non-terminal programs */}
            {canCancel && !showCancel && (
              <button onClick={() => setShowCancel(true)}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 font-medium py-2.5 rounded-xl text-sm border border-gray-200 hover:border-red-200 transition-colors">
                <X className="w-4 h-4" /> Cancel Program
              </button>
            )}
            {canCancel && showCancel && (
              <div className="space-y-2 border border-red-200 rounded-xl p-3 bg-red-50">
                <p className="text-xs font-semibold text-red-700">Cancel this program?</p>
                <textarea rows={2} placeholder="Reason for cancellation (optional)…"
                  className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white"
                  value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm">
                    {cancelMutation.isPending ? 'Cancelling…' : 'Confirm Cancel'}
                  </button>
                  <button onClick={() => { setShowCancel(false); setCancelReason(''); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Back</button>
                </div>
              </div>
            )}

            {/* Submit for approval — only after Setup checklist is fully completed */}
            {program.status === 'DRAFT' && setupDone === 5 && (
              <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                <ShieldCheck className="w-4 h-4" />
                {submitMutation.isPending ? 'Submitting…' : `Submit for ${program.scope === 'GLOBAL' ? 'SVP' : 'CNO'} Approval`}
              </button>
            )}
            {program.status === 'DRAFT' && setupDone < 5 && (
              <p className="w-full text-center text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4">
                Complete the Setup checklist ({setupDone}/5) to unlock approval
              </p>
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
      {/* ── AI Issues Modal ───────────────────────────────────────────────── */}
      {showAiIssues && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" /> AI-Suggested Issues
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Select, edit, then create. Uncheck any you don't need.</p>
              </div>
              <button onClick={() => setShowAiIssues(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
              {aiIssueDrafts.map((draft, i) => (
                <div key={i} className={`border rounded-xl p-3 space-y-2 transition-colors ${draft.selected ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={draft.selected}
                      onChange={(e) => setAiIssueDrafts((d) => d.map((x, idx) => idx === i ? { ...x, selected: e.target.checked } : x))}
                      className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <input
                        className="w-full text-sm font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        value={draft.title}
                        onChange={(e) => setAiIssueDrafts((d) => d.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                      />
                      <textarea rows={2}
                        className="w-full text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        value={draft.description}
                        onChange={(e) => setAiIssueDrafts((d) => d.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                      />
                      <select
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                        value={draft.severity}
                        onChange={(e) => setAiIssueDrafts((d) => d.map((x, idx) => idx === i ? { ...x, severity: e.target.value } : x))}>
                        {['CRITICAL','HIGH','MEDIUM','LOW'].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <button onClick={() => setAiIssueDrafts((d) => d.filter((_, idx) => idx !== i))}
                      className="text-gray-300 hover:text-red-400 mt-0.5 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400">{aiIssueDrafts.filter((d) => d.selected).length} of {aiIssueDrafts.length} selected</span>
              <div className="flex gap-2">
                <button onClick={() => setShowAiIssues(false)} className="btn-secondary text-sm px-4">Cancel</button>
                <button
                  onClick={() => createAiIssuesMutation.mutate()}
                  disabled={!aiIssueDrafts.some((d) => d.selected) || createAiIssuesMutation.isPending}
                  className="btn-primary text-sm px-4 disabled:opacity-40">
                  {createAiIssuesMutation.isPending ? 'Creating…' : `Create ${aiIssueDrafts.filter((d) => d.selected).length} issue${aiIssueDrafts.filter((d) => d.selected).length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
