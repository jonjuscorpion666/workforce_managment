'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, Clock, AlertCircle, Circle, ChevronDown, ChevronRight,
  RefreshCw, Plus, Zap, X, User, Flag, AlertTriangle,
  Activity, BarChart3, ClipboardCheck, Settings, Building2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type StageState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

const STAGES = [
  { key: 'SURVEY_SETUP',     label: 'Survey Setup',   short: 'Setup' },
  { key: 'SURVEY_EXECUTION', label: 'Execution',      short: 'Execute' },
  { key: 'ROOT_CAUSE',       label: 'Root Cause',     short: 'Root Cause' },
  { key: 'REMEDIATION',      label: 'Remediation',    short: 'Remediate' },
  { key: 'COMMUNICATION',    label: 'Communication',  short: 'Comms' },
  { key: 'VALIDATION',       label: 'Validation',     short: 'Validate' },
] as const;

const STATE_META: Record<StageState, { label: string; textColor: string; bgColor: string; borderColor: string; icon: any }> = {
  NOT_STARTED: { label: 'Not Started', textColor: 'text-gray-500',    bgColor: 'bg-gray-50',    borderColor: 'border-gray-200',   icon: Circle },
  IN_PROGRESS: { label: 'In Progress', textColor: 'text-amber-700',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-300',  icon: Clock },
  COMPLETED:   { label: 'Completed',   textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300',icon: CheckCircle2 },
  BLOCKED:     { label: 'Blocked',     textColor: 'text-red-800',     bgColor: 'bg-red-100',    borderColor: 'border-red-500',    icon: AlertCircle },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ownerInitials(name: string | null | undefined) {
  if (!name) return null;
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDate(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

// ── Stage step circle ─────────────────────────────────────────────────────────

function StageCircle({
  stageIndex, state, daysInStage, isOverSla, isStale, onClick,
}: {
  stageIndex: number; state: StageState;
  daysInStage?: number; isOverSla?: boolean; isStale?: boolean;
  onClick: () => void;
}) {
  const base = 'relative flex flex-col items-center gap-1 cursor-pointer group';

  const circleStyle =
    state === 'COMPLETED'   ? 'w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm ring-2 ring-emerald-200'
    : state === 'IN_PROGRESS' ? `w-9 h-9 rounded-full flex items-center justify-center shadow-sm ring-2 ${isOverSla ? 'bg-red-500 text-white ring-red-200' : isStale ? 'bg-amber-400 text-white ring-amber-200' : 'bg-amber-400 text-white ring-amber-200'}`
    : state === 'BLOCKED'   ? 'w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm ring-2 ring-red-200'
    : 'w-9 h-9 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border-2 border-dashed border-gray-300';

  const tooltip =
    state === 'COMPLETED'   ? 'Completed'
    : state === 'IN_PROGRESS' ? isOverSla ? `Over SLA — ${daysInStage}d in stage` : `${daysInStage ?? 0}d in stage`
    : state === 'BLOCKED'   ? 'Blocked'
    : 'Not started';

  return (
    <div className={base} onClick={onClick} title={tooltip}>
      <div className={`${circleStyle} hover:scale-110 transition-transform`}>
        {state === 'COMPLETED'   && <CheckCircle2 className="w-4 h-4" />}
        {state === 'IN_PROGRESS' && <span className="text-xs font-bold">{stageIndex + 1}</span>}
        {state === 'BLOCKED'     && <AlertCircle className="w-4 h-4" />}
        {state === 'NOT_STARTED' && <span className="text-xs font-semibold text-gray-400">{stageIndex + 1}</span>}
      </div>
      {/* SLA / stale dot */}
      {(isOverSla || isStale) && state === 'IN_PROGRESS' && (
        <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isOverSla ? 'bg-red-500' : 'bg-amber-400'}`} />
      )}
    </div>
  );
}

// ── Stage connector line ──────────────────────────────────────────────────────

function Connector({ leftDone }: { leftDone: boolean }) {
  return (
    <div className={`flex-1 h-0.5 mt-[18px] ${leftDone ? 'bg-emerald-400' : 'bg-gray-200'}`} />
  );
}

// ── Unit progress row ─────────────────────────────────────────────────────────

function UnitRow({ unit, cycleId, onDrillDown }: { unit: any; cycleId: string; onDrillDown: (info: any) => void }) {
  const hasBlocked = Object.values(unit.stages ?? {}).some((s: any) => s?.state === 'BLOCKED');
  const hasOverSla = Object.values(unit.stages ?? {}).some((s: any) => s?.isOverSla);

  // Find current active stage index for the progress label
  const currentStageIdx = STAGES.findIndex((s) => {
    const cell = unit.stages?.[s.key];
    return cell?.state === 'IN_PROGRESS' || cell?.state === 'BLOCKED';
  });
  const completedCount = STAGES.filter((s) => unit.stages?.[s.key]?.state === 'COMPLETED').length;

  return (
    <div className={`px-5 py-3 border-t border-gray-100 ${hasBlocked ? 'bg-red-50/40' : 'hover:bg-gray-50/60'} transition-colors`}>
      <div className="flex items-center gap-4">
        {/* Unit name */}
        <div className="w-44 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
            <span className="text-sm text-gray-800 font-medium truncate">{unit.orgUnitName}</span>
          </div>
          {hasBlocked && (
            <span className="ml-3.5 text-xs font-semibold text-red-600">⚠ blocked</span>
          )}
        </div>

        {/* Stage circles + connectors */}
        <div className="flex-1 flex items-center min-w-0">
          {STAGES.map((s, i) => {
            const cell = unit.stages?.[s.key];
            const state: StageState = cell?.state ?? 'NOT_STARTED';
            return (
              <div key={s.key} className="flex items-center flex-1">
                <StageCircle
                  stageIndex={i}
                  state={state}
                  daysInStage={cell?.daysInStage}
                  isOverSla={cell?.isOverSla}
                  isStale={cell?.isStale}
                  onClick={() => onDrillDown({ cycleId, orgUnitId: unit.orgUnitId, stageKey: s.key, stageLabel: s.label, cell })}
                />
                {i < STAGES.length - 1 && (
                  <Connector leftDone={state === 'COMPLETED'} />
                )}
              </div>
            );
          })}
        </div>

        {/* Stage label */}
        <div className="w-28 flex-shrink-0 text-right">
          {currentStageIdx >= 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-700">{STAGES[currentStageIdx].short}</p>
              {unit.stages?.[STAGES[currentStageIdx].key]?.daysInStage != null && (
                <p className={`text-xs ${unit.stages?.[STAGES[currentStageIdx].key]?.isOverSla ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                  {unit.stages?.[STAGES[currentStageIdx].key]?.daysInStage}d in stage
                </p>
              )}
            </div>
          ) : completedCount === STAGES.length ? (
            <span className="text-xs font-semibold text-emerald-600">All done ✓</span>
          ) : (
            <span className="text-xs text-gray-400">Not started</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hospital card ─────────────────────────────────────────────────────────────

function HospitalCard({ hospital, cycleId, onDrillDown }: {
  hospital: any; cycleId: string;
  onDrillDown: (info: any) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const units: any[] = hospital.unitRows ?? [];
  const completedUnits = units.filter((u) => STAGES.every((s) => u.stages?.[s.key]?.state === 'COMPLETED')).length;
  const blockedUnits   = units.filter((u) => Object.values(u.stages ?? {}).some((s: any) => s?.state === 'BLOCKED')).length;
  const stuckUnits     = units.filter((u) => Object.values(u.stages ?? {}).some((s: any) => s?.isStuck)).length;
  const progressPct    = units.length ? Math.round((completedUnits / units.length) * 100) : 0;

  // Aggregate: find the stage most units are currently on
  const stageCounts = STAGES.map((s) => ({
    ...s,
    inProgress: units.filter((u) => u.stages?.[s.key]?.state === 'IN_PROGRESS').length,
    completed:  units.filter((u) => u.stages?.[s.key]?.state === 'COMPLETED').length,
    blocked:    units.filter((u) => u.stages?.[s.key]?.state === 'BLOCKED').length,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Hospital header */}
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setExpanded((x) => !x)}
      >
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm">{hospital.hospitalName}</p>
            {blockedUnits > 0 && (
              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                {blockedUnits} blocked
              </span>
            )}
            {stuckUnits > 0 && blockedUnits === 0 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                {stuckUnits} stuck
              </span>
            )}
          </div>
          {/* Mini progress bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{completedUnits}/{units.length} units</span>
          </div>
        </div>

        {/* Stage mini-summary */}
        <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
          {stageCounts.map((s) => (
            <div key={s.key} className="flex flex-col items-center gap-0.5 w-10">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                ${s.blocked > 0 ? 'bg-red-100 text-red-600'
                  : s.inProgress > 0 ? 'bg-amber-100 text-amber-700'
                  : s.completed === units.length && units.length > 0 ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-400'}`}>
                {s.blocked > 0 ? s.blocked : s.inProgress > 0 ? s.inProgress : s.completed > 0 ? '✓' : '—'}
              </div>
              <p className="text-[9px] text-gray-400 text-center leading-tight whitespace-nowrap">{s.short}</p>
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 ml-2 text-gray-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Unit rows */}
      {expanded && (
        <>
          {/* Stage header */}
          <div className="flex items-center gap-4 px-5 py-2 bg-gray-50 border-t border-gray-100">
            <div className="w-44 flex-shrink-0" />
            <div className="flex-1 flex items-center">
              {STAGES.map((s, i) => (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-9">
                    <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{s.short}</span>
                  </div>
                  {i < STAGES.length - 1 && <div className="flex-1" />}
                </div>
              ))}
            </div>
            <div className="w-28 flex-shrink-0" />
          </div>

          {units.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-400 italic border-t border-gray-100">No units configured for this hospital.</div>
          ) : (
            units.map((unit) => (
              <UnitRow key={unit.orgUnitId} unit={unit} cycleId={cycleId} onDrillDown={onDrillDown} />
            ))
          )}
        </>
      )}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'text-gray-900', icon: Icon, pulse = false }: {
  label: string; value: string | number; sub?: string;
  color?: string; icon: any; pulse?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
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
    <div className="rounded-2xl border border-red-200 bg-red-50 overflow-hidden">
      <button
        onClick={() => setCollapsed((x) => !x)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-red-100/50 transition-colors"
      >
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-red-800 flex-1">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''} need attention
        </span>
        {collapsed ? <ChevronRight className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-red-400" />}
      </button>
      {!collapsed && (
        <div className="px-5 pb-4 space-y-2">
          {alerts.map((a, i) => {
            const colors = a.severity === 'critical'
              ? { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' }
              : a.severity === 'high'
              ? { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' }
              : { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-400' };
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${colors.bg}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`} />
                <div>
                  <p className={`text-sm font-medium ${colors.text}`}>{a.message}</p>
                  {a.unitNames?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.unitNames.join(', ')}{a.count > a.unitNames.length ? ` +${a.count - a.unitNames.length} more` : ''}
                    </p>
                  )}
                </div>
                <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${colors.text} bg-white/60`}>
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

// ── Stage drawer ──────────────────────────────────────────────────────────────

function StageDrawer({ info, cycleId, onClose }: {
  info: { cycleId: string; orgUnitId: string; stageKey: string; stageLabel: string; cell?: any };
  cycleId: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editMode, setEditMode]     = useState(false);
  const [editState, setEditState]   = useState<StageState>(info.cell?.state ?? 'NOT_STARTED');
  const [editNote, setEditNote]     = useState(info.cell?.note ?? '');
  const [editOwner, setEditOwner]   = useState(info.cell?.ownerName ?? '');
  const [editRole, setEditRole]     = useState(info.cell?.ownerRole ?? '');
  const [editDue, setEditDue]       = useState(info.cell?.dueDate ? String(info.cell.dueDate).slice(0, 10) : '');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['stage-detail', cycleId, info.orgUnitId, info.stageKey],
    queryFn: () =>
      api.get(`/program-flow/cycles/${cycleId}/units/${info.orgUnitId}/stage/${info.stageKey}/detail`)
        .then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/program-flow/cycles/${cycleId}/units/${info.orgUnitId}/stage`, {
        stage: info.stageKey, state: editState, note: editNote,
        ownerName: editOwner, ownerRole: editRole, dueDate: editDue || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['program-flow-pipeline', cycleId] });
      qc.invalidateQueries({ queryKey: ['stage-detail', cycleId, info.orgUnitId, info.stageKey] });
      setEditMode(false);
      toast.success('Stage updated');
    },
    onError: () => toast.error('Failed to update stage'),
  });

  const d = detail;
  const state: StageState = d?.state ?? info.cell?.state ?? 'NOT_STARTED';
  const m = STATE_META[state];
  const StatusIcon = m.icon;

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-amber-100 text-amber-700',
    BLOCKED: 'bg-red-100 text-red-700', RESOLVED: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-gray-100 text-gray-600', ACTION_PLANNED: 'bg-purple-100 text-purple-700',
    AWAITING_VALIDATION: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[480px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 border-b ${m.bgColor}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{info.stageLabel}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${m.bgColor} ${m.textColor} border ${m.borderColor}`}>
                  <StatusIcon className="w-3 h-3" /> {m.label}
                </span>
              </div>
              <h2 className="text-base font-semibold text-gray-900">{d?.orgUnit?.name ?? '…'}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading…</div>
          ) : (
            <div className="p-5 space-y-4">

              {/* Timeline strip */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-3">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Started</p>
                  <p className="text-sm font-semibold text-gray-800">{fmtDate(d?.startedAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Days In Stage</p>
                  <p className={`text-sm font-semibold ${(d?.daysInStage ?? 0) > (d?.stageSla ?? 99) ? 'text-red-600' : 'text-gray-800'}`}>
                    {d?.daysInStage ?? '—'}{d?.daysInStage != null ? 'd' : ''}
                    {(d?.daysOverSla ?? 0) > 0 && <span className="ml-1 text-xs text-red-500">(+{d.daysOverSla}d SLA)</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Target Date</p>
                  <p className="text-sm font-semibold text-gray-800">{fmtDate(d?.dueDate)}</p>
                </div>
              </div>

              {/* Blocked reason */}
              {state === 'BLOCKED' && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Why Blocked
                  </p>
                  <p className="text-sm text-red-900 font-medium">
                    {d?.blockedReason ?? 'No reason recorded.'}
                  </p>
                </div>
              )}

              {/* Owner */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {ownerInitials(d?.ownerName) ?? <User className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{d?.ownerName ?? 'No owner assigned'}</p>
                  <p className="text-xs text-gray-500">{d?.ownerRole ?? '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-400">Last updated</p>
                  <p className="text-xs font-medium text-gray-600">{relativeDate(d?.updatedAt)}</p>
                </div>
              </div>

              {/* Stale warning */}
              {d?.isStale && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">Stale — </span>
                    no update in {d.daysSinceUpdate}d.
                  </p>
                </div>
              )}

              {/* Next action */}
              {d?.nextAction && (
                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Zap className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">Recommended Action</p>
                    <p className="text-sm text-blue-900">{d.nextAction}</p>
                  </div>
                </div>
              )}

              {/* Note */}
              {d?.note && state !== 'BLOCKED' && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-900">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Note</p>
                  {d.note}
                </div>
              )}

              {/* Summary counters */}
              {d?.summary && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Issues',  value: d.summary.totalIssues,      warn: d.summary.openIssues > 0 },
                    { label: 'Tasks',   value: d.summary.totalTasks,       warn: false },
                    { label: 'Overdue', value: d.summary.overdueTasks,     warn: d.summary.overdueTasks > 0 },
                    { label: 'Plans',   value: d.summary.totalActionPlans, warn: false },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl bg-gray-50 p-2.5">
                      <p className={`text-lg font-bold ${c.warn && c.value > 0 ? 'text-red-600' : 'text-gray-800'}`}>{c.value}</p>
                      <p className="text-[10px] text-gray-500">{c.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Issues list */}
              {d?.issues?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Issues ({d.issues.length})</p>
                  <div className="space-y-1.5">
                    {d.issues.map((issue: any) => (
                      <div key={issue.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 bg-white">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{issue.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{issue.daysOpen}d open · {issue.severity}</p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[issue.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {issue.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks list */}
              {d?.tasks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Tasks ({d.tasks.length})
                    {d.summary?.overdueTasks > 0 && <span className="ml-2 text-red-600 normal-case">⚠ {d.summary.overdueTasks} overdue</span>}
                  </p>
                  <div className="space-y-1.5">
                    {d.tasks.map((task: any) => (
                      <div key={task.id} className={`flex items-center gap-2 p-2.5 rounded-xl border ${task.isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {task.priority}{task.dueDate && ` · Due ${fmtDate(task.dueDate)}`}
                            {task.isOverdue && ` · ${task.daysOverdue}d overdue`}
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          task.status === 'DONE' ? 'bg-emerald-100 text-emerald-700'
                          : task.isOverdue ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'}`}>
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

        {/* Edit footer */}
        {editMode ? (
          <div className="border-t bg-gray-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Update Stage</p>
            <div className="grid grid-cols-2 gap-2">
              {(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'] as StageState[]).map((s) => {
                const mm = STATE_META[s];
                return (
                  <button key={s} onClick={() => setEditState(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      editState === s ? `ring-2 ring-blue-400 ${mm.bgColor} ${mm.textColor} border-transparent` : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                    <mm.icon className="w-3.5 h-3.5" /> {mm.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded-xl px-3 py-2 text-sm" value={editOwner} onChange={(e) => setEditOwner(e.target.value)} placeholder="Owner name" />
              <select className="border rounded-xl px-3 py-2 text-sm" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="">Role…</option>
                <option>Manager</option><option>Director</option><option>CNO</option><option>SVP</option>
              </select>
            </div>
            <input type="date" className="w-full border rounded-xl px-3 py-2 text-sm" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
            <div>
              <label className={`block text-xs font-medium mb-1 ${editState === 'BLOCKED' ? 'text-red-600' : 'text-gray-600'}`}>
                {editState === 'BLOCKED' ? 'Why is it blocked?' : 'Note'}
              </label>
              <textarea rows={2} className={`w-full border rounded-xl px-3 py-2 text-sm resize-none ${editState === 'BLOCKED' ? 'border-red-300 bg-red-50' : ''}`}
                value={editNote} onChange={(e) => setEditNote(e.target.value)}
                placeholder={editState === 'BLOCKED' ? 'Describe the blocker…' : 'Add a note…'} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary flex-1 text-sm">
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t px-5 py-3">
            <button onClick={() => setEditMode(true)} className="btn-primary w-full text-sm py-2.5">
              Update Stage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SLA config modal ──────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  SURVEY_SETUP: 'Survey Setup', SURVEY_EXECUTION: 'Survey Execution',
  ROOT_CAUSE: 'Root Cause Analysis', REMEDIATION: 'Remediation',
  COMMUNICATION: 'Communication', VALIDATION: 'Validation',
};

function SlaConfigModal({ cycleId, currentSla, onClose }: { cycleId: string; currentSla: Record<string, number>; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(currentSla).map(([k, v]) => [k, String(v)])),
  );

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/program-flow/cycles/${cycleId}/sla`,
        Object.fromEntries(Object.entries(values).map(([k, v]) => [k, parseInt(v, 10)])),
      ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['program-flow-pipeline', cycleId] }); toast.success('SLA saved'); onClose(); },
    onError: () => toast.error('Failed to save SLA'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">SLA Configuration</h2>
            <p className="text-xs text-gray-500 mt-0.5">Max days per stage before flagging as overdue</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {Object.keys(STAGE_LABELS).map((stage) => (
            <div key={stage} className="flex items-center gap-3">
              <p className="text-sm text-gray-700 flex-1">{STAGE_LABELS[stage]}</p>
              <input type="number" min={1} max={365} className="w-20 border rounded-xl px-3 py-1.5 text-sm text-right"
                value={values[stage] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [stage]: e.target.value }))} />
              <span className="text-sm text-gray-400 w-8">days</span>
            </div>
          ))}
        </div>
        <div className="p-5 border-t flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary text-sm">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create cycle modal ────────────────────────────────────────────────────────

function CreateCycleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName]               = useState('');
  const [surveyId, setSurveyId]       = useState('');
  const [startDate, setStartDate]     = useState(new Date().toISOString().slice(0, 10));
  const [targetEndDate, setTargetEnd] = useState('');
  const [error, setError]             = useState<string | null>(null);

  const { data: surveys } = useQuery({
    queryKey: ['surveys-list'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });
  const surveyList = Array.isArray(surveys) ? surveys : (surveys?.data ?? []);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/program-flow/cycles', { name, surveyId: surveyId || undefined, startDate, targetEndDate: targetEndDate || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['program-flow-cycles'] }); toast.success('Cycle created'); onClose(); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to create cycle';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">New Program Cycle</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track all 6 stages across every hospital</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1.5">Cycle Name <span className="text-red-500">*</span></label>
            <input className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="e.g. Q1 2025 Engagement Cycle" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Linked Survey</label>
            <select className="w-full border rounded-xl px-3 py-2.5 text-sm" value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
              <option value="">Select survey…</option>
              {surveyList.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Start Date</label>
              <input type="date" className="w-full border rounded-xl px-3 py-2.5 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Target End Date</label>
              <input type="date" className="w-full border rounded-xl px-3 py-2.5 text-sm" value={targetEndDate} onChange={(e) => setTargetEnd(e.target.value)} />
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
  const { hasRole } = useAuth();
  const toast = useToast();
  const isCNO = hasRole('CNO');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  const [showSlaConfig, setShowSlaConfig]     = useState(false);
  const [drawerInfo, setDrawerInfo]           = useState<any | null>(null);

  const { data: profile } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data),
    enabled: isCNO,
  });
  const cnoHospitalId = isCNO ? profile?.hospital?.id : null;

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

  const autoCompute = useMutation({
    mutationFn: () => api.post(`/program-flow/cycles/${activeCycleId}/auto-compute`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['program-flow-pipeline', activeCycleId] }); toast.success('Auto-compute done'); },
    onError: () => toast.error('Auto-compute failed'),
  });

  const kpis   = pipeline?.kpis   ?? {};
  const alerts = pipeline?.alerts ?? [];
  const visibleHospitals = (pipeline?.hospitals ?? [])
    .filter((h: any) => !cnoHospitalId || h.hospitalId === cnoHospitalId);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Program Flow</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {pipeline?.cycle?.name
              ? `${pipeline.cycle.name} · ${pipeline.cycle.surveyTitle ?? 'No survey linked'}`
              : 'Track your 6-stage improvement cycle across all hospitals'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCycleId && (
            <>
              <button onClick={() => autoCompute.mutate()} disabled={autoCompute.isPending}
                className="btn-secondary flex items-center gap-1.5 text-sm">
                <Zap className="w-3.5 h-3.5" />
                {autoCompute.isPending ? 'Computing…' : 'Auto-Compute'}
              </button>
              <button onClick={() => setShowSlaConfig(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Settings className="w-3.5 h-3.5" /> SLA
              </button>
              <button onClick={() => qc.invalidateQueries({ queryKey: ['program-flow-pipeline', activeCycleId] })}
                className="btn-secondary p-2">
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={() => setShowCreateCycle(true)} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> New Cycle
          </button>
        </div>
      </div>

      {/* Cycle tabs */}
      {cycles.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {cycles.map((c) => (
            <button key={c.id} onClick={() => setSelectedCycleId(c.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                activeCycleId === c.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-300 bg-white'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {activeCycleId && pipeline ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1">
              <p className="text-xs text-gray-500 mb-1">Overall Progress</p>
              <p className="text-3xl font-bold text-blue-600">{kpis.overallCompletion ?? 0}%</p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${kpis.overallCompletion ?? 0}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{kpis.totalUnits ?? 0} units tracked</p>
            </div>
            <KpiCard label="Hospitals Active"  value={kpis.hospitalsActive ?? 0}  icon={Activity}      sub={`${kpis.totalUnits ?? 0} units`} />
            <KpiCard label="Units Stuck"       value={kpis.unitsStuck ?? 0}       icon={AlertCircle}   color={(kpis.unitsStuck ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'} pulse={(kpis.unitsStuck ?? 0) > 0} />
            <KpiCard label="Overdue Tasks"     value={kpis.overdueTasks ?? 0}     icon={Flag}          color={(kpis.overdueTasks ?? 0) > 0 ? 'text-orange-600' : 'text-emerald-600'} pulse={(kpis.overdueTasks ?? 0) > 0} />
            <KpiCard label="Chronic Issues"    value={kpis.chronicIssues ?? 0}    icon={AlertTriangle} color={(kpis.chronicIssues ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'} />
            <KpiCard label="Avg Days / Stage"  value={kpis.avgDaysPerStage != null ? `${kpis.avgDaysPerStage}d` : '—'} icon={BarChart3} />
          </div>

          {/* Alerts */}
          {alerts.length > 0 && <AlertBanner alerts={alerts} />}

          {/* Stage legend */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-shrink-0">
            {STAGES.map((s, i) => (
              <div key={s.key} className="flex items-center flex-shrink-0">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">{s.label}</p>
                    <p className="text-[10px] text-gray-400">SLA: {pipeline.stageSla?.[s.key] ?? '—'}d</p>
                  </div>
                </div>
                {i < STAGES.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
              </div>
            ))}
          </div>

          {/* Hospital cards */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center text-gray-400 text-sm">Loading pipeline…</div>
          ) : visibleHospitals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center text-gray-400 text-sm">
              No hospitals found for this cycle.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleHospitals.map((hospital: any) => (
                <HospitalCard
                  key={hospital.hospitalId}
                  hospital={hospital}
                  cycleId={activeCycleId}
                  onDrillDown={setDrawerInfo}
                />
              ))}
            </div>
          )}
        </>
      ) : !isLoading && (
        <div className="text-center py-24 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-600 mb-1">No program cycle yet</p>
          <p className="text-sm mb-6">Create a cycle to start tracking your 6-stage improvement process.</p>
          <button onClick={() => setShowCreateCycle(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Cycle
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateCycle && <CreateCycleModal onClose={() => setShowCreateCycle(false)} />}
      {showSlaConfig && activeCycleId && (
        <SlaConfigModal cycleId={activeCycleId} currentSla={pipeline?.stageSla ?? {}} onClose={() => setShowSlaConfig(false)} />
      )}
      {drawerInfo && (
        <StageDrawer info={drawerInfo} cycleId={activeCycleId!} onClose={() => setDrawerInfo(null)} />
      )}
    </div>
  );
}
