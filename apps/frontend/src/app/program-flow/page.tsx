'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, Clock, AlertCircle, Circle, ChevronDown, ChevronRight,
  RefreshCw, Plus, Zap, X, User, Flag, AlertTriangle,
  Activity, BarChart3, ClipboardCheck, Settings,
} from 'lucide-react';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type StageState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
type AlertSeverity = 'critical' | 'high' | 'medium';

const STAGES = [
  { key: 'SURVEY_SETUP',     label: 'Survey Setup',   short: 'Setup' },
  { key: 'SURVEY_EXECUTION', label: 'Execution',      short: 'Execute' },
  { key: 'ROOT_CAUSE',       label: 'Root Cause',     short: 'Root Cause' },
  { key: 'REMEDIATION',      label: 'Remediation',    short: 'Remediate' },
  { key: 'COMMUNICATION',    label: 'Communication',  short: 'Comms' },
  { key: 'VALIDATION',       label: 'Validation',     short: 'Validate' },
] as const;

const STATE_META: Record<StageState, { label: string; textColor: string; bgColor: string; borderColor: string; icon: any }> = {
  NOT_STARTED: { label: 'Not Started', textColor: 'text-gray-500',    bgColor: 'bg-gray-50',      borderColor: 'border-gray-200',   icon: Circle },
  IN_PROGRESS: { label: 'In Progress', textColor: 'text-amber-700',   bgColor: 'bg-amber-50',     borderColor: 'border-amber-300',  icon: Clock },
  COMPLETED:   { label: 'Completed',   textColor: 'text-emerald-700', bgColor: 'bg-emerald-50',   borderColor: 'border-emerald-300',icon: CheckCircle2 },
  BLOCKED:     { label: 'Blocked',     textColor: 'text-red-800',     bgColor: 'bg-red-100',      borderColor: 'border-red-500',    icon: AlertCircle },
};

const ALERT_META: Record<AlertSeverity, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800',    dot: 'bg-red-500' },
  high:     { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-800',  dot: 'bg-amber-400' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ownerInitials(name: string | null | undefined) {
  if (!name) return null;
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function ownerShort(name: string | null | undefined, role: string | null | undefined): string | null {
  if (!name && !role) return null;
  if (!name) return role ?? null;
  // "Director Chen" → "Dir. Chen", keep first word of name
  const roleAbbr: Record<string, string> = { Director: 'Dir.', Manager: 'Mgr.', CNO: 'CNO', SVP: 'SVP' };
  const abbr = roleAbbr[role ?? ''] ?? '';
  const lastName = name.split(' ').pop() ?? name;
  return abbr ? `${abbr} ${lastName}` : lastName;
}

function relativeDate(date: string | null | undefined) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDate(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── State badge ───────────────────────────────────────────────────────────────

function StateBadge({ state, size = 'sm' }: { state: StageState; size?: 'xs' | 'sm' }) {
  const m = STATE_META[state] ?? STATE_META.NOT_STARTED;
  const Icon = m.icon;
  const cls = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
    : 'text-xs px-2 py-1 gap-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${m.bgColor} ${m.textColor} ${cls}`}>
      <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {m.label}
    </span>
  );
}

// ── SLA chip ──────────────────────────────────────────────────────────────────

function SlaChip({ daysInStage, slaDays, state }: { daysInStage: number | null; slaDays: number; state: StageState }) {
  if (state !== 'IN_PROGRESS' || daysInStage === null) return null;
  const over = daysInStage - slaDays;
  if (over >= 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
        <Flag className="w-2.5 h-2.5" />+{over}d SLA
      </span>
    );
  }
  if (daysInStage >= slaDays * 0.75) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
        <Clock className="w-2.5 h-2.5" />{slaDays - daysInStage}d left
      </span>
    );
  }
  return null;
}

// ── Stage cell ─────────────────────────────────────────────────────────────────

