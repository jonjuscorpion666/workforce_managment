'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, CheckCircle2, Clock, LogOut, ChevronRight, ShieldCheck,
  Megaphone, AlertTriangle, Bell, Check, Globe, Building2, LayoutGrid,
  ChevronDown, MessageCircle, CheckSquare, TrendingUp, BookOpen,
  LayoutDashboard, Send, User, BarChart2,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/nurse-api';
import { useNurseAuth } from '@/lib/nurse-auth';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

type Tab = 'home' | 'updates' | 'issues' | 'tasks' | 'analytics' | 'guide';

// ─── Style maps ─────────────────────────────────────────────────────────────

const PRIORITY_BAR: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-400',
  MEDIUM:   'bg-blue-400',
  LOW:      'bg-gray-300',
};

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border border-red-200',
  HIGH:     'bg-orange-100 text-orange-700',
  MEDIUM:   'bg-blue-100 text-blue-700',
  LOW:      'bg-gray-100 text-gray-500',
};

const SCOPE_ICON: Record<string, React.ElementType> = {
  SYSTEM: Globe, HOSPITAL: Building2, DEPARTMENT: LayoutGrid,
  UNIT: LayoutGrid, ROLE: Bell, COMBINATION: Bell,
};

function typeLabel(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Announcement card ───────────────────────────────────────────────────────

function AnnouncementCard({ ann, onMarkRead, onAcknowledge }: {
  ann: any;
  onMarkRead: (id: string) => void;
  onAcknowledge: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(ann.priority === 'CRITICAL' || !ann.isRead);
  const ScopeIcon = SCOPE_ICON[ann.audienceMode] ?? Globe;

  function handleExpand() {
    setExpanded((v) => !v);
    if (!ann.isRead) onMarkRead(ann.id);
  }

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden
      ${ann.priority === 'CRITICAL' ? 'border-red-300 ring-1 ring-red-200' : !ann.isRead ? 'border-blue-200' : 'border-gray-200'}`}>

      {/* Priority bar */}
      <div className={`h-1 ${PRIORITY_BAR[ann.priority] ?? 'bg-gray-200'}`} />

      {/* Header row — always visible */}
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={handleExpand}>
        {/* Unread dot */}
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${!ann.isRead ? 'bg-blue-500' : 'bg-gray-200'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[ann.priority] ?? 'bg-gray-100 text-gray-500'}`}>
              {ann.priority}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {typeLabel(ann.type)}
            </span>
            {ann.isPinned && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pinned</span>
            )}
            {ann.requiresAcknowledgement && !ann.isAcknowledged && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Ack required
              </span>
            )}
            {ann.isAcknowledged && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Acknowledged
              </span>
            )}
          </div>

          <p className="font-semibold text-gray-900 text-sm">{ann.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <ScopeIcon className="w-3 h-3" />
            {formatDate(ann.publishedAt ?? ann.createdAt)}
          </p>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ann.body}</p>

          {/* Tags */}
          {ann.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ann.tags.map((tag: string) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {/* Acknowledgement action */}
          {ann.requiresAcknowledgement && !ann.isAcknowledged && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-800">
                  You must acknowledge this announcement
                  {ann.acknowledgementDueAt && ` · Due ${formatDate(ann.acknowledgementDueAt)}`}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); onAcknowledge(ann.id); }}
                  className="mt-2 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                  <Check className="w-3.5 h-3.5" /> I acknowledge this
                </button>
              </div>
            </div>
          )}

          {ann.isAcknowledged && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Acknowledged on {formatDate(ann.acknowledgedAt)}
            </p>
          )}

          {ann.expireAt && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Expires {formatDate(ann.expireAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Comments section (shared by Issue and Task cards) ───────────────────────

function CommentsSection({ endpoint }: { endpoint: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');

  const { data: comments = [], isLoading } = useQuery<any[]>({
    queryKey: ['comments', endpoint],
    queryFn: () => api.get(endpoint).then((r) => r.data),
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: () => api.post(endpoint, { content: text.trim() }),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['comments', endpoint] });
    },
  });

  return (
    <div className="border-t border-gray-100 pt-3 mt-1 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No comments yet — be the first.</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-800">{c.authorName ?? 'Team member'}</span>
                  <span className="text-[10px] text-gray-400">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          rows={2}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white placeholder-gray-400"
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
              e.preventDefault();
              addMutation.mutate();
            }
          }}
        />
        <button
          type="button"
          disabled={!text.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate()}
          className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {addMutation.isError && (
        <p className="text-xs text-red-500">Failed to post comment. Try again.</p>
      )}
    </div>
  );
}

