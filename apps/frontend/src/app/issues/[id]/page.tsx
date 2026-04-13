'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight, Check, Clock, AlertCircle, X,
  CheckCircle2, CircleDot, Trash2, Pencil,
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

interface Milestone {
  id: string;
  title: string;
  dueDate?: string;
  status: string;
  completedAt?: string;
}

interface ActionPlan {
  id: string;
  title: string;
  status: string;
  progress: number;
  objective?: string;
  plannedActions?: string[];
  rootCauseSummary?: string;
  successCriteria?: string;
  endDate?: string;
  notes?: string;
  ownerId?: string;
  milestones?: Milestone[];
  createdAt: string;
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

// ─── Add Milestone Form ───────────────────────────────────────────────────────

function AddMilestoneForm({ planId, onDone }: { planId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const toast = useToast();

  const add = useMutation({
    mutationFn: () => api.post(`/issues/action-plans/${planId}/milestones`, { title, dueDate: dueDate || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action-plans', id] });
      toast.success('Milestone added');
      onDone();
    },
    onError: () => toast.error('Failed to add milestone'),
  });

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-3 mt-2 space-y-2">
      <input
        className="input text-sm"
        placeholder="Milestone title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input type="date" className="input text-sm" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <div className="flex gap-2">
        <button
          className="btn-primary text-xs py-1 px-3"
          disabled={!title || add.isPending}
          onClick={() => add.mutate()}
        >
          {add.isPending ? 'Adding...' : 'Add'}
        </button>
        <button className="btn-secondary text-xs py-1 px-3" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Milestone Edit Form ──────────────────────────────────────────────────────

function MilestoneEditForm({
  milestone,
  onSave,
  onCancel,
  isSaving,
}: {
  milestone: Milestone;
  onSave: (title: string, dueDate: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(milestone.title);
  const [dueDate, setDueDate] = useState(
    milestone.dueDate ? milestone.dueDate.slice(0, 10) : '',
  );

  return (
    <div className="border border-dashed border-blue-200 rounded-lg p-3 space-y-2 bg-blue-50/30">
      <input
        className="input text-sm"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Milestone title"
      />
      <input
        type="date"
        className="input text-sm"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="btn-primary text-xs py-1 px-3"
          disabled={!title.trim() || isSaving}
          onClick={() => onSave(title.trim(), dueDate)}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn-secondary text-xs py-1 px-3" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Action Plan Card ─────────────────────────────────────────────────────────

function ActionPlanCard({ plan, issueId }: { plan: ActionPlan; issueId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [showObjective, setShowObjective] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editProgress, setEditProgress] = useState(String(plan.progress));
  const [editNotes, setEditNotes] = useState(plan.notes ?? '');
  const [editStatus, setEditStatus] = useState(plan.status);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const completeMilestone = useMutation({
    mutationFn: (milestoneId: string) =>
      api.patch(`/issues/milestones/${milestoneId}`, { status: 'COMPLETED', completedAt: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action-plans', issueId] });
      setConfirmCompleteId(null);
      toast.success('Milestone completed');
    },
    onError: () => toast.error('Failed to complete milestone'),
  });

  const deleteMilestone = useMutation({
    mutationFn: (milestoneId: string) => api.delete(`/issues/milestones/${milestoneId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['action-plans', issueId] }); toast.success('Milestone deleted'); },
    onError: () => toast.error('Failed to delete milestone'),
  });

  const editMilestone = useMutation({
    mutationFn: ({ id, title, dueDate }: { id: string; title: string; dueDate: string }) =>
      api.patch(`/issues/milestones/${id}`, { title, dueDate: dueDate || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action-plans', issueId] });
      setEditingMilestone(null);
      toast.success('Milestone updated');
    },
    onError: () => toast.error('Failed to update milestone'),
  });

  const updatePlan = useMutation({
    mutationFn: () =>
      api.patch(`/issues/action-plans/${plan.id}`, {
        progress: Number(editProgress),
        notes: editNotes || undefined,
        status: editStatus,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action-plans', issueId] });
      setShowEditForm(false);
      toast.success('Action plan updated');
    },
    onError: () => toast.error('Failed to update action plan'),
  });

  const now = new Date();

  function milestoneIcon(m: Milestone) {
    if (m.status === 'COMPLETED') return <Check className="w-4 h-4 text-green-500 flex-shrink-0" />;
    if (m.dueDate && new Date(m.dueDate) < now && m.status !== 'COMPLETED') return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    return <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />;
  }

  return (
    <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm">{plan.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge text-xs ${planStatusClass(plan.status)}`}>{labelify(plan.status)}</span>
            {plan.endDate && (
              <span className="text-xs text-gray-400">Due {formatDate(plan.endDate)}</span>
            )}
          </div>
        </div>
        <button
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
          onClick={() => setShowEditForm((v) => !v)}
        >
          {showEditForm ? 'Cancel' : 'Edit Plan'}
        </button>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{plan.progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, plan.progress)}%` }}
          />
        </div>
      </div>

      {/* Edit form */}
      {showEditForm && (
        <div className="border border-dashed border-blue-200 rounded-lg p-3 space-y-2 bg-blue-50/30">
          <div>
            <label className="text-xs font-medium text-gray-700">Progress (%)</label>
            <input type="number" min="0" max="100" className="input text-sm mt-1" value={editProgress} onChange={(e) => setEditProgress(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Status</label>
            <select className="input text-sm mt-1" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
              {['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{labelify(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <textarea className="input text-sm mt-1" rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary text-xs py-1 px-3"
              disabled={updatePlan.isPending}
              onClick={() => updatePlan.mutate()}
            >
              {updatePlan.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Objective collapsible */}
      {plan.objective && (
        <div>
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
            onClick={() => setShowObjective((v) => !v)}
          >
            {showObjective ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Objective
          </button>
          {showObjective && (
            <p className="text-sm text-gray-600 mt-1 pl-5">{plan.objective}</p>
          )}
        </div>
      )}

      {/* Planned actions collapsible */}
      {plan.plannedActions && plan.plannedActions.length > 0 && (
        <div>
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
            onClick={() => setShowActions((v) => !v)}
          >
            {showActions ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Planned Actions ({plan.plannedActions.length})
          </button>
          {showActions && (
            <ul className="mt-1 pl-5 space-y-1">
              {plan.plannedActions.map((action, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-gray-400 flex-shrink-0">{i + 1}.</span>
                  {action}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Milestones */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">Milestones</span>
          <button
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            onClick={() => setShowAddMilestone((v) => !v)}
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {plan.milestones && plan.milestones.length > 0 ? (
          <ul className="space-y-1.5">
            {plan.milestones.map((m) => (
              <li key={m.id}>
                {/* Edit inline form */}
                {editingMilestone?.id === m.id ? (
                  <MilestoneEditForm
                    milestone={editingMilestone}
                    onSave={(title, dueDate) => editMilestone.mutate({ id: m.id, title, dueDate })}
                    onCancel={() => setEditingMilestone(null)}
                    isSaving={editMilestone.isPending}
                  />
                ) : confirmCompleteId === m.id ? (
                  /* Confirm complete */
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800 flex-1">Mark <strong>{m.title}</strong> as complete?</span>
                    <button
                      className="text-xs font-medium text-green-700 hover:text-green-900 px-2 py-0.5 rounded bg-green-100 hover:bg-green-200"
                      disabled={completeMilestone.isPending}
                      onClick={() => completeMilestone.mutate(m.id)}
                    >
                      {completeMilestone.isPending ? 'Saving…' : 'Confirm'}
                    </button>
                    <button
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => setConfirmCompleteId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  /* Normal row */
                  <div className="flex items-center gap-2 group rounded px-1 py-0.5 hover:bg-gray-50">
                    {/* Complete toggle */}
                    <button
                      title={m.status !== 'COMPLETED' ? 'Mark complete' : 'Completed'}
                      className="flex-shrink-0"
                      onClick={() => m.status !== 'COMPLETED' && setConfirmCompleteId(m.id)}
                      disabled={m.status === 'COMPLETED'}
                    >
                      {milestoneIcon(m)}
                    </button>

                    {/* Title */}
                    <span className={`text-sm flex-1 ${m.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {m.title}
                    </span>

                    {/* Due date */}
                    {m.dueDate && (
                      <span className="text-xs text-gray-400">{formatDate(m.dueDate)}</span>
                    )}

                    {/* Edit / Delete — visible on hover */}
                    {m.status !== 'COMPLETED' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title="Edit milestone"
                          className="text-xs text-gray-400 hover:text-blue-600 px-1"
                          onClick={() => setEditingMilestone(m)}
                        >
                          Edit
                        </button>
                        <button
                          title="Delete milestone"
                          className="text-xs text-gray-400 hover:text-red-500 px-1"
                          disabled={deleteMilestone.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete milestone "${m.title}"? This cannot be undone.`)) {
                              deleteMilestone.mutate(m.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400 italic">No milestones yet</p>
        )}

        {showAddMilestone && (
          <AddMilestoneForm planId={plan.id} onDone={() => setShowAddMilestone(false)} />
        )}
      </div>
    </div>
  );
}

// ─── Add Action Plan Modal ────────────────────────────────────────────────────

function AddActionPlanModal({ issueId, onClose }: { issueId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    objective: '',
    rootCauseSummary: '',
    successCriteria: '',
    endDate: '',
    notes: '',
  });
  const [actions, setActions] = useState<string[]>(['']);

  const create = useMutation({
    mutationFn: () =>
      api.post(`/issues/${issueId}/action-plans`, {
        title: form.title,
        objective: form.objective || undefined,
        rootCauseSummary: form.rootCauseSummary || undefined,
        plannedActions: actions.filter(Boolean),
        successCriteria: form.successCriteria || undefined,
        endDate: form.endDate || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action-plans', issueId] });
      toast.success('Action plan created');
      onClose();
    },
    onError: () => toast.error('Failed to create action plan'),
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateAction(i: number, val: string) {
    setActions((a) => a.map((x, idx) => (idx === i ? val : x)));
  }

  function addAction() {
    setActions((a) => [...a, '']);
  }

  function removeAction(i: number) {
    setActions((a) => a.filter((_, idx) => idx !== i));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Action Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
            <textarea className="input" rows={2} value={form.objective} onChange={(e) => set('objective', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause Summary</label>
            <textarea className="input" rows={2} value={form.rootCauseSummary} onChange={(e) => set('rootCauseSummary', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Planned Actions</label>
            <div className="space-y-2">
              {actions.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder={`Action ${i + 1}`}
                    value={a}
                    onChange={(e) => updateAction(i, e.target.value)}
                  />
                  {actions.length > 1 && (
                    <button onClick={() => removeAction(i)} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addAction} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add action
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Success Criteria</label>
            <textarea className="input" rows={2} value={form.successCriteria} onChange={(e) => set('successCriteria', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" className="input" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {create.isError && (
            <p className="text-sm text-red-600">Error creating plan. Please try again.</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!form.title || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
    title:       issue.title,
    description: issue.description ?? '',
    severity:    issue.severity,
    priority:    issue.priority,
    category:    issue.category ?? '',
    subcategory: issue.subcategory ?? '',
    ownerRole:   issue.ownerRole ?? '',
    dueDate:     issue.dueDate ? issue.dueDate.slice(0, 10) : '',
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
    payload.description = form.description.trim() || null;
    payload.category    = form.category.trim() || null;
    payload.subcategory = form.subcategory.trim() || null;
    payload.ownerRole   = form.ownerRole || null;
    payload.dueDate     = form.dueDate || null;
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
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const { data: issue, isLoading, isError } = useQuery<Issue>({
    queryKey: ['issue', id],
    queryFn: () => api.get(`/issues/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: actionPlans = [], isLoading: plansLoading } = useQuery<ActionPlan[]>({
    queryKey: ['action-plans', id],
    queryFn: () => api.get(`/issues/${id}/action-plans`).then((r) => r.data),
    enabled: !!id,
  });

  const toast = useToast();

  const deleteIssue = useMutation({
    mutationFn: () => api.delete(`/issues/${id}`),
    onSuccess: () => { toast.success('Issue deleted'); router.push('/issues'); },
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
        <button className="mt-4 btn-secondary" onClick={() => router.push('/issues')}>Back to Issues</button>
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
          onClick={() => router.push('/issues')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Issues
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

          {/* Action Plans */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Action Plans</h2>
              <button
                onClick={() => setShowAddPlan(true)}
                className="btn-primary flex items-center gap-1.5 text-sm py-1.5"
              >
                <Plus className="w-4 h-4" /> Add Action Plan
              </button>
            </div>

            {plansLoading ? (
              <div className="text-sm text-gray-400">Loading plans...</div>
            ) : actionPlans.length === 0 ? (
              <div className="card text-center py-8 text-gray-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No action plans yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {actionPlans.map((plan) => (
                  <ActionPlanCard key={plan.id} plan={plan} issueId={id} />
                ))}
              </div>
            )}
          </div>

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

      {showAddPlan && (
        <AddActionPlanModal issueId={id} onClose={() => setShowAddPlan(false)} />
      )}

      {showEdit && (
        <EditIssueModal issue={issue} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
