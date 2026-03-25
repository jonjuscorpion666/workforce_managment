'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, Activity, ChevronDown, ChevronRight, Filter,
  ExternalLink, Calendar, X,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Change { field: string; oldValue: string; newValue: string; }

interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedById: string | null;
  performedByName: string | null;
  performedByRole: string | null;
  entityTitle: string | null;
  changes: Change[];
  before: any;
  after: any;
  timestamp: string;
}

// ─── Action metadata ──────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; color: string; dot: string; verb: string }> = {
  CREATE:           { label: 'Create',           color: 'bg-green-100 text-green-800',   dot: 'bg-green-500',   verb: 'created'                },
  CREATED:          { label: 'Create',           color: 'bg-green-100 text-green-800',   dot: 'bg-green-500',   verb: 'created'                },
  UPDATE:           { label: 'Update',           color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500',    verb: 'updated'                },
  UPDATED:          { label: 'Update',           color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500',    verb: 'updated'                },
  DELETE:           { label: 'Delete',           color: 'bg-red-100 text-red-800',       dot: 'bg-red-500',     verb: 'deleted'                },
  PUBLISHED:        { label: 'Publish',          color: 'bg-green-100 text-green-800',   dot: 'bg-green-500',   verb: 'published'              },
  CANCELLED:        { label: 'Cancel',           color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400',  verb: 'cancelled'              },
  ARCHIVED:         { label: 'Archive',          color: 'bg-gray-100 text-gray-700',     dot: 'bg-gray-400',    verb: 'archived'               },
  ACKNOWLEDGED:     { label: 'Acknowledge',      color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500',  verb: 'acknowledged'           },
  REQUEST_APPROVAL: { label: 'Request Approval', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500',  verb: 'requested approval for' },
  APPROVE:          { label: 'Approve',          color: 'bg-green-100 text-green-800',   dot: 'bg-green-500',   verb: 'approved'               },
  REJECT:           { label: 'Reject',           color: 'bg-red-100 text-red-800',       dot: 'bg-red-500',     verb: 'rejected'               },
  ESCALATE:         { label: 'Escalate',         color: 'bg-red-100 text-red-800',       dot: 'bg-red-600',     verb: 'escalated'              },
  REOPEN:           { label: 'Reopen',           color: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500',   verb: 'reopened'               },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400', verb: action.toLowerCase() };
}

// ─── Entity routing ───────────────────────────────────────────────────────────

const ENTITY_HREF: Record<string, (id: string) => string> = {
  issues:       (id) => `/issues/${id}`,
  tasks:        (id) => `/tasks?highlight=${id}`,
  surveys:      (id) => `/surveys/${id}`,
  Announcement: (id) => `/announcements/${id}`,
  announcement: (id) => `/announcements/${id}`,
};

// ─── Time helpers ─────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff  = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 2)   return 'just now';
  if (mins  < 60)  return `${mins} min ago`;
  if (hours < 24)  return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days  === 1) return 'Yesterday';
  if (days  < 7)   return `${days} days ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dayLabel(ts: string): string {
  const d         = new Date(ts);
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime())     return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─── Small components ─────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const meta = getActionMeta(action);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function ChangePill({ change }: { change: Change }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
      <span className="font-medium text-gray-700">{change.field}</span>
      <span className="text-gray-400">·</span>
      <span className="text-red-500 line-through">{change.oldValue}</span>
      <span className="text-gray-400">→</span>
      <span className="text-green-700 font-medium">{change.newValue}</span>
    </div>
  );
}

// ─── Single activity entry ────────────────────────────────────────────────────

function FeedEntry({ log }: { log: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getActionMeta(log.action);

  const actor       = log.performedByName ?? (log.performedById ? `…${log.performedById.slice(-8)}` : 'System');
  const type        = log.entityType.toLowerCase();
  const title       = log.entityTitle ?? `${type} …${log.entityId.slice(-6)}`;
  const href        = ENTITY_HREF[log.entityType]?.(log.entityId);
  const hasChanges  = (log.changes?.length ?? 0) > 0;

  return (
    <div className="relative pl-5">
      {/* Timeline dot */}
      <span className={`absolute left-0 top-3 w-2 h-2 rounded-full ${meta.dot} border-2 border-white shadow-sm`} />

      <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors shadow-sm">
        {/* Main row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 leading-snug">
              <span className="font-semibold">{actor}</span>
              {log.performedByRole && (
                <span className="text-gray-400 text-xs ml-1.5">({log.performedByRole})</span>
              )}
              <span className="text-gray-500"> {meta.verb} </span>
              <span className="text-gray-500">{type}: </span>
              {href ? (
                <Link href={href} className="font-medium text-blue-600 hover:underline inline-flex items-center gap-0.5 leading-none">
                  &ldquo;{title}&rdquo;<ExternalLink className="w-3 h-3 ml-0.5 flex-shrink-0" />
                </Link>
              ) : (
                <span className="font-medium text-gray-800">&ldquo;{title}&rdquo;</span>
              )}
            </p>

            {/* Change pills — first 3 shown inline when collapsed */}
            {hasChanges && !expanded && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {log.changes.slice(0, 3).map((c, i) => <ChangePill key={i} change={c} />)}
                {log.changes.length > 3 && (
                  <span className="text-xs text-gray-400 self-center italic">+{log.changes.length - 3} more</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">{relativeTime(log.timestamp)}</span>
            <ActionBadge action={log.action} />
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
            >
              {expanded
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            {hasChanges && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">What changed</p>
                <div className="flex flex-wrap gap-2">
                  {log.changes.map((c, i) => <ChangePill key={i} change={c} />)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <div>
                <p className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Performed By</p>
                <p className="text-gray-700">{log.performedByName ?? log.performedById ?? 'System'}</p>
                {log.performedByRole && <p className="text-gray-400">{log.performedByRole}</p>}
              </div>
              <div>
                <p className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Exact Time</p>
                <p className="text-gray-700">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Entity ID</p>
                <p className="text-gray-500 font-mono break-all">{log.entityId}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Entity Type</p>
                <p className="text-gray-700 capitalize">{log.entityType}</p>
              </div>
            </div>

            {href && (
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                Open {type} page
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

function ActivityFeed({ logs }: { logs: ActivityEntry[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    logs.forEach((log: ActivityEntry) => {
      const key = dayLabel(log.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    });
    return map;
  }, [logs]);

  if (!logs.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Activity className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No activity for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {Array.from(grouped.entries()).map(([day, entries]) => (
        <div key={day}>
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{day}</span>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">{entries.length} event{entries.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2.5 border-l-2 border-gray-100 ml-1 pl-4">
            {entries.map((log) => <FeedEntry key={log.id} log={log} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Audit Table (compliance view) ────────────────────────────────────────────

function AuditTable({ logs }: { logs: ActivityEntry[] }) {
  if (!logs.length) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No audit logs found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Timestamp', 'Entity', 'Entity ID', 'Action', 'Performed By', 'Changes'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log) => {
            const href = ENTITY_HREF[log.entityType]?.(log.entityId);
            return (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-xs font-medium text-gray-700 capitalize">{log.entityType}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">
                  {href ? (
                    <Link href={href} className="hover:text-blue-600 transition-colors">
                      {log.entityId.slice(0, 12)}…
                    </Link>
                  ) : (
                    <span>{log.entityId.slice(0, 12)}…</span>
                  )}
                </td>
                <td className="px-4 py-2.5"><ActionBadge action={log.action} /></td>
                <td className="px-4 py-2.5 text-xs text-gray-600">
                  {log.performedByName ?? (log.performedById ? `…${log.performedById.slice(-8)}` : '—')}
                  {log.performedByRole && (
                    <span className="text-gray-400 ml-1">({log.performedByRole})</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {(log.changes?.length ?? 0) > 0 ? (
                    <span className="text-blue-600">{log.changes.map((c) => c.field).join(', ')}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const ENTITY_TYPES = ['issues', 'tasks', 'surveys', 'Announcement'];
const ACTIONS      = [
  'CREATE', 'UPDATE', 'DELETE', 'PUBLISHED', 'CANCELLED',
  'APPROVE', 'REJECT', 'REQUEST_APPROVAL', 'ARCHIVED', 'ACKNOWLEDGED', 'ESCALATE',
];

interface Filters { entityType: string; action: string; dateFrom: string; dateTo: string; }

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const active = Object.values(filters).some(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
        <Filter className="w-4 h-4" /> Filters
      </div>

      <select
        value={filters.entityType}
        onChange={(e) => onChange({ ...filters, entityType: e.target.value })}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All types</option>
        {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      <select
        value={filters.action}
        onChange={(e) => onChange({ ...filters, action: e.target.value })}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All actions</option>
        {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>

      <div className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4 text-gray-400" />
        <input
          type="date" value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-400 text-sm">–</span>
        <input
          type="date" value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {active && (
        <button
          onClick={() => onChange({ entityType: '', action: '', dateFrom: '', dateTo: '' })}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'activity' | 'audit';

export default function AuditPage() {
  const [view,    setView]    = useState<ViewMode>('activity');
  const [filters, setFilters] = useState<Filters>({ entityType: '', action: '', dateFrom: '', dateTo: '' });

  const feedParams = new URLSearchParams();
  if (filters.entityType) feedParams.set('entityType', filters.entityType);
  if (filters.action)     feedParams.set('action',     filters.action);
  if (filters.dateFrom)   feedParams.set('dateFrom',   filters.dateFrom);
  if (filters.dateTo)     feedParams.set('dateTo',     `${filters.dateTo}T23:59:59`);

  const { data: feedLogs = [], isLoading: feedLoading } = useQuery<ActivityEntry[]>({
    queryKey: ['audit-feed', filters],
    queryFn:  () => api.get(`/audit/feed?${feedParams.toString()}`).then((r) => r.data),
    enabled:  view === 'activity',
  });

  const { data: rawLogs = [], isLoading: rawLoading } = useQuery<ActivityEntry[]>({
    queryKey: ['audit-raw', filters],
    queryFn:  () => {
      const p = new URLSearchParams();
      if (filters.entityType) p.set('entityType', filters.entityType);
      if (filters.action)     p.set('action',     filters.action);
      return api.get(`/audit?${p.toString()}`).then((r) => r.data);
    },
    enabled: view === 'audit',
  });

  const isLoading = view === 'activity' ? feedLoading  : rawLoading;
  const count     = view === 'activity' ? feedLogs.length : rawLogs.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity & Audit Log</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Human-readable activity feed · compliance-grade audit trail</p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setView('activity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'activity' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Activity Feed
          </button>
          <button
            onClick={() => setView('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Audit Table
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Event count */}
      {!isLoading && (
        <p className="text-sm text-gray-400">
          {count} event{count !== 1 ? 's' : ''}
          {Object.values(filters).some(Boolean) && <span className="text-blue-500 ml-1">· filtered</span>}
        </p>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading…</p>
        </div>
      ) : view === 'activity' ? (
        <ActivityFeed logs={feedLogs} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <AuditTable logs={rawLogs} />
        </div>
      )}
    </div>
  );
}
