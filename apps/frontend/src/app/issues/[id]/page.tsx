'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, AlertCircle, X, CircleDot, Trash2, Pencil,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { useEscapeKey } from '@/hooks/useEscapeKey';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Issue {
  id: string;
  title: string;
  description?: string;
  objective?: string;
  rootCauseSummary?: string;
  successCriteria?: string;
  status: string;
  severity: string;
  issueLevel: string;
  priority: string;
  source: string;
  category?: string;
  subcategory?: string;
  hospital?: string;
  ownerRole?: string;
  ownerId?: string;
  dueDate?: string;
  baselineScore?: number;
  targetThreshold?: number;
  statusNote?: string;
  reopenCount?: number;
  surveyId?: string;
  surveyCycleId?: string;
  orgUnit?: { id: string; name: string; level: string; parent?: { name: string } };
  createdAt: string;
  updatedAt: string;
}

interface HistoryEntry {
  id: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt: string;
  changedBy?: { firstName?: string; lastName?: string; email?: string };
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<string, Array<{ label: string; value: string }>> = {
  OPEN:                 [{ label: 'Action Planned', value: 'ACTION_PLANNED' }, { label: 'In Progress', value: 'IN_PROGRESS' }],
  ACTION_PLANNED:       [{ label: 'In Progress', value: 'IN_PROGRESS' }, { label: 'Back to Open', value: 'OPEN' }],
  IN_PROGRESS:          [{ label: 'Awaiting Validation', value: 'AWAITING_VALIDATION' }, { label: 'Blocked', value: 'BLOCKED' }],
  BLOCKED:              [{ label: 'In Progress', value: 'IN_PROGRESS' }, { label: 'Action Planned', value: 'ACTION_PLANNED' }],
  AWAITING_VALIDATION:  [{ label: 'Resolved', value: 'RESOLVED' }, { label: 'Back to In Progress', value: 'IN_PROGRESS' }],
  RESOLVED:             [{ label: 'Close', value: 'CLOSED' }, { label: 'Reopen', value: 'REOPENED' }],
  CLOSED:               [{ label: 'Reopen', value: 'REOPENED' }],
  REOPENED:             [{ label: 'Action Planned', value: 'ACTION_PLANNED' }, { label: 'In Progress', value: 'IN_PROGRESS' }],
};

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    OPEN: 'bg-gray-100 text-gray-700',
    ACTION_PLANNED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    AWAITING_VALIDATION: 'bg-purple-100 text-purple-700',
    BLOCKED: 'bg-red-100 text-red-700',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-700 text-white',
    REOPENED: 'bg-orange-100 text-orange-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function levelBadgeClass(level: string) {
  const map: Record<string, string> = {
    UNIT: 'bg-blue-100 text-blue-700',
    DEPARTMENT: 'bg-indigo-100 text-indigo-700',
    HOSPITAL: 'bg-amber-100 text-amber-700',
    SYSTEM: 'bg-red-100 text-red-700',
  };
  return map[level] ?? 'bg-gray-100 text-gray-600';
}

function severityBadgeClass(severity: string) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700',
  };
  return map[severity] ?? 'bg-gray-100 text-gray-600';
}

