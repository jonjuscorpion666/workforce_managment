'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, AlertCircle, ChevronDown, ChevronRight,
  ExternalLink, Clock, Calendar, User, Layers, CheckCheck,
  MessageSquare, Send, Trash2, Pencil,
} from 'lucide-react';
import BulkDeleteBar from '@/components/BulkDeleteBar';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Skeleton } from '@/components/ui/Skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';
type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  issueId?: string;
  milestoneId?: string;
  milestoneName?: string;
  ownerId?: string;
  assignedToId?: string;
  parentTaskId?: string;
  subTasks?: Task[];
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];

const STATUS_META: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  TODO:        { label: 'To Do',       color: 'bg-gray-100 text-gray-700',   dot: 'bg-gray-400'   },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400'  },
  BLOCKED:     { label: 'Blocked',     color: 'bg-red-100 text-red-700',     dot: 'bg-red-500'    },
  DONE:        { label: 'Done',        color: 'bg-green-100 text-green-700', dot: 'bg-green-500'  },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-gray-100 text-gray-400',   dot: 'bg-gray-300'   },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  HIGH:   { label: 'High',   color: 'bg-red-100 text-red-700'    },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  LOW:    { label: 'Low',    color: 'bg-green-100 text-green-700' },
};

const NEXT_STATUSES: Record<TaskStatus, TaskStatus[]> = {
  TODO:        ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['DONE', 'BLOCKED', 'TODO'],
  BLOCKED:     ['IN_PROGRESS', 'TODO'],
  DONE:        ['REOPENED' as any],
  CANCELLED:   ['TODO'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(task: Task) {
  return (
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'DONE' &&
    task.status !== 'CANCELLED'
  );
}

function userName(users: AppUser[], id?: string) {
  if (!id) return '—';
  const u = users.find((u) => u.id === id);
  return u ? `${u.firstName} ${u.lastName}` : '—';
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const m = PRIORITY_META[priority];
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>
      {m.label}
    </span>
  );
}

// ─── Types for issue/milestone pickers ───────────────────────────────────────

interface IssueSummary {
  id: string;
  title: string;
  status: string;
}

interface MilestoneSummary {
  id: string;
  title: string;
  dueDate?: string;
  status: string;
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({ onClose, users }: { onClose: () => void; users: AppUser[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as TaskPriority,
    assignedToId: '',
    dueDate: '',
    issueId: '',
    milestoneId: '',
  });

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Load all issues for the picker
  const { data: issues = [] } = useQuery<IssueSummary[]>({
    queryKey: ['issues-summary'],
    queryFn: () => api.get('/issues').then((r) => r.data),
  });

  // Load action plans (with milestones) when an issue is selected
  const { data: actionPlans = [] } = useQuery<{ id: string; title: string; milestones: MilestoneSummary[] }[]>({
    queryKey: ['issue-action-plans', form.issueId],
    queryFn: () => api.get(`/issues/${form.issueId}/action-plans`).then((r) => r.data),
    enabled: !!form.issueId,
  });

  const milestones: MilestoneSummary[] = actionPlans.flatMap((p) => p.milestones ?? []);

  function handleIssueChange(issueId: string) {
    setForm((f) => ({ ...f, issueId, milestoneId: '' }));
  }

  const create = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks-overdue'] });
      toast.success('Task created');
      onClose();
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload: any = {
      title: form.title.trim(),
      priority: form.priority,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.assignedToId)       payload.assignedToId = form.assignedToId;
    if (form.dueDate)            payload.dueDate = form.dueDate;
    if (form.issueId)            payload.issueId = form.issueId;
    if (form.milestoneId)        payload.milestoneId = form.milestoneId;
    create.mutate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Optional details…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input className="input" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
            <select className="input" value={form.assignedToId} onChange={(e) => set('assignedToId', e.target.value)}>
              <option value="">— Unassigned —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}{u.jobTitle ? ` — ${u.jobTitle}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Issue picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Linked Issue <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              className="input"
              value={form.issueId}
              onChange={(e) => handleIssueChange(e.target.value)}
            >
              <option value="">— None —</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>{issue.title}</option>
              ))}
            </select>
          </div>

          {/* Milestone picker — only shown when an issue with milestones is selected */}
          {form.issueId && milestones.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Milestone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                className="input"
                value={form.milestoneId}
                onChange={(e) => set('milestoneId', e.target.value)}
              >
                <option value="">— No milestone —</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!form.title.trim() || create.isPending}
            >
              {create.isPending ? 'Creating…' : 'Create Task'}
            </button>
          </div>

          {create.isError && (
            <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

interface TaskCommentData {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  createdAt: string;
}

function TaskDetailPanel({
  task,
  users,
  onClose,
  onUpdate,
  onEditSaved,
}: {
  task: Task;
  users: AppUser[];
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  onEditSaved: (updated: Task) => void;
}) {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [changingStatus, setChangingStatus] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editing, setEditing] = useState(false);
  useEscapeKey(onClose);
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description ?? '',
    priority: task.priority as string,
    assignedToId: task.assignedToId ?? '',
    ownerId: task.ownerId ?? '',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
  });

  const updateTask = useMutation({
    mutationFn: (data: any) => api.patch(`/tasks/${task.id}`, data).then((r) => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks-overdue'] });
      toast.success('Task saved');
      onEditSaved(updated);
      setEditing(false);
    },
    onError: () => {
      toast.error('Failed to save task');
    },
  });

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editData.title.trim()) return;
    const payload: any = {
      title: editData.title.trim(),
      priority: editData.priority,
    };
    payload.description  = editData.description.trim() || null;
    payload.assignedToId = editData.assignedToId || null;
    payload.ownerId      = editData.ownerId || null;
    payload.dueDate      = editData.dueDate || null;
    updateTask.mutate(payload);
  }

  const deleteTask = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks-overdue'] });
      toast.success('Task deleted');
      onClose();
    },
  });

  const { data: subtasks = [] } = useQuery<Task[]>({
    queryKey: ['subtasks', task.id],
    queryFn: () => api.get(`/tasks/${task.id}/subtasks`).then((r) => r.data),
  });

  const { data: comments = [] } = useQuery<TaskCommentData[]>({
    queryKey: ['task-comments', task.id],
    queryFn: () => api.get(`/tasks/${task.id}/comments`).then((r) => r.data),
  });

  const addComment = useMutation({
    mutationFn: (content: string) =>
      api.post(`/tasks/${task.id}/comments`, { content }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-comments', task.id] });
      setCommentText('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/tasks/${task.id}/comments/${commentId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-comments', task.id] }); toast.success('Comment deleted'); },
    onError: () => toast.error('Failed to delete comment'),
  });

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate(commentText.trim());
  }

  const overdue = isOverdue(task);
  const nextStatuses = NEXT_STATUSES[task.status] ?? [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* panel */}
      <div className="relative w-full sm:max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Task</p>
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!editing && (
              <button
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50"
                onClick={() => setEditing(true)}
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-40"
              disabled={deleteTask.isPending}
              onClick={() => {
                if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
                  deleteTask.mutate();
                }
              }}
            >
              <Trash2 className="w-3 h-3" />
              {deleteTask.isPending ? 'Deleting…' : 'Delete'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {overdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <AlertCircle className="w-3 h-3" /> Overdue
            </span>
          )}

          {/* Status change */}
          {nextStatuses.length > 0 && (
            <div className="relative ml-auto">
              <button
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => setChangingStatus((v) => !v)}
              >
                Change status ↓
              </button>
              {changingStatus && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                  {nextStatuses.map((s) => (
                    <button
                      key={s}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => { onUpdate(task.id, { status: s }); setChangingStatus(false); }}
                    >
                      <span className={`w-2 h-2 rounded-full ${STATUS_META[s]?.dot ?? 'bg-gray-300'}`} />
                      {STATUS_META[s]?.label ?? s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-5">

          {/* ── Edit form ── */}
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  className="input text-sm"
                  value={editData.title}
                  onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  className="input text-sm min-h-[72px] resize-none"
                  value={editData.description}
                  onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Priority</label>
                  <select className="input text-sm" value={editData.priority} onChange={(e) => setEditData((d) => ({ ...d, priority: e.target.value }))}>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Due Date</label>
                  <input className="input text-sm" type="date" value={editData.dueDate} onChange={(e) => setEditData((d) => ({ ...d, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assigned To</label>
                <select className="input text-sm" value={editData.assignedToId} onChange={(e) => setEditData((d) => ({ ...d, assignedToId: e.target.value }))}>
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}{u.jobTitle ? ` — ${u.jobTitle}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Owner</label>
                <select className="input text-sm" value={editData.ownerId} onChange={(e) => setEditData((d) => ({ ...d, ownerId: e.target.value }))}>
                  <option value="">— None —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}{u.jobTitle ? ` — ${u.jobTitle}` : ''}</option>
                  ))}
                </select>
              </div>
              {updateTask.isError && (
                <p className="text-xs text-red-600">Save failed. Please try again.</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-secondary text-sm" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="btn-primary text-sm" disabled={!editData.title.trim() || updateTask.isPending}>
                  {updateTask.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <>
          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Assigned To
              </p>
              <p className="text-sm text-gray-800">{userName(users, task.assignedToId)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Owner
              </p>
              <p className="text-sm text-gray-800">{userName(users, task.ownerId)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due Date
              </p>
              <p className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-800'}`}>
                {task.dueDate ? formatDate(task.dueDate) : '—'}
                {overdue && ' · Overdue'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Created
              </p>
              <p className="text-sm text-gray-800">{formatDate(task.createdAt)}</p>
            </div>
          </div>

          {/* Milestone */}
          {task.milestoneName && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Milestone
              </p>
              <p className="text-sm text-gray-800">{task.milestoneName}</p>
            </div>
          )}

          {/* Linked issue */}
          {task.issueId && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Linked Issue
              </p>
              <Link
                href={`/issues/${task.issueId}`}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View Issue
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Subtasks */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> Subtasks
              {subtasks.length > 0 && (
                <span className="ml-1 text-gray-500 font-normal normal-case">
                  ({subtasks.filter((s) => s.status === 'DONE').length}/{subtasks.length} done)
                </span>
              )}
            </p>

            {subtasks.length === 0 ? (
              <p className="text-sm text-gray-400">No subtasks</p>
            ) : (
              <div className="space-y-1.5">
                {subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_META[s.status]?.dot ?? 'bg-gray-300'}`} />
                    <span className={s.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700'}>
                      {s.title}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">{STATUS_META[s.status]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed at */}
          {task.completedAt && (
            <p className="text-xs text-gray-400">
              Completed {formatDate(task.completedAt)}
            </p>
          )}

          {/* Comments */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Comments
              {comments.length > 0 && (
                <span className="ml-1 text-gray-400 font-normal normal-case">({comments.length})</span>
              )}
            </p>

            {/* Comment list */}
            <div className="space-y-3 mb-3">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400">No comments yet</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="group flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                      {c.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-gray-800">{c.authorName}</span>
                        {c.authorRole && (
                          <span className="text-xs text-gray-400">{c.authorRole}</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{formatDate(c.createdAt)}</span>
                        {currentUser?.id === c.authorId && (
                          <button
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
                            onClick={() => deleteComment.mutate(c.id)}
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            <form onSubmit={submitComment} className="flex gap-2">
              <input
                className="input flex-1 text-sm py-1.5"
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button
                type="submit"
                disabled={!commentText.trim() || addComment.isPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  users,
  onSelect,
  onStatusChange,
  isChecked,
  onToggleCheck,
}: {
  task: Task;
  users: AppUser[];
  onSelect: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  isChecked?: boolean;
  onToggleCheck?: (id: string) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const overdue = isOverdue(task);
  const nextStatuses = NEXT_STATUSES[task.status] ?? [];

  return (
    <tr
      className={`hover:bg-gray-50 cursor-pointer group ${isChecked ? 'bg-red-50' : ''}`}
      onClick={() => onSelect(task)}
    >
      {onToggleCheck && (
        <td className="px-4 py-3 w-8" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="accent-red-600"
            checked={isChecked ?? false}
            onChange={() => onToggleCheck(task.id)}
          />
        </td>
      )}
      {/* Title */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_META[task.status]?.dot ?? 'bg-gray-300'}`} />
          <span className={`font-medium text-gray-900 text-sm truncate max-w-xs ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </span>
          {(task.subTasks?.length ?? 0) > 0 && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              +{task.subTasks!.length} sub
            </span>
          )}
        </div>
      </td>

      {/* Status — click to change */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative inline-block">
          <button
            className="flex items-center gap-1"
            onClick={() => setStatusOpen((v) => !v)}
          >
            <StatusBadge status={task.status} />
            <ChevronDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
          </button>
          {statusOpen && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => { onStatusChange(task.id, s); setStatusOpen(false); }}
                >
                  <span className={`w-2 h-2 rounded-full ${STATUS_META[s]?.dot ?? 'bg-gray-300'}`} />
                  {STATUS_META[s]?.label ?? s}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <PriorityBadge priority={task.priority} />
      </td>

      {/* Assigned to */}
      <td className="px-4 py-3 text-sm text-gray-600">
        {userName(users, task.assignedToId)}
      </td>

      {/* Due date */}
      <td className="px-4 py-3 text-sm">
        {task.dueDate ? (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {overdue && <AlertCircle className="w-3 h-3" />}
            {formatDate(task.dueDate)}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      {/* Linked issue */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {task.issueId ? (
          <Link
            href={`/issues/${task.issueId}`}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View Issue <ExternalLink className="w-3 h-3" />
          </Link>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

// ─── Status Group ─────────────────────────────────────────────────────────────

function StatusGroup({
  status,
  tasks,
  users,
  onSelect,
  onStatusChange,
  defaultOpen = true,
  selectedIds,
  onToggleCheck,
}: {
  status: TaskStatus;
  tasks: Task[];
  users: AppUser[];
  onSelect: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  defaultOpen?: boolean;
  selectedIds?: Set<string>;
  onToggleCheck?: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = STATUS_META[status];

  return (
    <div className="card p-0 overflow-hidden">
      {/* Group header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400" />
          : <ChevronRight className="w-4 h-4 text-gray-400" />
        }
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className="text-sm font-semibold text-gray-700">{meta.label}</span>
        <span className="text-xs text-gray-400 font-normal">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {onToggleCheck && (
                  <th className="px-4 py-2 w-8">
                    <input
                      type="checkbox"
                      className="accent-red-600"
                      checked={tasks.length > 0 && tasks.every((t) => selectedIds?.has(t.id))}
                      onChange={() => tasks.forEach((t) => {
                        const allSelected = tasks.every((x) => selectedIds?.has(x.id));
                        if (allSelected ? selectedIds?.has(t.id) : !selectedIds?.has(t.id)) onToggleCheck(t.id);
                      })}
                    />
                  </th>
                )}
                <th className="px-4 py-2 text-left w-[35%]">Title</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Priority</th>
                <th className="px-4 py-2 text-left">Assigned To</th>
                <th className="px-4 py-2 text-left">Due Date</th>
                <th className="px-4 py-2 text-left">Issue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  users={users}
                  onSelect={onSelect}
                  onStatusChange={onStatusChange}
                  isChecked={selectedIds?.has(t.id)}
                  onToggleCheck={onToggleCheck}
                />
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={onToggleCheck ? 7 : 6} className="px-4 py-5 text-center text-sm text-gray-400">
                    No {meta.label.toLowerCase()} tasks
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleTaskCheck(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => api.post('/tasks/bulk-delete', { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedIds(new Set());
      toast.success('Tasks deleted');
    },
  });
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [filterOverdue, setFilterOverdue] = useState(false);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
  });

  const { data: overdueTasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks-overdue'],
    queryFn: () => api.get('/tasks/overdue').then((r) => r.data),
  });

  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      api.patch(`/tasks/${id}`, data).then((r) => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks-overdue'] });
      toast.success('Task updated');
      // keep detail panel in sync
      setSelectedTask((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  function handleUpdate(id: string, data: Partial<Task>) {
    updateTask.mutate({ id, data });
  }

  // Apply filters
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterMyTasks && user && t.assignedToId !== user.id) return false;
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
      if (filterOverdue && !isOverdue(t)) return false;
      return true;
    });
  }, [tasks, filterMyTasks, filterStatus, filterPriority, filterOverdue, user]);

  // Group by status, maintaining order
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      TODO: [], IN_PROGRESS: [], BLOCKED: [], DONE: [], CANCELLED: [],
    };
    filtered.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [filtered]);

  const overdueCount = overdueTasks.length;
  const hasActiveFilters = filterMyTasks || filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterOverdue;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {tasks.length} total · {filtered.length} shown
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">
              {overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              These tasks are past their due date and need attention.
            </p>
          </div>
          <button
            className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium flex-shrink-0"
            onClick={() => setFilterOverdue(true)}
          >
            Show only overdue
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* My tasks toggle */}
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            filterMyTasks
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setFilterMyTasks((v) => !v)}
        >
          My Tasks
        </button>

        {/* Status filter */}
        <select
          className="input py-1.5 text-sm w-auto"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
        >
          <option value="ALL">All Statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          className="input py-1.5 text-sm w-auto"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as any)}
        >
          <option value="ALL">All Priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Overdue toggle */}
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
            filterOverdue
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setFilterOverdue((v) => !v)}
        >
          <Clock className="w-3.5 h-3.5" /> Overdue
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
            onClick={() => {
              setFilterMyTasks(false);
              setFilterStatus('ALL');
              setFilterPriority('ALL');
              setFilterOverdue(false);
            }}
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {isSuperAdmin && (
        <BulkDeleteBar
          count={selectedIds.size}
          noun="task"
          isPending={bulkDelete.isPending}
          onClear={() => setSelectedIds(new Set())}
          onDelete={() => bulkDelete.mutate(Array.from(selectedIds))}
        />
      )}

      {/* Task groups */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {STATUS_ORDER.map((status) => (
            <StatusGroup
              key={status}
              status={status}
              tasks={grouped[status]}
              users={users}
              onSelect={setSelectedTask}
              onStatusChange={(id, s) => handleUpdate(id, { status: s })}
              defaultOpen={status !== 'DONE' && status !== 'CANCELLED'}
              selectedIds={isSuperAdmin ? selectedIds : undefined}
              onToggleCheck={isSuperAdmin ? toggleTaskCheck : undefined}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CheckCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No tasks found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters ? 'Try clearing your filters' : 'Click "New Task" to get started'}
          </p>
        </div>
      )}

      {/* Modals / panels */}
      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} users={users} />
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdate}
          onEditSaved={(updated) =>
            setSelectedTask((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev))
          }
        />
      )}
    </div>
  );
}
