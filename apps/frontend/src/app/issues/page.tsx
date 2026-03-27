'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Plus, Wand2, Search, X, AlertTriangle, Clock, CheckCircle2, Layers,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import BulkDeleteBar from '@/components/BulkDeleteBar';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Issue {
  [key: string]: unknown;
  id: string;
  title: string;
  description?: string;
  status: string;
  severity: string;
  priority: string;
  source: string;
  issueLevel: string;
  category?: string;
  subcategory?: string;
  orgUnit?: { id: string; name: string; level: string };
  hospital?: string;
  ownerRole?: string;
  dueDate?: string;
  baselineScore?: number;
  targetThreshold?: number;
  statusNote?: string;
  createdAt: string;
}

interface OrgUnit {
  id: string;
  name: string;
  level: string;
  parent?: { name: string };
}

interface Survey {
  id: string;
  title: string;
  status: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['ALL', 'OPEN', 'ACTION_PLANNED', 'IN_PROGRESS', 'AWAITING_VALIDATION', 'BLOCKED', 'RESOLVED', 'CLOSED', 'REOPENED'];
const SEVERITY_OPTIONS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const LEVEL_OPTIONS = ['ALL', 'UNIT', 'DEPARTMENT', 'HOSPITAL', 'SYSTEM'];
const SOURCE_OPTIONS = ['ALL', 'SURVEY_AUTO', 'MANUAL', 'SPEAK_UP', 'ESCALATION'];

// ─── Badge helpers ────────────────────────────────────────────────────────────

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

function labelify(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Auto-Create Modal ────────────────────────────────────────────────────────

function AutoCreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [surveyId, setSurveyId] = useState('');
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const { data: surveys = [] } = useQuery<Survey[]>({
    queryKey: ['surveys'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });

  const autoCreate = useMutation({
    mutationFn: (sid: string) => api.post('/issues/auto-create', { surveyId: sid }).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['issues'] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Auto-Create from Survey</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          This will analyze survey responses and auto-generate issues for units scoring below 70% in any engagement dimension.
        </p>

        {!result ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Survey</label>
              <select
                className="input"
                value={surveyId}
                onChange={(e) => setSurveyId(e.target.value)}
              >
                <option value="">— Choose a survey —</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} ({s.status})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary flex items-center gap-2"
                disabled={!surveyId || autoCreate.isPending}
                onClick={() => autoCreate.mutate(surveyId)}
              >
                <Wand2 className="w-4 h-4" />
                {autoCreate.isPending ? 'Generating...' : 'Generate Issues'}
              </button>
            </div>
            {autoCreate.isError && (
              <p className="text-sm text-red-600 mt-3">Error generating issues. Please try again.</p>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900">Issues Generated</p>
            <p className="text-sm text-gray-500 mt-1">
              Created <span className="font-bold text-green-700">{result.created}</span> issues,
              skipped <span className="font-bold text-gray-600">{result.skipped}</span> duplicates
            </p>
            <button className="btn-primary mt-4" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Issue Modal ───────────────────────────────────────────────────────

function CreateIssueModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    description: '',
    source: 'MANUAL',
    category: '',
    subcategory: '',
    issueLevel: 'UNIT',
    severity: 'MEDIUM',
    priority: 'P3',
    hospital: '',
    orgUnitId: '',
    ownerRole: '',
    dueDate: '',
    baselineScore: '',
    targetThreshold: '70',
    statusNote: '',
  });

  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/org/units').then((r) => r.data),
  });

  const hospitals = orgUnits.filter((u) => u.level === 'HOSPITAL');

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post('/issues', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      onClose();
    },
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || undefined,
      source: form.source,
      category: form.category || undefined,
      subcategory: form.subcategory || undefined,
      issueLevel: form.issueLevel,
      severity: form.severity,
      priority: form.priority,
      hospital: form.hospital || undefined,
      orgUnitId: form.orgUnitId || undefined,
      ownerRole: form.ownerRole || undefined,
      dueDate: form.dueDate || undefined,
      baselineScore: form.baselineScore ? Number(form.baselineScore) : undefined,
      targetThreshold: form.targetThreshold ? Number(form.targetThreshold) : 70,
      statusNote: form.statusNote || undefined,
    };
    create.mutate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Issue</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {/* Row: Source + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select className="input" value={form.source} onChange={(e) => set('source', e.target.value)}>
                {['MANUAL', 'SURVEY_AUTO', 'SPEAK_UP', 'ESCALATION'].map((s) => (
                  <option key={s} value={s}>{labelify(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input className="input" placeholder="e.g. Staffing, Burnout / Wellbeing" value={form.category} onChange={(e) => set('category', e.target.value)} />
            </div>
          </div>

          {/* Row: Subcategory + Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
              <input className="input" value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Level</label>
              <select className="input" value={form.issueLevel} onChange={(e) => set('issueLevel', e.target.value)}>
                {['UNIT', 'DEPARTMENT', 'HOSPITAL', 'SYSTEM'].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Severity + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select className="input" value={form.severity} onChange={(e) => set('severity', e.target.value)}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {['P1', 'P2', 'P3', 'P4'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Hospital + Org Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
              {hospitals.length > 0 ? (
                <select className="input" value={form.hospital} onChange={(e) => set('hospital', e.target.value)}>
                  <option value="">— Select hospital —</option>
                  {hospitals.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}
                </select>
              ) : (
                <input className="input" placeholder="Hospital name" value={form.hospital} onChange={(e) => set('hospital', e.target.value)} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Org Unit</label>
              <select className="input" value={form.orgUnitId} onChange={(e) => set('orgUnitId', e.target.value)}>
                <option value="">— Select unit —</option>
                {orgUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.parent ? `${u.parent.name} > ${u.name}` : u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Owner Role + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Role</label>
              <input className="input" placeholder="e.g. Manager, Director, CNO" value={form.ownerRole} onChange={(e) => set('ownerRole', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" className="input" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
          </div>

          {/* Row: Baseline Score + Target Threshold */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Baseline Score (0–100)</label>
              <input type="number" min="0" max="100" className="input" value={form.baselineScore} onChange={(e) => set('baselineScore', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Threshold</label>
              <input type="number" min="0" max="100" className="input" value={form.targetThreshold} onChange={(e) => set('targetThreshold', e.target.value)} />
            </div>
          </div>

          {/* Status Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Note</label>
            <textarea className="input" rows={2} placeholder="Notes on creation..." value={form.statusNote} onChange={(e) => set('statusNote', e.target.value)} />
          </div>

          {create.isError && (
            <p className="text-sm text-red-600">Error creating issue. Please try again.</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IssuesPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const qc = useQueryClient();
  const [showAutoCreate, setShowAutoCreate] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => prev.size === ids.length ? new Set() : new Set(ids));
  }

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => api.post('/issues/bulk-delete', { ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['issues'] }); setSelectedIds(new Set()); },
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [search, setSearch] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ['issues'],
    queryFn: () => api.get('/issues').then((r) => r.data),
  });

  // Client-side filter
  const filtered = issues.filter((issue) => {
    if (filterStatus !== 'ALL' && issue.status !== filterStatus) return false;
    if (filterSeverity !== 'ALL' && issue.severity !== filterSeverity) return false;
    if (filterLevel !== 'ALL' && issue.issueLevel !== filterLevel) return false;
    if (filterSource !== 'ALL' && issue.source !== filterSource) return false;
    if (search && !issue.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortKey] as string ?? '';
    const bv = (b as Record<string, unknown>)[sortKey] as string ?? '';
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1 text-brand-600">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  // Stats
  const total = issues.length;
  const openCount = issues.filter((i) => i.status === 'OPEN' || i.status === 'ACTION_PLANNED').length;
  const awaitingCount = issues.filter((i) => i.status === 'AWAITING_VALIDATION').length;
  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;

  const hasFilters = filterStatus !== 'ALL' || filterSeverity !== 'ALL' || filterLevel !== 'ALL' || filterSource !== 'ALL' || search;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
          <p className="text-gray-500 mt-1">Track and resolve workforce issues</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAutoCreate(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Wand2 className="w-4 h-4" /> Auto-Create from Survey
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Issue
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4 py-4">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Issues</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 py-4">
          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Open / Action Planned</p>
            <p className="text-2xl font-bold text-gray-900">{openCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 py-4">
          <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Awaiting Validation</p>
            <p className="text-2xl font-bold text-gray-900">{awaitingCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 py-4">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Critical Severity</p>
            <p className="text-2xl font-bold text-gray-900">{criticalCount}</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 text-sm py-1.5 w-52"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status */}
        <select className="input text-sm py-1.5 w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : labelify(s)}</option>)}
        </select>

        {/* Severity */}
        <select className="input text-sm py-1.5 w-auto" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
          {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Severities' : s}</option>)}
        </select>

        {/* Level */}
        <select className="input text-sm py-1.5 w-auto" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
          {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l === 'ALL' ? 'All Levels' : l}</option>)}
        </select>

        {/* Source */}
        <select className="input text-sm py-1.5 w-auto" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Sources' : labelify(s)}</option>)}
        </select>

        {hasFilters && (
          <button
            className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
            onClick={() => { setFilterStatus('ALL'); setFilterSeverity('ALL'); setFilterLevel('ALL'); setFilterSource('ALL'); setSearch(''); }}
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} of {total}
        </span>
      </div>

      {/* Table */}
      {isSuperAdmin && (
        <BulkDeleteBar
          count={selectedIds.size}
          noun="issue"
          isPending={bulkDelete.isPending}
          onClear={() => setSelectedIds(new Set())}
          onDelete={() => bulkDelete.mutate(Array.from(selectedIds))}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-14 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {isSuperAdmin && (
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        className="accent-red-600"
                        checked={sorted.length > 0 && selectedIds.size === sorted.length}
                        onChange={() => toggleSelectAll(sorted.map((i) => i.id))}
                      />
                    </th>
                  )}
                  {[
                    { key: 'title', label: 'Title' },
                    { key: 'status', label: 'Status' },
                    { key: 'severity', label: 'Severity' },
                    { key: 'issueLevel', label: 'Level' },
                    { key: 'priority', label: 'Priority' },
                    { key: 'source', label: 'Source' },
                    { key: 'orgUnit', label: 'Org Unit' },
                    { key: 'dueDate', label: 'Due Date' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none whitespace-nowrap"
                      onClick={() => handleSort(key)}
                    >
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((issue) => (
                  <tr
                    key={issue.id}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedIds.has(issue.id) ? 'bg-red-50' : ''}`}
                    onClick={() => router.push(`/issues/${issue.id}`)}
                  >
                    {isSuperAdmin && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="accent-red-600"
                          checked={selectedIds.has(issue.id)}
                          onChange={() => toggleSelect(issue.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{issue.title}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusBadgeClass(issue.status)}`}>{labelify(issue.status)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${severityBadgeClass(issue.severity)}`}>{issue.severity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${levelBadgeClass(issue.issueLevel)}`}>{issue.issueLevel}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{issue.priority}</td>
                    <td className="px-4 py-3 text-gray-500">{labelify(issue.source)}</td>
                    <td className="px-4 py-3 text-gray-500">{issue.orgUnit?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{issue.dueDate ? formatDate(issue.dueDate) : '—'}</td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 9 : 8} className="px-4 py-12 text-center text-gray-400">
                      {isLoading ? 'Loading...' : hasFilters ? 'No issues match your filters' : 'No issues found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAutoCreate && <AutoCreateModal onClose={() => setShowAutoCreate(false)} />}
      {showCreate && <CreateIssueModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
