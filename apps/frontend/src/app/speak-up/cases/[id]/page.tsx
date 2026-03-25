'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MessageCircle, CheckCircle2, Clock, AlertTriangle,
  ArrowUpCircle, Eye, ShieldCheck, Flag, User, Calendar,
  FileText, Zap, Link2, Plus, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type CaseStatus = 'NEW' | 'ACKNOWLEDGED' | 'SCHEDULED' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';

const STATUS_META: Record<CaseStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  NEW:          { label: 'New',         color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',   icon: MessageCircle },
  ACKNOWLEDGED: { label: 'Acknowledged',color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200', icon: Eye },
  SCHEDULED:    { label: 'Scheduled',   color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200', icon: Calendar },
  IN_PROGRESS:  { label: 'In Progress', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  icon: Clock },
  RESOLVED:     { label: 'Resolved',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',icon: CheckCircle2 },
  ESCALATED:    { label: 'Escalated',   color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',    icon: ArrowUpCircle },
};

const ACTIVITY_META: Record<string, { icon: any; color: string }> = {
  CREATED:           { icon: MessageCircle, color: 'text-blue-500' },
  STATUS_CHANGED:    { icon: ArrowUpCircle, color: 'text-purple-500' },
  NOTE_ADDED:        { icon: FileText,      color: 'text-gray-500' },
  MEETING_SCHEDULED: { icon: Calendar,      color: 'text-indigo-500' },
  OUTCOME_RECORDED:  { icon: CheckCircle2,  color: 'text-emerald-500' },
  ISSUE_LINKED:      { icon: Link2,         color: 'text-blue-500' },
  ESCALATED:         { icon: AlertTriangle, color: 'text-red-500' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDatetime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function daysAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return `${diff}d ago`;
}

function isSlaBreached(sla: string | null) {
  if (!sla) return false;
  return new Date(sla) < new Date();
}

function StatusBadge({ status }: { status: CaseStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.NEW;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${m.bg} ${m.color} border ${m.border}`}>
      <Icon className="w-3.5 h-3.5" />{m.label}
    </span>
  );
}

// ── Note Modal ────────────────────────────────────────────────────────────────

function NoteModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [content, setContent] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/speak-up/cases/${caseId}/notes`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['speak-up-case', caseId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Add Note</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5">
          <textarea
            rows={4}
            className="w-full border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Add a note to the case timeline…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
        </div>
        <div className="p-4 border-t flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !content.trim()}
            className="btn-primary flex-1 text-sm"
          >
            {mutation.isPending ? 'Saving…' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule Meeting Modal ────────────────────────────────────────────────────

function ScheduleModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [meetingDate, setMeetingDate] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/speak-up/cases/${caseId}/schedule`, { meetingDate, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['speak-up-case', caseId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Schedule Meeting</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting date <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Location, format, agenda items…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="p-4 border-t flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !meetingDate}
            className="btn-primary flex-1 text-sm"
          >
            {mutation.isPending ? 'Scheduling…' : 'Schedule Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Outcome Form ──────────────────────────────────────────────────────────────

function OutcomeForm({ caseId, existing, onClose }: { caseId: string; existing?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [rootCause, setRootCause]         = useState(existing?.rootCause ?? '');
  const [summary, setSummary]             = useState(existing?.summary ?? '');
  const [actionRequired, setActionRequired] = useState(existing?.actionRequired ?? '');
  const [owner, setOwner]                 = useState(existing?.owner ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/speak-up/cases/${caseId}/outcome`, { rootCause, summary, actionRequired, owner }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['speak-up-case', caseId] });
      onClose();
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to record outcome'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Record Meeting Outcome</h3>
            <p className="text-xs text-gray-500 mt-0.5">Required before the case can be resolved</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Root cause <span className="text-red-500">*</span></label>
            <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="What caused this concern?" value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting summary <span className="text-red-500">*</span></label>
            <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="What was discussed and agreed upon?" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action required <span className="text-red-500">*</span></label>
            <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="What concrete steps will be taken?" value={actionRequired} onChange={(e) => setActionRequired(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner <span className="text-red-500">*</span></label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Who is accountable for follow-through?" value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
        </div>
        <div className="p-4 border-t flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !rootCause || !summary || !actionRequired || !owner}
            className="btn-primary flex-1 text-sm"
          >
            {mutation.isPending ? 'Saving…' : 'Save Outcome'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity Timeline ─────────────────────────────────────────────────────────

function Timeline({ activities }: { activities: any[] }) {
  if (!activities?.length) return <p className="text-sm text-gray-400 py-4">No activity yet.</p>;

  return (
    <div className="space-y-0">
      {activities.map((a, i) => {
        const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.NOTE_ADDED;
        const Icon = meta.icon;
        const isLast = i === activities.length - 1;
        return (
          <div key={a.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>
            <div className={`pb-4 min-w-0 flex-1 ${isLast ? '' : ''}`}>
              <div className="flex items-baseline gap-2">
                <p className="text-sm text-gray-800">{a.content}</p>
                <span className="text-xs text-gray-400 flex-shrink-0">{daysAgo(a.createdAt)}</span>
              </div>
              {a.actorName && (
                <p className="text-xs text-gray-400 mt-0.5">by {a.actorName}</p>
              )}
              <p className="text-xs text-gray-300 mt-0.5">{fmtDatetime(a.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Detail Page ──────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [showNote, setShowNote]             = useState(false);
  const [showSchedule, setShowSchedule]     = useState(false);
  const [showOutcome, setShowOutcome]       = useState(false);
  const [outcomeExpanded, setOutcomeExpanded] = useState(true);
  const [actionError, setActionError]       = useState('');

  const { data: c, isLoading } = useQuery({
    queryKey: ['speak-up-case', id],
    queryFn: () => api.get(`/speak-up/cases/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const action = (endpoint: string) => ({
    mutationFn: () => api.post(`/speak-up/cases/${id}/${endpoint}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['speak-up-case', id] });
      qc.invalidateQueries({ queryKey: ['speak-up-cases'] });
      qc.invalidateQueries({ queryKey: ['speak-up-metrics'] });
      setActionError('');
    },
    onError: (e: any) => setActionError(e?.response?.data?.message ?? `Failed to ${endpoint}`),
  });

  const acknowledgeMutation  = useMutation(action('acknowledge'));
  const resolveMutation      = useMutation(action('resolve'));
  const escalateMutation     = useMutation(action('escalate'));
  const convertMutation      = useMutation(action('convert-to-issue'));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading case…</p>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Case not found.</p>
      </div>
    );
  }

  const status: CaseStatus = c.status;
  const sm = STATUS_META[status] ?? STATUS_META.NEW;
  const slaBreached = isSlaBreached(c.slaDeadline);
  const isPending = acknowledgeMutation.isPending || resolveMutation.isPending || escalateMutation.isPending || convertMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`border-b px-6 py-4 ${sm.bg}`}>
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push('/speak-up')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Speak Up
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-bold text-gray-500">{c.caseNumber}</span>
                <StatusBadge status={status} />
                {c.urgency === 'URGENT' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                    <AlertTriangle className="w-3 h-3" /> Urgent
                  </span>
                )}
                {slaBreached && status !== 'RESOLVED' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                    <Flag className="w-3 h-3" /> SLA Breached
                  </span>
                )}
              </div>
              <h1 className="text-lg font-semibold text-gray-900 mt-1.5 max-w-xl">
                {c.category?.charAt(0) + (c.category?.slice(1).toLowerCase() ?? '')} concern
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: detail + timeline ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</p>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{c.description ?? c.message}</p>
          </div>

          {/* Metadata grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Category</p>
                <p className="font-medium text-gray-800 capitalize">{c.category?.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Routed To</p>
                <p className="font-medium text-gray-800">{c.routedTo}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Privacy</p>
                <p className="font-medium text-gray-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                  {c.privacy === 'ANONYMOUS' ? 'Anonymous' : 'Confidential'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Submitted</p>
                <p className="font-medium text-gray-800">{fmtDate(c.createdAt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">SLA Deadline</p>
                <p className={`font-medium ${slaBreached && status !== 'RESOLVED' ? 'text-red-600' : 'text-gray-800'}`}>
                  {fmtDate(c.slaDeadline)}
                </p>
              </div>
              {c.meetingDate && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Meeting Date</p>
                  <p className="font-medium text-gray-800">{fmtDate(c.meetingDate)}</p>
                </div>
              )}
              {c.resolvedAt && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Resolved</p>
                  <p className="font-medium text-emerald-700">{fmtDate(c.resolvedAt)}</p>
                </div>
              )}
              {c.convertedToIssueId && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Linked Issue</p>
                  <p className="font-medium text-blue-700 truncate text-xs">{c.convertedToIssueId.slice(0, 12)}…</p>
                </div>
              )}
            </div>
          </div>

          {/* Outcome (if recorded) */}
          {c.outcome && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setOutcomeExpanded((x) => !x)}
              >
                <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Meeting Outcome Recorded
                </p>
                {outcomeExpanded ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4 text-emerald-600" />}
              </button>
              {outcomeExpanded && (
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Root Cause</p>
                    <p className="text-gray-800">{c.outcome.rootCause}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Summary</p>
                    <p className="text-gray-800">{c.outcome.summary}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Action Required</p>
                    <p className="text-gray-800">{c.outcome.actionRequired}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Owner</p>
                    <p className="text-gray-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />{c.outcome.owner}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowOutcome(true)}
                    className="text-xs text-emerald-700 hover:underline mt-1"
                  >
                    Edit outcome
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Activity timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Activity Timeline</p>
            <Timeline activities={c.activities ?? []} />
          </div>
        </div>

        {/* ── Right: actions ───────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Error */}
          {actionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{actionError}</p>
            </div>
          )}

          {/* Status actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Actions</p>

            {status === 'NEW' && (
              <button
                onClick={() => acknowledgeMutation.mutate()}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4" /> Acknowledge Case
              </button>
            )}

            {['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(status) && (
              <button
                onClick={() => setShowSchedule(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
              >
                <Calendar className="w-4 h-4" /> Schedule Meeting
              </button>
            )}

            {['SCHEDULED', 'IN_PROGRESS', 'ACKNOWLEDGED'].includes(status) && (
              <button
                onClick={() => setShowOutcome(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {c.outcome ? 'Update Outcome' : 'Record Outcome'}
              </button>
            )}

            {!['RESOLVED', 'ESCALATED'].includes(status) && c.outcome && (
              <button
                onClick={() => resolveMutation.mutate()}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-emerald-300 bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Resolve Case
              </button>
            )}

            {!['RESOLVED', 'ESCALATED'].includes(status) && (
              <button
                onClick={() => escalateMutation.mutate()}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <ArrowUpCircle className="w-4 h-4" /> Escalate
              </button>
            )}

            <button
              onClick={() => setShowNote(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Note
            </button>
          </div>

          {/* Resolve gate notice */}
          {!c.outcome && !['RESOLVED', 'ESCALATED'].includes(status) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800">
              <p className="font-semibold mb-0.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Outcome required to resolve
              </p>
              <p>Record the meeting outcome before this case can be marked resolved.</p>
            </div>
          )}

          {/* Convert to Issue */}
          {!c.convertedToIssueId && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Integrations</p>
              <button
                onClick={() => convertMutation.mutate()}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" /> Convert to Issue
              </button>
              <p className="text-[11px] text-gray-400 mt-2">Creates a tracked Issue and links it to this case.</p>
            </div>
          )}

          {c.convertedToIssueId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mb-1">
                <Link2 className="w-3.5 h-3.5" /> Linked Issue
              </p>
              <p className="text-xs text-blue-600 font-mono">{c.convertedToIssueId.slice(0, 18)}…</p>
            </div>
          )}

          {/* SLA info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">SLA</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Deadline</span>
                <span className={`font-medium ${slaBreached && status !== 'RESOLVED' ? 'text-red-600' : 'text-gray-700'}`}>
                  {fmtDate(c.slaDeadline)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Target</span>
                <span className="font-medium text-gray-700">{c.urgency === 'URGENT' ? '24h' : '72h'}</span>
              </div>
              {slaBreached && status !== 'RESOLVED' && (
                <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-semibold">
                  <Flag className="w-3 h-3" /> SLA breached — action needed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNote     && <NoteModal      caseId={id!} onClose={() => setShowNote(false)} />}
      {showSchedule && <ScheduleModal  caseId={id!} onClose={() => setShowSchedule(false)} />}
      {showOutcome  && <OutcomeForm    caseId={id!} existing={c.outcome} onClose={() => setShowOutcome(false)} />}
    </div>
  );
}