function StageCell({
  stageKey, stageLabel, cell, cycleId, orgUnitId, onEdit, onDrillDown,
}: {
  stageKey: string; stageLabel: string; cell: any;
  cycleId: string; orgUnitId: string;
  onEdit: (info: any) => void; onDrillDown: (info: any) => void;
}) {
  const state: StageState = cell?.state ?? 'NOT_STARTED';
  const m = STATE_META[state];
  const Icon = m.icon;
  const metrics = cell?.metrics;
  const owner = ownerShort(cell?.ownerName, cell?.ownerRole);
  const isBlocked = state === 'BLOCKED';
  const isStale = cell?.isStale;
  const isOverSla = cell?.isOverSla;

  // BLOCKED: distinct heavy border treatment
  const cellBorder = isBlocked
    ? 'border-2 border-red-500'
    : isStale
    ? 'border border-amber-400'
    : `border ${m.borderColor}`;

  return (
    <div
      className={`relative rounded-lg ${cellBorder} ${m.bgColor} p-2 flex flex-col gap-0.5 cursor-pointer
        hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all group`}
      style={{ minHeight: 80 }}
      onClick={() => onDrillDown({ cycleId, orgUnitId, stageKey, stageLabel, cell })}
    >
      {/* ── BLOCKED banner ── */}
      {isBlocked && (
        <div className="flex items-center gap-1 mb-0.5">
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-200 px-1.5 py-0.5 rounded w-full">
            <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
            BLOCKED
          </span>
        </div>
      )}

      {/* ── Top row: icon + days ── */}
      {!isBlocked && (
        <div className="flex items-center justify-between">
          <Icon className={`w-3 h-3 flex-shrink-0 ${m.textColor}`} />
          <div className="flex items-center gap-1">
            {cell?.daysInStage != null && (state === 'IN_PROGRESS') && (
              <span className={`text-[10px] font-mono ${isOverSla ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                {cell.daysInStage}d
              </span>
            )}
            {state === 'COMPLETED' && cell?.completedAt && (
              <span className="text-[10px] text-emerald-600 font-mono">{fmtDate(cell.completedAt)}</span>
            )}
          </div>
        </div>
      )}

      {/* ── BLOCKED: reason ── */}
      {isBlocked && cell?.blockedReason && (
        <p className="text-[10px] text-red-800 leading-tight line-clamp-2 font-medium">
          {cell.blockedReason}
        </p>
      )}

      {/* ── BLOCKED: days stuck ── */}
      {isBlocked && cell?.daysInStage != null && (
        <span className="text-[10px] text-red-600 font-semibold">{cell.daysInStage}d blocked</span>
      )}

      {/* ── Metric ── */}
      {!isBlocked && metrics?.label && (
        <p className={`text-[10px] font-medium leading-tight ${m.textColor} line-clamp-1`}>
          {metrics.label}
        </p>
      )}

      {/* ── Overdue tasks dot ── */}
      {metrics?.hasOverdue && !isBlocked && (
        <span className="text-[10px] text-red-600 font-semibold leading-tight">⚠ overdue tasks</span>
      )}

      {/* ── Time chips ── */}
      {!isBlocked && (
        <div className="flex flex-wrap gap-0.5 mt-auto">
          {isStale && (
            <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">
              stale {cell.daysSinceUpdate}d
            </span>
          )}
          {isOverSla && (
            <span className="text-[9px] font-semibold text-red-600 bg-red-100 px-1 py-0.5 rounded">
              +{cell.daysInStage - cell.slaDays}d SLA
            </span>
          )}
          {!isStale && !isOverSla && cell?.slaStatus === 'warning' && (
            <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
              {cell.slaDays - cell.daysInStage}d left
            </span>
          )}
        </div>
      )}

      {/* ── Owner bottom ── */}
      <div className="flex items-center justify-between mt-0.5">
        {owner ? (
          <span className={`text-[9px] truncate max-w-[80%] ${isBlocked ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
            {owner}
          </span>
        ) : (state === 'IN_PROGRESS' || isBlocked) ? (
          <span className="text-[9px] text-orange-500 font-semibold">no owner</span>
        ) : null}
      </div>

      {/* Edit on hover */}
      <button
        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onEdit({ cycleId, orgUnitId, stageKey, cell }); }}
      >
        <span className="text-[9px] bg-white border border-gray-300 text-gray-500 rounded px-1 py-0.5 shadow-sm">edit</span>
      </button>
    </div>
  );
}

// ── Aggregate stage cell (hospital row) ───────────────────────────────────────

function AggregateCell({ agg }: { agg: any }) {
  const state: StageState = agg?.state ?? 'NOT_STARTED';
  const m = STATE_META[state];
  const Icon = m.icon;
  const isBlocked = state === 'BLOCKED';

  return (
    <div className={`rounded-lg h-10 flex items-center gap-1.5 px-2 ${
      isBlocked ? 'bg-red-100 border-2 border-red-500' : `${m.bgColor} border ${m.borderColor}`
    }`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${m.textColor}`} />
      <div className="flex flex-wrap gap-1 overflow-hidden">
        {(agg?.stuckCount ?? 0) > 0 && (
          <span className="text-[10px] font-semibold text-red-700 bg-red-200 px-1 py-0.5 rounded-full whitespace-nowrap">
            {agg.stuckCount} stuck
          </span>
        )}
        {(agg?.staleCount ?? 0) > 0 && (agg?.stuckCount ?? 0) === 0 && (
          <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1 py-0.5 rounded-full whitespace-nowrap">
            {agg.staleCount} stale
          </span>
        )}
        {(agg?.overSlaCount ?? 0) > 0 && (agg?.stuckCount ?? 0) === 0 && (agg?.staleCount ?? 0) === 0 && (
          <span className="text-[10px] font-medium text-orange-700 bg-orange-100 px-1 py-0.5 rounded-full whitespace-nowrap">
            {agg.overSlaCount} late
          </span>
        )}
        {(agg?.noOwnerCount ?? 0) > 0 && (
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1 py-0.5 rounded-full whitespace-nowrap">
            {agg.noOwnerCount} unowned
          </span>
        )}
      </div>
      {(agg?.maxDaysInStage ?? 0) > 0 && state === 'IN_PROGRESS' && (
        <span className="text-[10px] text-gray-400 font-mono ml-auto flex-shrink-0">{agg.maxDaysInStage}d</span>
      )}
    </div>
  );
}

// ── Stage drawer ──────────────────────────────────────────────────────────────

function StageDrawer({
  info, cycleId, onClose, onSaved,
}: {
  info: { cycleId: string; orgUnitId: string; stageKey: string; stageLabel: string; cell?: any };
  cycleId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editState, setEditState] = useState<StageState>(info.cell?.state ?? 'NOT_STARTED');
  const [editNote, setEditNote] = useState(info.cell?.note ?? '');
  const [editOwner, setEditOwner] = useState(info.cell?.ownerName ?? '');
  const [editRole, setEditRole] = useState(info.cell?.ownerRole ?? '');
  const [editDue, setEditDue] = useState(info.cell?.dueDate ? String(info.cell.dueDate).slice(0, 10) : '');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['stage-detail', cycleId, info.orgUnitId, info.stageKey],
    queryFn: () =>
      api.get(`/program-flow/cycles/${cycleId}/units/${info.orgUnitId}/stage/${info.stageKey}/detail`)
        .then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/program-flow/cycles/${cycleId}/units/${info.orgUnitId}/stage`, {
        stage: info.stageKey,
        state: editState,
        note: editNote,
        ownerName: editOwner,
        ownerRole: editRole,
        dueDate: editDue || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['program-flow-pipeline', cycleId] });
      qc.invalidateQueries({ queryKey: ['stage-detail', cycleId, info.orgUnitId, info.stageKey] });
      setEditMode(false);
      onSaved();
    },
  });

  const d = detail;
  const state: StageState = d?.state ?? info.cell?.state ?? 'NOT_STARTED';
  const m = STATE_META[state];

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    BLOCKED: 'bg-red-100 text-red-700',
    RESOLVED: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-gray-100 text-gray-600',
    ACTION_PLANNED: 'bg-purple-100 text-purple-700',
    AWAITING_VALIDATION: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* panel */}
      <div className="w-[480px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${m.bgColor}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{info.stageLabel}</span>
                <StateBadge state={state} />
              </div>
              <h2 className="text-base font-semibold text-gray-900">{d?.orgUnit?.name ?? '…'}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading…</div>
          ) : (
            <div className="p-5 space-y-5">

              {/* Timeline strip */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Started</p>
                  <p className="font-medium text-gray-800">{fmtDate(d?.startedAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Days In Stage</p>
                  <p className={`font-semibold ${(d?.daysInStage ?? 0) > (d?.stageSla ?? 99) ? 'text-red-600' : 'text-gray-800'}`}>
                    {d?.daysInStage ?? '—'}{d?.daysInStage != null ? 'd' : ''}
                    {(d?.daysOverSla ?? 0) > 0 && (
                      <span className="ml-1 text-[11px] font-semibold text-red-500">(+{d.daysOverSla}d SLA)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Target Date</p>
                  <p className="font-medium text-gray-800">{fmtDate(d?.dueDate)}</p>
                </div>
              </div>

              {/* Why Blocked — prominent red box */}
              {state === 'BLOCKED' && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Why Blocked
                  </p>
                  <p className="text-sm text-red-900 font-medium">
                    {d?.blockedReason ?? 'No reason recorded — update this stage to add a blocked reason.'}
                  </p>
                </div>
              )}

              {/* Owner */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {ownerInitials(d?.ownerName) ?? <User className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d?.ownerName ?? 'No owner assigned'}</p>
                  <p className="text-xs text-gray-500">{d?.ownerRole ?? '—'}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-gray-400">Last updated</p>
                  <p className="text-xs font-medium text-gray-600">{relativeDate(d?.updatedAt)}</p>
                </div>
              </div>

              {/* Staleness warning */}
              {d?.isStale && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">Stale — </span>
                    no update in {d.daysSinceUpdate}d. Last change: {relativeDate(d?.updatedAt)}.
                  </p>
                </div>
              )}

              {/* Recommended next action */}
              {d?.nextAction && (
                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Zap className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">Recommended Action</p>
                    <p className="text-sm text-blue-900">{d.nextAction}</p>
                  </div>
                </div>
              )}

              {/* Note — only show if not blocked (blocked reason is shown above instead) */}
              {d?.note && state !== 'BLOCKED' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Note</p>
                  {d.note}
                </div>
              )}

              {/* Summary counters */}
              {d?.summary && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Issues', value: d.summary.totalIssues, warn: d.summary.openIssues > 0 },
                    { label: 'Tasks', value: d.summary.totalTasks, warn: false },
                    { label: 'Overdue', value: d.summary.overdueTasks, warn: d.summary.overdueTasks > 0 },
                    { label: 'Plans', value: d.summary.totalActionPlans, warn: false },
                  ].map((c) => (
                    <div key={c.label} className="rounded-lg bg-gray-50 p-2">
                      <p className={`text-lg font-bold ${c.warn && c.value > 0 ? 'text-red-600' : 'text-gray-800'}`}>{c.value}</p>
                      <p className="text-[10px] text-gray-500">{c.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Issues */}
              {(d?.issues?.length > 0) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Issues ({d.issues.length})
                  </p>
                  <div className="space-y-1.5">
                    {d.issues.map((issue: any) => (
                      <div key={issue.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 bg-white hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{issue.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {issue.daysOpen}d open · {issue.severity}
                            {issue.actionPlansCount > 0 && ` · ${issue.actionPlansCount} plan${issue.actionPlansCount > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[issue.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {issue.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {(d?.tasks?.length > 0) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Tasks ({d.tasks.length})
                    {d.summary?.overdueTasks > 0 && (
                      <span className="ml-2 text-red-600 normal-case font-medium">⚠ {d.summary.overdueTasks} overdue</span>
                    )}
                  </p>
                  <div className="space-y-1.5">
                    {d.tasks.map((task: any) => (
                      <div key={task.id} className={`flex items-center gap-2 p-2.5 rounded-lg border ${task.isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {task.title}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {task.priority} priority
                            {task.dueDate && ` · Due ${fmtDate(task.dueDate)}`}
                            {task.isOverdue && ` · ${task.daysOverdue}d overdue`}
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          task.status === 'DONE' ? 'bg-emerald-100 text-emerald-700'
                          : task.isOverdue ? 'bg-red-100 text-red-700'
                          : task.status === 'BLOCKED' ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Edit panel */}
        {editMode ? (
          <div className="border-t bg-gray-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Update Stage</p>
            <div className="grid grid-cols-2 gap-2">
              {(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'] as StageState[]).map((s) => {
                const mm = STATE_META[s];
                return (
                  <button
                    key={s}
                    onClick={() => setEditState(s)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                      editState === s ? `ring-2 ring-blue-400 ${mm.bgColor} ${mm.textColor}` : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <mm.icon className="w-3.5 h-3.5" /> {mm.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded px-2.5 py-1.5 text-xs" value={editOwner} onChange={(e) => setEditOwner(e.target.value)} placeholder="Owner name" />
              <select className="border rounded px-2.5 py-1.5 text-xs" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="">Role…</option>
                <option>Manager</option><option>Director</option><option>CNO</option><option>SVP</option>
              </select>
            </div>
            <input type="date" className="w-full border rounded px-2.5 py-1.5 text-xs" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
            <div>
              <label className={`block text-xs font-medium mb-1 ${editState === 'BLOCKED' ? 'text-red-600' : 'text-gray-600'}`}>
                {editState === 'BLOCKED' ? 'Blocked Reason' : 'Note'}
              </label>
              <textarea
                rows={2}
                className={`w-full border rounded px-2.5 py-1.5 text-xs resize-none ${editState === 'BLOCKED' ? 'border-red-300 bg-red-50 placeholder:text-red-300' : ''}`}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder={editState === 'BLOCKED' ? 'What is blocking this stage?' : 'Add a note…'}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="btn-secondary flex-1 text-xs py-1.5">Cancel</button>
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary flex-1 text-xs py-1.5">
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t px-5 py-3 flex gap-2">
            <button onClick={() => setEditMode(true)} className="btn-primary flex-1 text-sm py-2">
              Update Stage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit stage modal (quick inline) ──────────────────────────────────────────

function EditStageModal({
  info, cycleId, onClose, onSaved,
}: {
  info: { cycleId: string; orgUnitId: string; stageKey: string; cell?: any };
  cycleId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [state, setState] = useState<StageState>(info.cell?.state ?? 'NOT_STARTED');
  const [note, setNote] = useState(info.cell?.note ?? '');
  const [ownerName, setOwnerName] = useState(info.cell?.ownerName ?? '');
  const [ownerRole, setOwnerRole] = useState(info.cell?.ownerRole ?? '');
  const [dueDate, setDueDate] = useState(info.cell?.dueDate ? String(info.cell.dueDate).slice(0, 10) : '');

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/program-flow/cycles/${cycleId}/units/${info.orgUnitId}/stage`, {
        stage: info.stageKey, state, note, ownerName, ownerRole, dueDate: dueDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['program-flow-pipeline', cycleId] });
      onSaved(); onClose();
    },
  });

  const stageMeta = STAGES.find((s) => s.key === info.stageKey);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{stageMeta?.label ?? info.stageKey}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'] as StageState[]).map((s) => {
              const m = STATE_META[s];
              return (
                <button key={s} onClick={() => setState(s)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                    state === s ? `ring-2 ring-blue-400 ${m.bgColor} ${m.textColor}` : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />{m.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded px-2.5 py-1.5 text-xs" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Owner name" />
            <select className="border rounded px-2.5 py-1.5 text-xs" value={ownerRole} onChange={(e) => setOwnerRole(e.target.value)}>
              <option value="">Role…</option>
              <option>Manager</option><option>Director</option><option>CNO</option><option>SVP</option>
            </select>
          </div>
          <input type="date" className="w-full border rounded px-2.5 py-1.5 text-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div>
            <label className={`block text-xs font-medium mb-1 ${state === 'BLOCKED' ? 'text-red-600' : 'text-gray-600'}`}>
              {state === 'BLOCKED' ? 'Blocked Reason' : 'Note'}
            </label>
            <textarea
              rows={2}
              className={`w-full border rounded px-2.5 py-1.5 text-xs resize-none ${state === 'BLOCKED' ? 'border-red-300 bg-red-50 placeholder:text-red-300' : ''}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={state === 'BLOCKED' ? 'What is blocking this stage?' : 'Add a note…'}
            />
          </div>
        </div>
        <div className="p-4 border-t flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-xs">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1 text-xs">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hospital row ──────────────────────────────────────────────────────────────

function HospitalRow({
  hospital, cycleId, onEdit, onDrillDown,
}: {
  hospital: any;
  cycleId: string;
  onEdit: (info: any) => void;
  onDrillDown: (info: any) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      {/* Hospital header */}
      <tr className="bg-gray-50/80 border-b border-gray-200">
        <td className="px-4 py-2.5 sticky left-0 bg-gray-50/80">
          <button onClick={() => setExpanded((x) => !x)} className="flex items-center gap-2 font-semibold text-sm text-gray-800 w-full text-left">
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            <span className="truncate">{hospital.hospitalName}</span>
            {hospital.unitRows.length > 0 && (
              <span className="text-xs text-gray-400 font-normal ml-1 flex-shrink-0">({hospital.unitRows.length})</span>
            )}
          </button>
        </td>
        {STAGES.map((s) => (
          <td key={s.key} className="px-1.5 py-2">
            <AggregateCell agg={hospital.aggregateStages?.[s.key]} />
          </td>
        ))}
      </tr>

      {/* Unit rows */}
      {expanded && hospital.unitRows.map((unit: any) => (
        <tr key={unit.orgUnitId} className="border-b border-gray-100 hover:bg-blue-50/20 transition-colors">
          <td className="px-4 py-2 sticky left-0 bg-white hover:bg-blue-50/20">
            <div className="flex items-center gap-2 pl-6">
              <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">{unit.orgUnitName}</span>
              {Object.values(unit.stages).some((s: any) => s.isStuck) && (
                <span className="flex-shrink-0 text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">stuck</span>
              )}
            </div>
          </td>
          {STAGES.map((s) => (
            <td key={s.key} className="px-1.5 py-1.5">
              <StageCell
                stageKey={s.key}
                stageLabel={s.label}
                cell={unit.stages?.[s.key]}
                cycleId={cycleId}
                orgUnitId={unit.orgUnitId}
                onEdit={onEdit}
                onDrillDown={onDrillDown}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color = 'text-gray-900', icon: Icon, pulse = false,
}: {
  label: string; value: string | number; sub?: string;
  color?: string; icon: any; pulse?: boolean;
}) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pulse ? 'bg-red-100' : 'bg-blue-50'}`}>
        <Icon className={`w-5 h-5 ${pulse ? 'text-red-500' : 'text-blue-500'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${color}`}>{value}</p>
        {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── Alert banner ──────────────────────────────────────────────────────────────

function AlertBanner({ alerts }: { alerts: any[] }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!alerts?.length) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
      <button
        onClick={() => setCollapsed((x) => !x)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-100/50 transition-colors"
      >
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-red-800 flex-1">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''} require attention
        </span>
        {collapsed ? <ChevronRight className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-red-400" />}
      </button>
      {!collapsed && (
        <div className="px-4 pb-3 space-y-2">
          {alerts.map((a, i) => {
            const meta = ALERT_META[a.severity as AlertSeverity] ?? ALERT_META.medium;
            return (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border ${meta.bg} ${meta.border}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${meta.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${meta.text}`}>{a.message}</p>
                  {a.unitNames?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.unitNames.join(', ')}{a.count > a.unitNames.length ? ` +${a.count - a.unitNames.length} more` : ''}
                    </p>
                  )}
                  {a.reasons?.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {a.reasons.map((r: string, ri: number) => (
                        <li key={ri} className={`text-xs ${meta.text} opacity-80 flex items-start gap-1`}>
                          <span className="mt-0.5 flex-shrink-0">·</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded flex-shrink-0 ${meta.bg} ${meta.text} border ${meta.border}`}>
                  {a.severity}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SLA config modal ──────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  SURVEY_SETUP:     'Survey Setup',
  SURVEY_EXECUTION: 'Survey Execution',
  ROOT_CAUSE:       'Root Cause Analysis',
  REMEDIATION:      'Remediation',
  COMMUNICATION:    'Communication',
  VALIDATION:       'Validation',
};

function SlaConfigModal({ cycleId, currentSla, onClose }: {
  cycleId: string;
  currentSla: Record<string, number>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(currentSla).map(([k, v]) => [k, String(v)])),
  );
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, parseInt(v, 10)]),
      );
      return api.patch(`/program-flow/cycles/${cycleId}/sla`, parsed);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['program-flow-pipeline', cycleId] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to save SLA config');
    },
  });

  const stages = Object.keys(STAGE_LABELS);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">SLA Configuration</h2>
            <p className="text-xs text-gray-500 mt-0.5">Set maximum days allowed per stage before flagging as overdue</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}
          {stages.map((stage) => (
            <div key={stage} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{STAGE_LABELS[stage]}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="w-20 border rounded-lg px-2.5 py-1.5 text-sm text-right"
                  value={values[stage] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [stage]: e.target.value }))}
                />
                <span className="text-sm text-gray-400 w-6">days</span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-5 border-t flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary text-sm">
            {mutation.isPending ? 'Saving…' : 'Save SLA Config'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create cycle modal ────────────────────────────────────────────────────────

function CreateCycleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [surveyId, setSurveyId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetEndDate, setTargetEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: surveys } = useQuery({
    queryKey: ['surveys-list'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });
  const surveyList = Array.isArray(surveys) ? surveys : (surveys?.data ?? []);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/program-flow/cycles', { name, surveyId: surveyId || undefined, startDate, targetEndDate: targetEndDate || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['program-flow-cycles'] });
      onCreated(); onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to create cycle';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">New Program Cycle</h2>
            <p className="text-sm text-gray-500 mt-0.5">Create a transformation cycle to track all 6 stages</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Cycle Name <span className="text-red-500">*</span></label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="e.g. Q1 2025 Engagement Cycle" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Linked Survey</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
              <option value="">Select survey…</option>
              {surveyList.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target End Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()} className="btn-primary">
            {mutation.isPending ? 'Creating…' : 'Create Cycle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgramFlowPage() {
  const qc = useQueryClient();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  const [editingStage, setEditingStage] = useState<any | null>(null);
  const [showSlaConfig, setShowSlaConfig] = useState(false);
  const [drawerInfo, setDrawerInfo] = useState<any | null>(null);

  const { data: cyclesData } = useQuery({
    queryKey: ['program-flow-cycles'],
    queryFn: () => api.get('/program-flow/cycles').then((r) => r.data),
  });
  const cycles: any[] = Array.isArray(cyclesData) ? cyclesData : (cyclesData?.data ?? []);
  const activeCycleId = selectedCycleId ?? cycles[0]?.id ?? null;

  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['program-flow-pipeline', activeCycleId],
    queryFn: () => api.get(`/program-flow/cycles/${activeCycleId}/pipeline`).then((r) => r.data),
    enabled: !!activeCycleId,
    refetchInterval: 60000,
  });

  const autoComputeMutation = useMutation({
    mutationFn: () => api.post(`/program-flow/cycles/${activeCycleId}/auto-compute`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-flow-pipeline', activeCycleId] }),
  });

  const kpis = pipeline?.kpis ?? {};
  const alerts = pipeline?.alerts ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Program Flow</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {pipeline?.cycle?.name
                ? `${pipeline.cycle.name} · ${pipeline.cycle.surveyTitle ?? 'No survey linked'}`
                : 'Transformation command center'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeCycleId && (
              <>
                <button
                  onClick={() => autoComputeMutation.mutate()}
                  disabled={autoComputeMutation.isPending}
                  className="btn-secondary flex items-center gap-1.5 text-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {autoComputeMutation.isPending ? 'Computing…' : 'Auto-Compute'}
                </button>
                <button
                  onClick={() => setShowSlaConfig(true)}
                  className="btn-secondary flex items-center gap-1.5 text-sm"
                  title="Configure SLA thresholds"
                >
                  <Settings className="w-3.5 h-3.5" /> SLA
                </button>
                <button
                  onClick={() => qc.invalidateQueries({ queryKey: ['program-flow-pipeline', activeCycleId] })}
                  className="btn-secondary flex items-center gap-1.5 text-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button onClick={() => setShowCreateCycle(true)} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> New Cycle
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-[1400px] mx-auto">

        {/* Cycle tabs */}
        {cycles.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {cycles.map((c) => (
              <button key={c.id} onClick={() => setSelectedCycleId(c.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeCycleId === c.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-300 bg-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {activeCycleId && pipeline ? (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="card col-span-2 md:col-span-1 lg:col-span-1">
                <p className="text-xs text-gray-500 mb-1">Overall Progress</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-blue-600">{kpis.overallCompletion ?? 0}%</span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${kpis.overallCompletion ?? 0}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{kpis.totalUnits ?? 0} units tracked</p>
              </div>
              <KpiCard label="Hospitals Active"    value={kpis.hospitalsActive ?? 0}  icon={Activity}       color="text-gray-900"
                sub={`${kpis.totalUnits ?? 0} units in scope`} />
              <KpiCard label="Units Stuck"         value={kpis.unitsStuck ?? 0}       icon={AlertCircle}    color={(kpis.unitsStuck ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'} pulse={(kpis.unitsStuck ?? 0) > 0}
                sub={(kpis.unitsStuck ?? 0) > 0 ? 'Blocked or no progress' : 'All units moving'} />
              <KpiCard label="Overdue Tasks"       value={kpis.overdueTasks ?? 0}     icon={Flag}           color={(kpis.overdueTasks ?? 0) > 0 ? 'text-orange-600' : 'text-emerald-600'} pulse={(kpis.overdueTasks ?? 0) > 0}
                sub={(kpis.overdueTasks ?? 0) > 0 ? 'Requires immediate follow-up' : 'No overdue tasks'} />
              <KpiCard label="Chronic Issues"      value={kpis.chronicIssues ?? 0}    icon={AlertTriangle}  color={(kpis.chronicIssues ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}
                sub={(kpis.chronicIssues ?? 0) > 0 ? 'Open > 30 days' : 'No chronic issues'} />
              <KpiCard label="Avg Days / Stage"    value={kpis.avgDaysPerStage != null ? `${kpis.avgDaysPerStage}d` : '—'} icon={BarChart3} color="text-gray-900"
                sub="Across in-progress units" />
            </div>

            {/* Alerts */}
            {alerts.length > 0 && <AlertBanner alerts={alerts} />}

            {/* Pipeline grid */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-3.5 border-b bg-gray-50/50">
                <h2 className="font-semibold text-gray-800 text-sm flex-1">Pipeline by Hospital</h2>
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {(['COMPLETED', 'IN_PROGRESS', 'BLOCKED', 'NOT_STARTED'] as StageState[]).map((s) => {
                    const m = STATE_META[s];
                    const Icon = m.icon;
                    return (
                      <span key={s} className={`flex items-center gap-1 ${m.textColor}`}>
                        <Icon className="w-3 h-3" /> {m.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 900 }}>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-white border-r border-gray-100" style={{ minWidth: 200 }}>
                        Hospital / Unit
                      </th>
                      {STAGES.map((s, i) => (
                        <th key={s.key} className="px-1.5 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ minWidth: 110 }}>
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</div>
                            {s.short}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={STAGES.length + 1} className="py-20 text-center text-gray-400 text-sm">Loading pipeline…</td>
                      </tr>
                    ) : (pipeline.hospitals ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={STAGES.length + 1} className="py-20 text-center text-gray-400 text-sm">
                          No hospitals found. Create a cycle to get started.
                        </td>
                      </tr>
                    ) : (
                      (pipeline.hospitals ?? []).map((hospital: any) => (
                        <HospitalRow
                          key={hospital.hospitalId}
                          hospital={hospital}
                          cycleId={activeCycleId}
                          onEdit={setEditingStage}
                          onDrillDown={setDrawerInfo}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stage flow legend */}
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {STAGES.map((s, i) => (
                <div key={s.key} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center gap-1 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</div>
                    <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">{s.label}</p>
                    <p className="text-[10px] text-gray-400">SLA: {pipeline.stageSla?.[s.key] ?? '—'}d</p>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className="flex items-center px-1">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : !isLoading && (
          <div className="text-center py-24 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-600">No program cycles yet</p>
            <p className="text-sm mt-1 mb-6">Create a cycle to start tracking your transformation program</p>
            <button onClick={() => setShowCreateCycle(true)} className="btn-primary mx-auto">
              Create First Cycle
            </button>
          </div>
        )}
      </div>

      {/* Modals + drawer */}
      {showCreateCycle && (
        <CreateCycleModal
          onClose={() => setShowCreateCycle(false)}
          onCreated={() => {}}
        />
      )}
      {editingStage && (
        <EditStageModal
          info={editingStage}
          cycleId={activeCycleId!}
          onClose={() => setEditingStage(null)}
          onSaved={() => {}}
        />
      )}
      {drawerInfo && (
        <StageDrawer
          info={drawerInfo}
          cycleId={activeCycleId!}
          onClose={() => setDrawerInfo(null)}
          onSaved={() => {}}
        />
      )}
      {showSlaConfig && activeCycleId && pipeline && (
        <SlaConfigModal
          cycleId={activeCycleId}
          currentSla={pipeline.stageSla ?? {}}
          onClose={() => setShowSlaConfig(false)}
        />
      )}
    </div>
  );
}