// ─── Issue detail card ───────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: any }) {
  const [open, setOpen] = useState(false);
  const severityColor =
    issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
    issue.severity === 'HIGH'     ? 'bg-orange-100 text-orange-700' :
    issue.severity === 'MEDIUM'   ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500';
  const statusColor =
    issue.status === 'IN_PROGRESS'     ? 'bg-indigo-100 text-indigo-700' :
    issue.status === 'ACTION_PLANNED'  ? 'bg-purple-100 text-purple-700' :
    issue.status === 'BLOCKED'         ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
  const dotColor =
    issue.severity === 'CRITICAL' ? 'bg-red-500' :
    issue.severity === 'HIGH'     ? 'bg-orange-400' :
    issue.severity === 'MEDIUM'   ? 'bg-blue-400' : 'bg-gray-300';

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
      issue.severity === 'CRITICAL' ? 'border-red-200' : 'border-gray-200'
    }`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColor}`}>{issue.severity}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{issue.status.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-sm font-medium text-gray-900">{issue.title}</p>
          {issue.category && (
            <p className="text-xs text-gray-400 mt-0.5">{issue.category}{issue.subcategory ? ` · ${issue.subcategory}` : ''}</p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {issue.description && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {issue.orgUnit?.name && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Department</p>
                <p className="text-sm text-gray-800">{issue.orgUnit.name}</p>
              </div>
            )}
            {(issue.assignee || issue.assignedTo) && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Assigned to</p>
                <p className="text-sm text-gray-800">
                  {issue.assignee?.firstName
                    ? `${issue.assignee.firstName} ${issue.assignee.lastName}`
                    : issue.assignedTo ?? '—'}
                </p>
              </div>
            )}
            {issue.targetDate && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Target date</p>
                <p className="text-sm text-gray-800">{formatDate(issue.targetDate)}</p>
              </div>
            )}
            {issue.createdAt && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Raised</p>
                <p className="text-sm text-gray-800">{formatDate(issue.createdAt)}</p>
              </div>
            )}
          </div>
          {issue.status === 'BLOCKED' && issue.blockedReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-0.5">Blocked reason</p>
              <p className="text-sm text-red-700">{issue.blockedReason}</p>
            </div>
          )}
          {issue.resolutionNotes && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-0.5">Resolution notes</p>
              <p className="text-sm text-green-700">{issue.resolutionNotes}</p>
            </div>
          )}
          <CommentsSection endpoint={`/issues/${issue.id}/comments`} />
        </div>
      )}
    </div>
  );
}

// ─── Task detail card ─────────────────────────────────────────────────────────