function planStatusClass(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    ACTIVE: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-green-100 text-green-700',
    ON_HOLD: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function labelify(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Status Transition Panel ──────────────────────────────────────────────────

function StatusCard({ issue }: { issue: Issue }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const transitions = STATUS_TRANSITIONS[issue.status] ?? [];

  const updateStatus = useMutation({
    mutationFn: ({ status, statusNote, isReopen }: { status: string; statusNote: string; isReopen: boolean }) => {
      if (isReopen) {
        return api.post(`/issues/${issue.id}/reopen`, { reason: statusNote });
      }
      return api.patch(`/issues/${issue.id}`, { status, statusNote: statusNote || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue', issue.id] });
      qc.invalidateQueries({ queryKey: ['issue-history', issue.id] });
      setPendingStatus(null);
      setNote('');
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  function handleTransition() {
    if (!pendingStatus) return;
    const isReopen = pendingStatus === 'REOPENED';
    if (isReopen && !note.trim()) return; // required for reopen
    updateStatus.mutate({ status: pendingStatus, statusNote: note, isReopen });
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm">Status</h3>
      <span className={`badge ${statusBadgeClass(issue.status)}`}>{labelify(issue.status)}</span>

      {issue.statusNote && (
        <p className="text-xs text-gray-500 italic">{issue.statusNote}</p>
      )}

      {transitions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Transition to:</p>
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <button
                key={t.value}
                onClick={() => setPendingStatus(pendingStatus === t.value ? null : t.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  pendingStatus === t.value
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400 hover:text-brand-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {pendingStatus && (
            <div className="space-y-2 pt-1">
              <textarea
                className="input text-sm"
                rows={2}
                placeholder={pendingStatus === 'REOPENED' ? 'Reason for reopening (required)' : 'Status note (optional)'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className="btn-primary text-xs py-1.5 px-3"
                  disabled={updateStatus.isPending || (pendingStatus === 'REOPENED' && !note.trim())}
                  onClick={handleTransition}
                >
                  {updateStatus.isPending ? 'Saving...' : 'Confirm'}
                </button>
                <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => { setPendingStatus(null); setNote(''); }}>
                  Cancel
                </button>
              </div>
              {updateStatus.isError && (
                <p className="text-xs text-red-600">Error updating status.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── History log ──────────────────────────────────────────────────────────────

function HistoryLog({ issueId }: { issueId: string }) {
  const { data: history = [], isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ['issue-history', issueId],
    queryFn: () => api.get(`/issues/${issueId}/history`).then((r) => r.data),
  });

  if (isLoading) return <div className="text-sm text-gray-400">Loading history...</div>;
  if (history.length === 0) return <div className="text-sm text-gray-400 italic">No history entries yet.</div>;

  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const actor = entry.changedBy
          ? `${entry.changedBy.firstName ?? ''} ${entry.changedBy.lastName ?? ''}`.trim() || entry.changedBy.email
          : 'System';
        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <CircleDot className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-gray-800">{labelify(entry.field)}</span>
                {entry.oldValue && entry.newValue && (
                  <span className="text-xs text-gray-500">
                    {entry.oldValue} → {entry.newValue}
                  </span>
                )}
              </div>
              {entry.note && <p className="text-xs text-gray-500 mt-0.5 italic">{entry.note}</p>}
              <p className="text-xs text-gray-400 mt-0.5">
                {actor} · {formatDate(entry.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Edit Issue Modal ─────────────────────────────────────────────────────────

function EditIssueModal({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title:            issue.title,
    description:      issue.description ?? '',
    objective:        issue.objective ?? '',
    rootCauseSummary: issue.rootCauseSummary ?? '',
    successCriteria:  issue.successCriteria ?? '',
    severity:         issue.severity,
    priority:         issue.priority,
    category:         issue.category ?? '',
    subcategory:      issue.subcategory ?? '',
    ownerRole:        issue.ownerRole ?? '',
    dueDate:          issue.dueDate ? issue.dueDate.slice(0, 10) : '',
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const toast = useToast();
  useEscapeKey(onClose);

  const update = useMutation({
    mutationFn: (data: any) => api.patch(`/issues/${issue.id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue', issue.id] });
      toast.success('Issue updated');
      onClose();
    },
    onError: () => toast.error('Failed to save issue'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload: any = {
      title:    form.title.trim(),
      severity: form.severity,
      priority: form.priority,
    };
    payload.description      = form.description.trim() || null;
    payload.objective        = form.objective.trim() || null;
    payload.rootCauseSummary = form.rootCauseSummary.trim() || null;
    payload.successCriteria  = form.successCriteria.trim() || null;
    payload.category         = form.category.trim() || null;
    payload.subcategory      = form.subcategory.trim() || null;
    payload.ownerRole        = form.ownerRole || null;
    payload.dueDate          = form.dueDate || null;
    update.mutate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Edit Issue</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input min-h-[80px] resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
            <textarea className="input resize-none" rows={2} value={form.objective} onChange={(e) => set('objective', e.target.value)} placeholder="What this remediation aims to achieve" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause Summary</label>
            <textarea className="input resize-none" rows={2} value={form.rootCauseSummary} onChange={(e) => set('rootCauseSummary', e.target.value)} placeholder="Why the problem exists — the underlying causes" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Success Criteria</label>
            <textarea className="input resize-none" rows={2} value={form.successCriteria} onChange={(e) => set('successCriteria', e.target.value)} placeholder="How you will know the remediation worked" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select className="input" value={form.severity} onChange={(e) => set('severity', e.target.value)}>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input className="input" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Patient Safety" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
              <input className="input" value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Role</label>
              <input className="input" value={form.ownerRole} onChange={(e) => set('ownerRole', e.target.value)} placeholder="e.g. CNO, Director" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input className="input" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
          </div>

          {update.isError && (
            <p className="text-sm text-red-600">Save failed. Please try again.</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!form.title.trim() || update.isPending}>
              {update.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('from') || '/issues';
  const [showEdit, setShowEdit] = useState(false);

  const { data: issue, isLoading, isError } = useQuery<Issue>({
    queryKey: ['issue', id],
    queryFn: () => api.get(`/issues/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const toast = useToast();

  const deleteIssue = useMutation({
    mutationFn: () => api.delete(`/issues/${id}`),
    onSuccess: () => { toast.success('Issue deleted'); router.push(fromUrl); },
    onError: () => toast.error('Failed to delete issue'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (isError || !issue) {
    return (
      <div className="text-center py-16 text-gray-400">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>Issue not found or failed to load.</p>
        <button className="mt-4 btn-secondary" onClick={() => router.push(fromUrl)}>Back to Issues</button>
      </div>
    );
  }

  const orgUnitLabel = issue.orgUnit
    ? (issue.orgUnit.parent ? `${issue.orgUnit.parent.name} > ${issue.orgUnit.name}` : issue.orgUnit.name)
    : null;

  const progressPct = issue.baselineScore != null && issue.targetThreshold != null && issue.targetThreshold > 0
    ? Math.min(100, Math.round((issue.baselineScore / issue.targetThreshold) * 100))
    : null;

  return (
    <div className="space-y-6">
      {/* Back + Title bar */}
      <div>
        <button
          onClick={() => router.push(fromUrl)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> {fromUrl.startsWith('/program-flow') ? 'Back to Program' : 'Back to Issues'}
        </button>

        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex-1 min-w-0">{issue.title}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`badge ${statusBadgeClass(issue.status)}`}>{labelify(issue.status)}</span>
            <span className={`badge ${severityBadgeClass(issue.severity)}`}>{issue.severity}</span>
            <span className={`badge ${levelBadgeClass(issue.issueLevel)}`}>{issue.issueLevel}</span>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50"
              onClick={() => setShowEdit(true)}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-40"
              disabled={deleteIssue.isPending}
              onClick={() => {
                if (window.confirm(`Delete "${issue.title}"? This will also remove all tasks, comments, and history. This cannot be undone.`)) {
                  deleteIssue.mutate();
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteIssue.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: main content (70%) */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Details card */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Details</h2>
            {issue.description && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{issue.description}</p>
            )}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {issue.category && (
                <>
                  <dt className="text-gray-500">Category</dt>
                  <dd className="text-gray-900">{issue.category}{issue.subcategory ? ` / ${issue.subcategory}` : ''}</dd>
                </>
              )}
              <dt className="text-gray-500">Source</dt>
              <dd className="text-gray-900">{labelify(issue.source)}</dd>
              {issue.surveyId && (
                <>
                  <dt className="text-gray-500">Survey</dt>
                  <dd className="text-gray-900 font-mono text-xs">{issue.surveyId.slice(0, 8)}…</dd>
                </>
              )}
              {orgUnitLabel && (
                <>
                  <dt className="text-gray-500">Org Unit</dt>
                  <dd className="text-gray-900">{orgUnitLabel}</dd>
                </>
              )}
              {issue.hospital && (
                <>
                  <dt className="text-gray-500">Hospital</dt>
                  <dd className="text-gray-900">{issue.hospital}</dd>
                </>
              )}
              <dt className="text-gray-500">Priority</dt>
              <dd className="text-gray-900">{issue.priority}</dd>
            </dl>
          </div>

          {/* Scores card */}
          {(issue.baselineScore != null || issue.targetThreshold != null) && (
            <div className="card space-y-3">
              <h2 className="font-semibold text-gray-900">Scores</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                {issue.baselineScore != null && (
                  <>
                    <dt className="text-gray-500">Baseline Score</dt>
                    <dd className="text-gray-900 font-semibold">{issue.baselineScore}</dd>
                  </>
                )}
                {issue.targetThreshold != null && (
                  <>
                    <dt className="text-gray-500">Target Threshold</dt>
                    <dd className="text-gray-900 font-semibold">{issue.targetThreshold}</dd>
                  </>
                )}
              </dl>
              {progressPct !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Baseline → Target</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${progressPct >= 100 ? 'bg-green-500' : progressPct >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Planning (objective / root cause / success criteria) */}
          {(issue.objective || issue.rootCauseSummary || issue.successCriteria) && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-gray-900">Planning</h2>
              {issue.objective && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Objective</p>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{issue.objective}</p>
                </div>
              )}
              {issue.rootCauseSummary && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Root Cause Summary</p>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{issue.rootCauseSummary}</p>
                </div>
              )}
              {issue.successCriteria && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Success Criteria</p>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{issue.successCriteria}</p>
                </div>
              )}
            </div>
          )}

          {/* History */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">History</h2>
            <HistoryLog issueId={id} />
          </div>
        </div>

        {/* Right sidebar (30%) */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">

          {/* Status card */}
          <StatusCard issue={issue} />

          {/* Assignment card */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Assignment</h3>
            <dl className="space-y-2 text-sm">
              {issue.ownerRole && (
                <>
                  <dt className="text-xs text-gray-500">Owner Role</dt>
                  <dd className="text-gray-900 font-medium">{issue.ownerRole}</dd>
                </>
              )}
              {issue.ownerId && (
                <>
                  <dt className="text-xs text-gray-500">Owner ID</dt>
                  <dd className="text-gray-600 font-mono text-xs">{issue.ownerId.slice(0, 8)}…</dd>
                </>
              )}
              {issue.dueDate && (
                <>
                  <dt className="text-xs text-gray-500 mt-2">Due Date</dt>
                  <dd className="text-gray-900">{formatDate(issue.dueDate)}</dd>
                </>
              )}
              <dt className="text-xs text-gray-500 mt-2">Issue Level</dt>
              <dd><span className={`badge ${levelBadgeClass(issue.issueLevel)}`}>{issue.issueLevel}</span></dd>
            </dl>
          </div>

          {/* Metadata card */}
          <div className="card space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm">Metadata</h3>
            <dl className="space-y-2 text-sm">
              <dt className="text-xs text-gray-500">Issue ID</dt>
              <dd className="text-gray-600 font-mono text-xs">{issue.id.slice(0, 8)}…</dd>
              <dt className="text-xs text-gray-500">Source</dt>
              <dd className="text-gray-900">{labelify(issue.source)}</dd>
              <dt className="text-xs text-gray-500">Created</dt>
              <dd className="text-gray-900">{formatDate(issue.createdAt)}</dd>
              {issue.reopenCount != null && issue.reopenCount > 0 && (
                <>
                  <dt className="text-xs text-gray-500">Reopen Count</dt>
                  <dd className="text-gray-900">{issue.reopenCount}</dd>
                </>
              )}
              {issue.surveyId && (
                <>
                  <dt className="text-xs text-gray-500">Linked Survey</dt>
                  <dd className="text-gray-600 font-mono text-xs">{issue.surveyId.slice(0, 8)}…</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditIssueModal issue={issue} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
