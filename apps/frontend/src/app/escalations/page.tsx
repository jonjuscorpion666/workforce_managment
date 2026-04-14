'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, Filter,
  ArrowUpRight, UserCheck, RefreshCw, X, Search,
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

type EscalationStatus = 'PENDING' | 'NOTIFIED' | 'ACKNOWLEDGED' | 'RESOLVED';
type EscalationReason = 'OVERDUE' | 'INACTIVITY' | 'SLA_BREACH';
type EntityType = 'task' | 'issue' | 'case';

interface Escalation {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  entityLink: string;
  reason: EscalationReason;
  level: number;
  status: EscalationStatus;
  escalatedToId: string;
  escalatedToName: string;
  escalatedToJobTitle: string | null;
  escalatedByName: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// ─── Level badge ───────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: number }) {
  const styles =
    level >= 3 ? 'bg-red-100 text-red-700 border border-red-200'
    : level === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200'
    : 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${styles}`}>
      {level >= 3 && <AlertTriangle className="w-3 h-3" />}
      L{level}
    </span>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EscalationStatus }) {
  const map: Record<EscalationStatus, string> = {
    PENDING:      'bg-red-100 text-red-700',
    NOTIFIED:     'bg-blue-100 text-blue-700',
    ACKNOWLEDGED: 'bg-amber-100 text-amber-700',
    RESOLVED:     'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ─── Reason badge ──────────────────────────────────────────────────────────

function ReasonBadge({ reason }: { reason: EscalationReason }) {
  const map: Record<EscalationReason, string> = {
    OVERDUE:    'bg-red-50 text-red-600',
    INACTIVITY: 'bg-orange-50 text-orange-600',
    SLA_BREACH: 'bg-purple-50 text-purple-700',
  };
  const labels: Record<EscalationReason, string> = {
    OVERDUE:    'Overdue',
    INACTIVITY: 'Inactivity',
    SLA_BREACH: 'SLA Breach',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[reason] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[reason] ?? reason}
    </span>
  );
}

// ─── Reassign modal ────────────────────────────────────────────────────────

function ReassignModal({
  escalation, onClose,
}: { escalation: Escalation; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch]   = useState('');
  const [level, setLevel]     = useState(escalation.level);
  const [selectedId, setSelectedId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [error, setError]     = useState('');

  const { data: results = [] } = useQuery<any[]>({
    queryKey: ['escalation-user-search', search],
    queryFn: () => api.get('/admin/users/search', { params: { q: search } }).then((r) => r.data),
    enabled: search.length >= 2,
    staleTime: 30_000,
  });

  const reassign = useMutation({
    mutationFn: () => api.patch(`/escalations/${escalation.id}/reassign`, {
      escalatedToId: selectedId,
      level,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalations'] });
      toast.success('Escalation reassigned');
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Failed to reassign'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Reassign Escalation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Currently assigned to</p>
            <p className="text-sm font-medium text-gray-800">{escalation.escalatedToName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reassign to</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="Search by name or email…"
                value={selectedId ? selectedName : search}
                onChange={(e) => { setSearch(e.target.value); setSelectedId(''); setSelectedName(''); }}
              />
            </div>
            {!selectedId && results.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-xl shadow-sm max-h-40 overflow-y-auto">
                {results.map((u: any) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setSelectedId(u.id); setSelectedName(`${u.firstName} ${u.lastName}`); setSearch(''); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>{u.firstName} {u.lastName}</span>
                    <span className="text-xs text-gray-400">{u.roles?.[0]?.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Level</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((l) => (
                <button key={l} type="button" onClick={() => setLevel(l)}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all
                    ${level === l
                      ? l >= 3 ? 'border-red-500 bg-red-50 text-red-700'
                        : l === 2 ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : 'border-yellow-400 bg-yellow-50 text-yellow-700'
                      : 'border-gray-200 text-gray-500'}`}>
                  L{l}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 btn-secondary text-sm">Cancel</button>
            <button
              onClick={() => { if (!selectedId) { setError('Please select a user'); return; } setError(''); reassign.mutate(); }}
              disabled={reassign.isPending}
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              <UserCheck className="w-4 h-4" />
              {reassign.isPending ? 'Reassigning…' : 'Reassign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['', 'PENDING', 'NOTIFIED', 'ACKNOWLEDGED', 'RESOLVED'];
const REASON_OPTIONS = ['', 'OVERDUE', 'INACTIVITY', 'SLA_BREACH'];
const ENTITY_OPTIONS = ['', 'task', 'issue', 'case'];

export default function EscalationsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const router = useRouter();

  const [statusFilter,     setStatusFilter]     = useState('');
  const [reasonFilter,     setReasonFilter]     = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [reassignTarget,   setReassignTarget]   = useState<Escalation | null>(null);

  const { data: escalations = [], isLoading } = useQuery<Escalation[]>({
    queryKey: ['escalations', statusFilter, reasonFilter, entityTypeFilter],
    queryFn: () => api.get('/escalations', {
      params: {
        ...(statusFilter     && { status: statusFilter }),
        ...(reasonFilter     && { reason: reasonFilter }),
        ...(entityTypeFilter && { entityType: entityTypeFilter }),
      },
    }).then((r) => r.data),
  });

  const ack = useMutation({
    mutationFn: (id: string) => api.patch(`/escalations/${id}/acknowledge`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalations'] }); toast.success('Acknowledged'); },
    onError:   () => toast.error('Failed to acknowledge'),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => api.patch(`/escalations/${id}/resolve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalations'] }); toast.success('Resolved'); },
    onError:   () => toast.error('Failed to resolve'),
  });

  // Stats (always from unfiltered totals — compute from current data as approximation)
  const allData = escalations;
  const pending      = allData.filter((e) => e.status === 'PENDING').length;
  const acknowledged = allData.filter((e) => e.status === 'ACKNOWLEDGED').length;
  const resolved     = allData.filter((e) => e.status === 'RESOLVED').length;
  const total        = allData.length;

  const hasFilters = statusFilter || reasonFilter || entityTypeFilter;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escalations</h1>
          <p className="text-gray-500 mt-1 text-sm">Overdue tasks, inactivity alerts, and SLA breaches</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',        value: total,        color: 'text-gray-800',  bg: 'bg-gray-50',   border: 'border-gray-100' },
          { label: 'Pending',      value: pending,      color: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-100' },
          { label: 'Acknowledged', value: acknowledged, color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-100' },
          { label: 'Resolved',     value: resolved,     color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-100' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-2xl px-5 py-4`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />

        <select
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
        >
          <option value="">All reasons</option>
          <option value="OVERDUE">Overdue</option>
          <option value="INACTIVITY">Inactivity</option>
          <option value="SLA_BREACH">SLA Breach</option>
        </select>

        <select
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          <option value="task">Task</option>
          <option value="issue">Issue</option>
          <option value="case">Case</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setStatusFilter(''); setReasonFilter(''); setEntityTypeFilter(''); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">{escalations.length} result{escalations.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card py-16 text-center text-gray-400 text-sm">Loading escalations…</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Level</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Escalated To</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {escalations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                    {hasFilters ? 'No escalations match the current filters.' : 'No escalations yet.'}
                  </td>
                </tr>
              )}
              {escalations.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">

                  {/* Entity — title + type chip + link */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-start gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5
                        ${e.entityType === 'issue' ? 'bg-blue-100 text-blue-700'
                          : e.entityType === 'case' ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'}`}>
                        {e.entityType.toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        {e.entityLink ? (
                          <button
                            onClick={() => router.push(e.entityLink)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-left"
                          >
                            <span className="truncate max-w-[180px]">{e.entityTitle}</span>
                            <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[180px] block">{e.entityTitle}</span>
                        )}
                        {e.escalatedByName && (
                          <p className="text-xs text-gray-400 mt-0.5">By {e.escalatedByName}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Reason */}
                  <td className="px-5 py-3.5">
                    <ReasonBadge reason={e.reason} />
                  </td>

                  {/* Level */}
                  <td className="px-5 py-3.5">
                    <LevelBadge level={e.level} />
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <StatusBadge status={e.status} />
                    {e.acknowledgedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(e.acknowledgedAt)}</p>
                    )}
                  </td>

                  {/* Escalated To */}
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <p className="text-sm font-medium text-gray-800">{e.escalatedToName}</p>
                    {e.escalatedToJobTitle && (
                      <p className="text-xs text-gray-400">{e.escalatedToJobTitle}</p>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-5 py-3.5 text-xs text-gray-500 hidden lg:table-cell whitespace-nowrap">
                    {formatDate(e.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {e.status === 'PENDING' && (
                        <button
                          onClick={() => ack.mutate(e.id)}
                          disabled={ack.isPending}
                          className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
                        </button>
                      )}
                      {(e.status === 'PENDING' || e.status === 'ACKNOWLEDGED' || e.status === 'NOTIFIED') && (
                        <button
                          onClick={() => resolve.mutate(e.id)}
                          disabled={resolve.isPending}
                          className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Resolve
                        </button>
                      )}
                      {e.status !== 'RESOLVED' && (
                        <button
                          onClick={() => setReassignTarget(e)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Reassign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reassign modal */}
      {reassignTarget && (
        <ReassignModal escalation={reassignTarget} onClose={() => setReassignTarget(null)} />
      )}
    </div>
  );
}