function TaskCard({ task }: { task: any }) {
  const [open, setOpen] = useState(false);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const statusColor =
    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
    task.status === 'TODO'        ? 'bg-gray-100 text-gray-600' :
    task.status === 'REVIEW'      ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500';
  const priorityColor =
    task.priority === 'CRITICAL' || task.priority === 'HIGH' ? 'text-orange-500' : 'text-indigo-400';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <TrendingUp className={`w-4 h-4 flex-shrink-0 mt-0.5 ${priorityColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
              {task.status?.replace(/_/g, ' ')}
            </span>
            {isOverdue && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> Overdue
              </span>
            )}
            {task.priority && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                task.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                task.priority === 'HIGH'     ? 'bg-orange-100 text-orange-700' :
                task.priority === 'MEDIUM'   ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>{task.priority}</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900">{task.title}</p>
          {task.dueDate && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Due {formatDate(task.dueDate)}
            </p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {task.description && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(task.assignee || task.assignedTo) && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Assigned to</p>
                <p className="text-sm text-gray-800">
                  {task.assignee?.firstName
                    ? `${task.assignee.firstName} ${task.assignee.lastName}`
                    : task.assignedTo ?? '—'}
                </p>
              </div>
            )}
            {task.createdAt && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Created</p>
                <p className="text-sm text-gray-800">{formatDate(task.createdAt)}</p>
              </div>
            )}
          </div>
          {task.notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 mb-0.5">Notes</p>
              <p className="text-sm text-gray-700">{task.notes}</p>
            </div>
          )}
          <CommentsSection endpoint={`/tasks/${task.id}/comments`} />
        </div>
      )}
    </div>
  );
}

// ─── Analytics tab ───────────────────────────────────────────────────────────

const SCORE_DIMS = [
  'Advocacy', 'Organizational Pride', 'Workload & Wellbeing', 'Meaningful Work',
  'Recognition', 'Leadership Comms', 'Psychological Safety', 'Manager Feedback',
  'Professional Growth', 'Overall Experience',
];

function scoreColor(n: number) {
  if (n >= 70) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (n >= 50) return { bar: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50' };
  return           { bar: 'bg-red-400',        text: 'text-red-700',     bg: 'bg-red-50' };
}

function ScoreBar({ label, score, highlight }: { label: string; score: number; highlight?: boolean }) {
  const c = scoreColor(score);
  return (
    <div className={`rounded-xl p-3 ${highlight ? 'ring-2 ring-blue-400' : ''} bg-white border border-gray-100`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-medium ${highlight ? 'text-blue-700' : 'text-gray-700'} truncate pr-2`}>{label}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} flex-shrink-0`}>{score}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function AnalyticsTab({ myOrgUnit, heatmap, lowUnits, trends, loading }: {
  myOrgUnit: any;
  heatmap: any;
  lowUnits: any;
  trends: any;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  // ── My department scores from heatmap ─────────────────────────────────────
  const myUnit = heatmap?.units?.find((u: any) => u.orgUnitId === myOrgUnit?.id);
  const myScores: Record<string, number> = myUnit?.scores ?? {};

  // ── Avg scores across all departments (for comparison) ────────────────────
  const allUnits: any[] = heatmap?.units ?? [];
  const avgScores: Record<string, number> = {};
  if (allUnits.length > 0) {
    for (const dim of SCORE_DIMS) {
      const vals = allUnits.map((u) => u.scores?.[dim] ?? 0).filter((v) => v > 0);
      avgScores[dim] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    }
  }

  // ── Department ranking: overall favorable from low-units ──────────────────
  const deptRanking: any[] = (lowUnits?.units ?? []).sort((a: any, b: any) => b.overallFavorable - a.overallFavorable);
  const myRank = deptRanking.findIndex((u: any) => u.orgUnitId === myOrgUnit?.id) + 1;
  const myLowUnit = deptRanking.find((u: any) => u.orgUnitId === myOrgUnit?.id);

  // ── Hospital comparison: group by hospitalId, average overallFavorable ────
  const hospitalMap = new Map<string, { name: string; scores: number[] }>();
  for (const u of deptRanking) {
    if (!u.hospitalId) continue;
    if (!hospitalMap.has(u.hospitalId)) hospitalMap.set(u.hospitalId, { name: u.hospitalName, scores: [] });
    if (u.overallFavorable > 0) hospitalMap.get(u.hospitalId)!.scores.push(u.overallFavorable);
  }
  const hospitals = Array.from(hospitalMap.entries())
    .map(([id, { name, scores }]) => ({
      id, name,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    }))
    .sort((a, b) => b.avg - a.avg);
  const myHospitalId = myLowUnit?.hospitalId;

  // ── Trend cycles ──────────────────────────────────────────────────────────
  const cycles: any[] = trends?.cycles?.slice(-6) ?? [];

  const noData = !myUnit && allUnits.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-900">Department Insights</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {myOrgUnit?.name ?? 'Your department'} · how you compare across the hospital system
        </p>
      </div>

      {noData && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <BarChart2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm font-medium">No analytics data yet</p>
          <p className="text-gray-400 text-xs mt-1">Data will appear once surveys have been completed.</p>
        </div>
      )}

      {/* ── My dept overall score ── */}
      {myLowUnit && (
        <div className={`rounded-2xl p-4 ${scoreColor(myLowUnit.overallFavorable).bg} border border-gray-100`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Overall Engagement Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{myLowUnit.overallFavorable}%</p>
              <p className="text-xs text-gray-500 mt-0.5">{myOrgUnit?.name ?? 'Your dept'}</p>
            </div>
            <div className="text-right">
              {myRank > 0 && (
                <>
                  <p className="text-xs text-gray-400">Dept rank</p>
                  <p className="text-2xl font-bold text-gray-700">#{myRank}</p>
                  <p className="text-xs text-gray-400">of {deptRanking.length}</p>
                </>
              )}
            </div>
          </div>
          {myLowUnit.lowestDimension && (
            <div className="mt-3 bg-white/60 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-500">
                Lowest area: <span className="font-semibold text-gray-700">{myLowUnit.lowestDimension}</span>
                {' '}— <span className={scoreColor(myLowUnit.lowestScore).text}>{myLowUnit.lowestScore}%</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Dimension breakdown vs hospital avg ── */}
      {myUnit && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-800">Dimension Breakdown</p>
          <p className="text-xs text-gray-400 mb-2">Your dept (highlighted) vs hospital average</p>
          {SCORE_DIMS.filter((d) => (myScores[d] ?? 0) > 0 || (avgScores[d] ?? 0) > 0).map((dim) => {
            const mine = myScores[dim] ?? 0;
            const avg  = avgScores[dim] ?? 0;
            return (
              <div key={dim} className="space-y-1">
                <ScoreBar label={`${dim} (you)`} score={mine} highlight />
                {avg > 0 && (
                  <ScoreBar label={`${dim} (avg)`} score={avg} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Department ranking ── */}
      {deptRanking.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Department Rankings</p>
          <div className="space-y-2">
            {deptRanking.map((u: any, i: number) => {
              const isMe = u.orgUnitId === myOrgUnit?.id;
              const c = scoreColor(u.overallFavorable);
              return (
                <div key={u.orgUnitId} className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 ${isMe ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}>
                  <span className={`text-sm font-bold w-6 text-center ${isMe ? 'text-blue-600' : 'text-gray-400'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
                      {u.orgUnitName ?? '—'}{isMe ? ' (You)' : ''}
                    </p>
                    {u.hospitalName && <p className="text-xs text-gray-400 truncate">{u.hospitalName}</p>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} flex-shrink-0`}>
                    {u.overallFavorable}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Hospital vs hospital ── */}
      {hospitals.length > 1 && (
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Hospital Comparison</p>
          <div className="space-y-2">
            {hospitals.map((h, i) => {
              const isMe = h.id === myHospitalId;
              const c = scoreColor(h.avg);
              return (
                <div key={h.id} className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 ${isMe ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}>
                  <span className={`text-sm font-bold w-6 text-center ${isMe ? 'text-blue-600' : 'text-gray-400'}`}>{i + 1}</span>
                  <p className={`flex-1 text-sm font-medium truncate ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
                    {h.name}{isMe ? ' (Your hospital)' : ''}
                  </p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${c.bg} ${c.text}`}>{h.avg}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Trend over time ── */}
      {cycles.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Your Department Trend</p>
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            {cycles.map((c: any) => {
              const dims = c.dimensions ?? {};
              const vals = Object.values(dims) as number[];
              const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
              const col = scoreColor(overall);
              return (
                <div key={c.period} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16 flex-shrink-0">{c.period}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${col.bar} rounded-full transition-all`} style={{ width: `${overall}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${col.text} w-10 text-right flex-shrink-0`}>{overall}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Speak Up inline form ────────────────────────────────────────────────────

const SPEAK_UP_CATEGORIES = [
  { value: 'STAFFING',   label: 'Staffing' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'SCHEDULING', label: 'Scheduling' },
  { value: 'CULTURE',    label: 'Culture' },
  { value: 'SAFETY',     label: 'Safety' },
  { value: 'OTHER',      label: 'Other' },
] as const;

function SpeakUpSection() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'ANONYMOUS' | 'CONFIDENTIAL'>('ANONYMOUS');
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [preferredLevel, setPreferredLevel] = useState<'DIRECTOR' | 'CNO' | 'HR'>('HR');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/speak-up/cases', { category, description, privacy, urgency, preferredLevel }),
    onSuccess: () => { setSubmitted(true); setDescription(''); },
  });

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">Speak Up</p>
            <p className="text-xs text-gray-500">Raise a concern directly with Director, CNO, or HR</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 bg-white rounded-xl border border-blue-200 shadow-sm p-5 space-y-4">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-gray-800">Concern submitted</p>
              <p className="text-sm text-gray-500 mt-1">
                {urgency === 'URGENT' ? 'You will hear back within 24 hours.' : 'You will hear back within 72 hours.'}
              </p>
              <button
                onClick={() => { setSubmitted(false); setOpen(false); }}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p>Your concern bypasses your direct manager and goes to {preferredLevel}. {privacy === 'ANONYMOUS' ? 'Your identity is never stored.' : 'Your name is stored securely, hidden from your manager.'}</p>
              </div>

              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {SPEAK_UP_CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        category === c.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Your concern <span className="text-red-500">*</span></p>
                <textarea
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Describe what happened, when, and who was involved. The more detail, the faster we can act."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Urgency + Preferred level + Privacy in one compact row */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-gray-600 mb-1.5">Urgency</p>
                  <div className="flex flex-col gap-1">
                    {(['NORMAL', 'URGENT'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setUrgency(v)}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                          urgency === v
                            ? v === 'URGENT' ? 'border-red-400 bg-red-50 text-red-700 font-semibold' : 'border-blue-400 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {v === 'URGENT' ? '🔴 Urgent' : '🔵 Normal'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-600 mb-1.5">Escalate to</p>
                  <div className="flex flex-col gap-1">
                    {(['DIRECTOR', 'CNO', 'HR'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setPreferredLevel(v)}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                          preferredLevel === v ? 'border-blue-400 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-600 mb-1.5">Privacy</p>
                  <div className="flex flex-col gap-1">
                    {(['ANONYMOUS', 'CONFIDENTIAL'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setPrivacy(v)}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                          privacy === v ? 'border-blue-400 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {v === 'ANONYMOUS' ? '🔒 Anon' : '🔐 Conf.'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !description.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {mutation.isPending ? 'Submitting…' : 'Submit Concern'}
              </button>
              {mutation.isError && (
                <p className="text-xs text-red-600 text-center">
                  {(mutation.error as any)?.response?.data?.message ?? 'Submission failed. Try again.'}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Main portal page ────────────────────────────────────────────────────────

export default function NursePortalPage() {
  const { nurse, isAuthenticated, logout } = useNurseAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('home');

  useEffect(() => {
    if (!isAuthenticated) router.replace('/portal/login');
  }, [isAuthenticated, router]);

  // nurse_access_token is managed by nurse-auth.ts — no bleed into admin access_token

  const { data: surveys = [], isLoading: surveysLoading } = useQuery({
    queryKey: ['nurse-surveys', nurse?.id],
    queryFn: () => api.get('/surveys', { params: { status: 'ACTIVE', userId: nurse?.id } }).then((r) => r.data),
    enabled: isAuthenticated && !!nurse?.id,
  });

  const { data: feed = [], isLoading: feedLoading } = useQuery<any[]>({
    queryKey: ['nurse-announcements'],
    queryFn: () => api.get('/announcements/feed').then((r) => r.data),
    enabled: isAuthenticated,
  });

  const { data: allIssues = [] } = useQuery<any[]>({
    queryKey: ['nurse-dept-issues'],
    queryFn: () => api.get('/issues').then((r) => r.data),
    enabled: isAuthenticated,
  });

  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ['nurse-dept-tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
    enabled: isAuthenticated,
  });

  const { data: profile } = useQuery<any>({
    queryKey: ['nurse-profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 10 * 60_000,
  });

  const { data: heatmap, isLoading: heatmapLoading } = useQuery<any>({
    queryKey: ['nurse-heatmap'],
    queryFn: () => api.get('/analytics/heatmap').then((r) => r.data),
    enabled: isAuthenticated && tab === 'analytics',
    staleTime: 5 * 60_000,
  });

  const { data: lowUnits, isLoading: lowUnitsLoading } = useQuery<any>({
    queryKey: ['nurse-low-units'],
    queryFn: () => api.get('/analytics/low-units').then((r) => r.data),
    enabled: isAuthenticated && tab === 'analytics',
    staleTime: 5 * 60_000,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<any>({
    queryKey: ['nurse-trends', nurse?.orgUnit?.id],
    queryFn: () => api.get('/analytics/trends', { params: { orgUnitId: nurse?.orgUnit?.id } }).then((r) => r.data),
    enabled: isAuthenticated && tab === 'analytics' && !!nurse?.orgUnit?.id,
    staleTime: 5 * 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/read`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nurse-announcements'] }); toast.success('Marked as read'); },
    onError: () => toast.error('Failed to mark as read'),
  });
  const acknowledge = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/acknowledge`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nurse-announcements'] }); toast.success('Acknowledged'); },
    onError: () => toast.error('Failed to acknowledge'),
  });

  if (!isAuthenticated) return null;

  const activeSurveys   = (surveys as any[]).filter((s) => s.status === 'ACTIVE');
  const unreadCount     = feed.filter((a) => !a.isRead).length;
  const pendingAckCount = feed.filter((a) => a.requiresAcknowledgement && !a.isAcknowledged).length;
  const criticalUnacked = feed.filter((a) => a.priority === 'CRITICAL' && a.requiresAcknowledgement && !a.isAcknowledged);

  const myOrgUnitId = nurse?.orgUnit?.id;
  const OPEN_STATUSES = new Set(['OPEN', 'ACTION_PLANNED', 'IN_PROGRESS', 'BLOCKED', 'AWAITING_VALIDATION', 'REOPENED']);
  const deptIssues = allIssues
    .filter((i) => OPEN_STATUSES.has(i.status))
    .filter((i) => !myOrgUnitId || !i.orgUnit || i.orgUnit?.id === myOrgUnitId);
  const deptTasks = allTasks
    .filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
    .filter((t) => !myOrgUnitId || !t.orgUnitId || t.orgUnitId === myOrgUnitId);

  const TABS = [
    { id: 'home'      as Tab, label: 'Home',      Icon: LayoutDashboard, badge: 0 },
    { id: 'updates'   as Tab, label: 'Updates',   Icon: Megaphone,       badge: unreadCount + pendingAckCount },
    { id: 'issues'    as Tab, label: 'Issues',    Icon: AlertTriangle,   badge: deptIssues.length },
    { id: 'tasks'     as Tab, label: 'Tasks',     Icon: CheckSquare,     badge: deptTasks.length },
    { id: 'analytics' as Tab, label: 'Insights',  Icon: BarChart2,       badge: 0 },
    { id: 'guide'     as Tab, label: 'Guide',     Icon: BookOpen,        badge: 0 },
  ];

  function handleLogout() { logout(); router.push('/portal/login'); }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">Nurse Portal</p>
              <p className="text-xs text-gray-400 leading-tight">
                {nurse?.firstName} {nurse?.lastName}
                {nurse?.orgUnit ? ` · ${nurse.orgUnit.name}` : ''}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

          {/* ── HOME TAB ── */}
          {tab === 'home' && (
            <>
              {/* Greeting */}
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Good morning, {nurse?.firstName} 👋
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {nurse?.orgUnit?.name ?? 'Your hospital'} · Here&apos;s your overview
                </p>
              </div>

              {/* Profile card — hospital / department / manager */}
              {profile && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Your Profile</p>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {profile.hospital && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Hospital</p>
                        <p className="text-sm font-medium text-gray-800 truncate">{profile.hospital.name}</p>
                      </div>
                    )}
                    {(profile.department ?? profile.orgUnit) && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Department</p>
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {profile.department?.name ?? profile.orgUnit?.name}
                        </p>
                      </div>
                    )}
                    {profile.jobTitle && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Job Title</p>
                        <p className="text-sm font-medium text-gray-800 truncate">{profile.jobTitle}</p>
                      </div>
                    )}
                    {profile.manager && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Manager</p>
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {profile.manager.firstName} {profile.manager.lastName}
                        </p>
                        {profile.manager.jobTitle && (
                          <p className="text-xs text-gray-400 truncate">{profile.manager.jobTitle}</p>
                        )}
                      </div>
                    )}
                    {profile.employeeId && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Employee ID</p>
                        <p className="text-sm font-medium text-gray-800">{profile.employeeId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setTab('home')}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{activeSurveys.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Surveys</p>
                </button>
                <button onClick={() => setTab('updates')}
                  className={`rounded-xl border p-3 text-center relative ${unreadCount + pendingAckCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
                  <p className={`text-2xl font-bold ${unreadCount + pendingAckCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {unreadCount + pendingAckCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Updates</p>
                </button>
                <button onClick={() => setTab('issues')}
                  className={`rounded-xl border p-3 text-center ${deptIssues.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                  <p className={`text-2xl font-bold ${deptIssues.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {deptIssues.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Issues</p>
                </button>
              </div>

              {/* Critical unacked banner */}
              {criticalUnacked.length > 0 && (
                <button onClick={() => setTab('updates')}
                  className="w-full bg-red-50 border border-red-300 rounded-xl p-3 flex items-center gap-3 text-left">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800">
                      {criticalUnacked.length} critical announcement{criticalUnacked.length > 1 ? 's' : ''} need acknowledgement
                    </p>
                    <p className="text-xs text-red-500 mt-0.5">Tap to view →</p>
                  </div>
                </button>
              )}

              {/* Anonymous reminder */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  <span className="font-semibold">All survey responses are anonymous.</span>{' '}
                  Your name is never stored with your answers.
                </p>
              </div>

              {/* Available Surveys */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-5 h-5 text-blue-500" />
                  <h2 className="text-base font-bold text-gray-900">Available Surveys</h2>
                  {activeSurveys.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                      {activeSurveys.length} open
                    </span>
                  )}
                </div>
                {surveysLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-16 animate-pulse" />
                    ))}
                  </div>
                ) : activeSurveys.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
                    <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium text-sm">No active surveys right now</p>
                    <p className="text-gray-400 text-xs mt-1">Check back later.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeSurveys.map((survey: any) => (
                      <Link key={survey.id} href={`/portal/survey/${survey.id}`}
                        className="flex items-center justify-between bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-4 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                            {survey.isAnonymous && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Anonymous</span>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors truncate">
                            {survey.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {survey.questions?.length ?? '—'} questions
                            {survey.closesAt ? ` · Closes ${formatDate(survey.closesAt)}` : ''}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 ml-3 transition-colors" />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Speak Up */}
              <SpeakUpSection />
            </>
          )}

          {/* ── UPDATES TAB ── */}
          {tab === 'updates' && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base font-bold text-gray-900">Announcements</h2>
                {unreadCount > 0 && (
                  <span className="text-xs bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>
                )}
                {pendingAckCount > 0 && (
                  <span className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">{pendingAckCount} ack needed</span>
                )}
              </div>
              {feedLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-16 animate-pulse" />)}
                </div>
              ) : feed.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm">
                  <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">No announcements yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feed.map((ann) => (
                    <AnnouncementCard key={ann.id} ann={ann}
                      onMarkRead={(id) => markRead.mutate(id)}
                      onAcknowledge={(id) => acknowledge.mutate(id)} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── ISSUES TAB ── */}
          {tab === 'issues' && (
            <section>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-base font-bold text-gray-900">Department Issues</h2>
                {deptIssues.length > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">{deptIssues.length} open</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Issues raised from survey feedback — your responses help drive these improvements.
              </p>
              {deptIssues.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">No open issues in your department</p>
                  <p className="text-gray-400 text-xs mt-1">Great news — keep the feedback coming.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deptIssues.map((issue: any) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── TASKS TAB ── */}
          {tab === 'tasks' && (
            <section>
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base font-bold text-gray-900">Department Tasks</h2>
                {deptTasks.length > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">{deptTasks.length} active</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Action items being worked through based on survey insights.
              </p>
              {deptTasks.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">No active tasks right now</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deptTasks.map((task: any) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── ANALYTICS TAB ── */}
          {tab === 'analytics' && (
            <AnalyticsTab
              myOrgUnit={nurse?.orgUnit ?? null}
              heatmap={heatmap}
              lowUnits={lowUnits}
              trends={trends}
              loading={heatmapLoading || lowUnitsLoading || trendsLoading}
            />
          )}

          {/* ── GUIDE TAB ── */}
          {tab === 'guide' && (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-1">Nurse Guide</h2>
                <p className="text-xs text-gray-400">Step-by-step help for every portal feature.</p>
              </div>
              <Link href="/portal/guide"
                className="flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base">Open Full Guide</p>
                  <p className="text-blue-200 text-sm mt-0.5">Surveys, Announcements, Issues, Tasks, Speak Up & Privacy</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />
              </Link>
              {[
                { icon: ClipboardList, color: 'bg-blue-500',   title: 'Completing a Survey',           desc: 'Find, answer, and submit surveys anonymously' },
                { icon: Megaphone,     color: 'bg-indigo-500', title: 'Announcements & Acknowledgements', desc: 'Read and acknowledge hospital notices' },
                { icon: AlertTriangle, color: 'bg-orange-500', title: 'Department Issues',              desc: 'See what problems leadership is working on' },
                { icon: CheckSquare,   color: 'bg-teal-500',   title: 'Department Tasks',               desc: 'Track action items from survey insights' },
                { icon: MessageCircle, color: 'bg-green-600',  title: 'Using Speak Up',                 desc: 'Submit anonymous or confidential concerns' },
                { icon: ShieldCheck,   color: 'bg-purple-600', title: 'Your Privacy',                   desc: 'What is and isn\'t stored about you' },
              ].map(({ icon: Icon, color, title, desc }) => (
                <Link key={title} href="/portal/guide"
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* ── Bottom navigation ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 safe-area-pb">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(({ id, label, Icon, badge }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => id === 'guide' ? setTab('guide') : setTab(id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 relative transition-colors ${
                  active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-tight ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
