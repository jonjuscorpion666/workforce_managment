'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import {
  AlertTriangle, CheckSquare, ClipboardList, ArrowUpCircle,
  ShieldCheck, Clock, Users, MessageCircle,
  CheckCircle2, Zap, BarChart2, Eye, UserCircle2,
  Stethoscope, Heart, Star, Megaphone, Building2,
  ChevronRight, Activity, Pencil, Trash2, Plus,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Shared components ────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, iconBg, href }: {
  label: string; value: number | string; icon: any; iconBg: string; href?: string;
}) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-gray-200 transition-all duration-200">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value ?? '—'}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function PanelCard({ title, badge, icon: Icon, action, children }: {
  title: string; badge?: number; icon?: any; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
          {badge != null && badge > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{badge}</span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function QuickAccessCard({ href, icon: Icon, iconBg, title, subtitle }: {
  href: string; icon: any; iconBg: string; title: string; subtitle: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm group-hover:text-brand-600 transition-colors">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </Link>
  );
}

function AllClearState() {
  return (
    <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      All clear
    </div>
  );
}

// ── Shared greeting ──────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  const text  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const emoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙';
  return `${text}`;
}

function getGreetingEmoji() {
  const hour = new Date().getHours();
  return hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙';
}

// ── Announcements panel (SVP / CNO) ──────────────────────────────────────────

const PRIORITY_BAR_DASH: Record<string, string> = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-orange-400', MEDIUM: 'bg-blue-400', LOW: 'bg-gray-300',
};
const PRIORITY_BADGE_DASH: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-blue-100 text-blue-700', LOW: 'bg-gray-100 text-gray-500',
};

function AnnouncementsPanel({ userId, showAll = false }: { userId: string; showAll?: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const { data: announcements = [], isLoading } = useQuery<any[]>({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then((r) => r.data),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setConfirmArchive(null);
      toast.success('Announcement archived');
    },
    onError: () => toast.error('Failed to archive'),
  });

  const displayed = showAll ? announcements : announcements.slice(0, 4);

  return (
    <PanelCard
      title="Announcements"
      icon={Megaphone}
      action={
        <Link href="/announcements/new"
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="py-3 text-center">
          <p className="text-sm text-gray-400">No announcements yet</p>
          <Link href="/announcements/new" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
            <Plus className="w-3 h-3" /> Create one
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {displayed.map((a: any) => {
            const canManage = a.createdById === userId;
            return (
              <li key={a.id} className="group">
                {confirmArchive === a.id ? (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-700 flex-1">Archive this announcement?</p>
                    <button
                      onClick={() => archiveMutation.mutate(a.id)}
                      disabled={archiveMutation.isPending}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium hover:bg-red-600 disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <button onClick={() => setConfirmArchive(null)} className="text-xs text-gray-500 hover:text-gray-700 px-1">
                      No
                    </button>
                  </div>
                ) : (
                  <div className={`relative overflow-hidden rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${PRIORITY_BAR_DASH[a.priority] ?? 'bg-gray-300'}`} />
                    <div className="pl-3 pr-3 py-2.5 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <Link href={`/announcements/${a.id}`} className="block">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE_DASH[a.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                              {a.priority}
                            </span>
                            {a.status !== 'PUBLISHED' && (
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                                {a.status}
                              </span>
                            )}
                            {a.isPinned && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Pinned</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-600 transition-colors">{a.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.publishedAt ?? a.createdAt)}</p>
                        </Link>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/announcements/${a.id}`}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => setConfirmArchive(a.id)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                            title="Archive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {!showAll && announcements.length > 4 && (
            <li>
              <Link href="/announcements" className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                View all {announcements.length} announcements <ChevronRight className="w-3 h-3" />
              </Link>
            </li>
          )}
        </ul>
      )}
    </PanelCard>
  );
}

// ── SVP / Super Admin view ──────────────────────────────────────────────────

function SVPView({ user }: { user: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });
  const { data: stuck } = useQuery({
    queryKey: ['dashboard-stuck'],
    queryFn: () => api.get('/dashboard/stuck').then((r) => r.data),
  });
  const { data: pendingApprovals = [] } = useQuery<any[]>({
    queryKey: ['surveys', 'pending'],
    queryFn: () => api.get('/surveys/pending-approvals').then((r) => r.data),
  });

  if (isLoading) return (
    <div className="space-y-7">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-28 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 h-48 animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 h-48 animate-pulse" />
      </div>
    </div>
  );
  const m = data?.metrics;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.firstName} {getGreetingEmoji()}</h1>
        <p className="text-gray-500 mt-1">Here's what needs your attention across Franciscan Health.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Open Issues"       value={m?.openIssues ?? 0}      icon={AlertTriangle}  iconBg="bg-red-50 text-red-500"    href="/issues" />
        <MetricCard label="Surveys"           value={m?.activeSurveys ?? 0}   icon={ClipboardList}  iconBg="bg-blue-50 text-blue-500"   href="/surveys" />
        <MetricCard label="Overdue"           value={m?.overdueTasks ?? 0}    icon={Clock}          iconBg="bg-orange-50 text-orange-500" href="/tasks" />
        <MetricCard label="Approvals"         value={pendingApprovals.length} icon={ShieldCheck}    iconBg="bg-amber-50 text-amber-500"  href="/surveys/approvals" />
      </div>

      {/* Two-column panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Overdue tasks — wider */}
        <div className="lg:col-span-2">
          <PanelCard
            title="Overdue Tasks"
            badge={stuck?.overdueTasks?.length}
            icon={Clock}
            action={<Link href="/tasks" className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></Link>}
          >
            {stuck?.overdueTasks?.length === 0 ? <AllClearState /> : (
              <ul className="space-y-3">
                {stuck?.overdueTasks?.slice(0, 5).map((task: any) => (
                  <li key={task.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${task.priority === 'HIGH' ? 'bg-red-100' : task.priority === 'MEDIUM' ? 'bg-orange-100' : 'bg-amber-100'}`}>
                      <Clock className={`w-3 h-3 ${task.priority === 'HIGH' ? 'text-red-500' : task.priority === 'MEDIUM' ? 'text-orange-500' : 'text-amber-500'}`} />
                    </div>
                    <span className="text-gray-700 truncate">{task.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <PanelCard title="Blocked Issues" icon={AlertTriangle}>
            {stuck?.blockedIssues?.length === 0 || !stuck?.blockedIssues ? <AllClearState /> : (
              <ul className="space-y-2">
                {stuck.blockedIssues.slice(0, 3).map((issue: any) => (
                  <li key={issue.id} className="text-sm text-gray-700 truncate flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${issue.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-400'}`} />
                    {issue.title}
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>

          <AnnouncementsPanel userId={user?.id ?? ''} />

          {pendingApprovals.length > 0 && (
            <PanelCard title="Pending Approval" badge={pendingApprovals.length} icon={ShieldCheck}
              action={<Link href="/surveys/approvals" className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-0.5">Review <ChevronRight className="w-3 h-3" /></Link>}
            >
              <ul className="space-y-2">
                {pendingApprovals.slice(0, 2).map((s: any) => (
                  <li key={s.id} className="text-sm text-gray-700 truncate">{s.title}</li>
                ))}
              </ul>
            </PanelCard>
          )}
        </div>
      </div>

      {/* Quick access */}
      <div>
        <p className="section-label mb-3">Quick Access</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAccessCard href="/tasks"            icon={CheckSquare}  iconBg="bg-brand-50 text-brand-600"   title="My Tasks"        subtitle="View your to-dos" />
          <QuickAccessCard href="/speak-up"         icon={MessageCircle} iconBg="bg-green-50 text-green-600"  title="Speak Up"        subtitle="Submit feedback" />
          <QuickAccessCard href="/analytics/svp"    icon={BarChart2}    iconBg="bg-purple-50 text-purple-600" title="Analytics"       subtitle="View reports" />
          <QuickAccessCard href="/surveys/approvals" icon={ShieldCheck}  iconBg="bg-amber-50 text-amber-600"  title="Approvals"       subtitle="Review surveys" />
        </div>
      </div>
    </div>
  );
}

// ── CNO view ──────────────────────────────────────────────────────────────────

function CNOView({ user }: { user: any }) {
  const { data: surveys = [], isLoading } = useQuery<any[]>({
    queryKey: ['surveys'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });
  const { data: profile } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data),
  });
  if (isLoading) return (
    <div className="space-y-7">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-28 animate-pulse" />)}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 h-48 animate-pulse" />
    </div>
  );

  const draft    = surveys.filter((s) => s.status === 'DRAFT');
  const pending  = surveys.filter((s) => s.approvalStatus === 'PENDING');
  const active   = surveys.filter((s) => s.status === 'ACTIVE');
  const rejected = surveys.filter((s) => s.approvalStatus === 'REJECTED');

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.firstName} {getGreetingEmoji()}</h1>
        <p className="text-gray-500 mt-1">{profile?.hospital?.name ?? user?.orgUnit?.name ?? 'Your hospital'} — nurse engagement overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Draft Surveys"    value={draft.length}    icon={ClipboardList}  iconBg="bg-gray-50 text-gray-500"    href="/surveys" />
        <MetricCard label="Pending Approval" value={pending.length}  icon={Clock}          iconBg="bg-amber-50 text-amber-500"  href="/surveys" />
        <MetricCard label="Active Surveys"   value={active.length}   icon={Zap}            iconBg="bg-green-50 text-green-500"  href="/surveys" />
        <MetricCard label="Need Revision"    value={rejected.length} icon={AlertTriangle}  iconBg="bg-red-50 text-red-500"      href="/surveys" />
      </div>

      {rejected.length > 0 && (
        <PanelCard title={`Surveys Needing Revision (${rejected.length})`} icon={AlertTriangle}>
          <ul className="space-y-3">
            {rejected.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                  {s.rejectionReason && <p className="text-xs text-red-500 mt-0.5 truncate">↩ {s.rejectionReason}</p>}
                </div>
                <Link href={`/surveys/${s.id}/edit`} className="flex-shrink-0 ml-3 text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 font-medium">Edit</Link>
              </li>
            ))}
          </ul>
        </PanelCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <PanelCard title="Active Surveys" icon={Zap} action={<Link href="/surveys" className="text-xs font-medium text-brand-600 flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></Link>}>
            {active.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-gray-400 text-sm mb-3">No active surveys yet</p>
                <Link href="/surveys/new" className="btn-primary text-sm">Create first pulse</Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {active.slice(0, 5).map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                      <p className="text-xs text-gray-400">{s.type} · {s.questions?.length ?? 0} questions</p>
                    </div>
                    <span className="flex-shrink-0 ml-3 text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-medium">ACTIVE</span>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        </div>
        <div>
          <AnnouncementsPanel userId={user?.id ?? ''} />
        </div>
      </div>

      <div>
        <p className="section-label mb-3">Quick Access</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAccessCard href="/surveys/new"    icon={ClipboardList}  iconBg="bg-brand-50 text-brand-600"   title="New Survey"     subtitle="Create pulse survey" />
          <QuickAccessCard href="/surveys"        icon={Eye}            iconBg="bg-indigo-50 text-indigo-600" title="My Surveys"     subtitle="View & manage" />
          <QuickAccessCard href="/issues"         icon={AlertTriangle}  iconBg="bg-red-50 text-red-500"       title="Issues"         subtitle="Track open items" />
          <QuickAccessCard href="/analytics/cno"  icon={BarChart2}      iconBg="bg-purple-50 text-purple-600" title="Analytics"      subtitle="Hospital insights" />
        </div>
      </div>
    </div>
  );
}

// ── Director view ─────────────────────────────────────────────────────────────

function DirectorView({ user }: { user: any }) {
  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data),
  });

  const deptId     = profile?.department?.id;
  const hospitalId = profile?.hospital?.id;

  const { data: issues = [], isLoading: issuesLoading } = useQuery<any[]>({
    queryKey: ['director-issues', deptId],
    queryFn: () => api.get('/issues', { params: { departmentId: deptId } }).then((r) => r.data),
    enabled: !!deptId,
  });
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ['director-tasks', deptId],
    queryFn: () => api.get('/tasks', { params: { departmentId: deptId } }).then((r) => r.data),
    enabled: !!deptId,
  });
  const { data: surveys = [] } = useQuery<any[]>({
    queryKey: ['surveys'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });
  const { data: heatmap } = useQuery<any>({
    queryKey: ['director-heatmap', deptId],
    queryFn: () => api.get('/analytics/heatmap', { params: { departmentId: deptId } }).then((r) => r.data),
    enabled: !!deptId,
    staleTime: 5 * 60_000,
  });
  const { data: lowUnits } = useQuery<any>({
    queryKey: ['director-low-units', deptId],
    queryFn: () => api.get('/analytics/low-units').then((r) => r.data),
    enabled: !!deptId,
    staleTime: 5 * 60_000,
  });
  const { data: trendsData } = useQuery<any>({
    queryKey: ['director-trends', deptId],
    queryFn: () => api.get('/analytics/trends', { params: { departmentId: deptId } }).then((r) => r.data),
    enabled: !!deptId,
    staleTime: 5 * 60_000,
  });
  const { data: participation = [] } = useQuery<any[]>({
    queryKey: ['director-participation', deptId],
    queryFn: () => api.get('/analytics/participation', { params: { departmentId: deptId } }).then((r) => r.data),
    enabled: !!deptId,
    staleTime: 5 * 60_000,
  });

  if (profileLoading) return <p className="text-gray-400 text-sm animate-pulse">Loading…</p>;

  const activeSurveys = surveys.filter((s) => s.status === 'ACTIVE');
  const openIssues    = issues.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status));
  const overdueTasks  = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE');

  const deptUnits: any[] = heatmap?.units ?? [];
  const allDimKeys = heatmap?.dimensions ?? [];
  const deptEngagementScore = deptUnits.length > 0
    ? Math.round(deptUnits.reduce((sum: number, u: any) => {
        const vals = Object.values(u.scores ?? {}).filter((v): v is number => typeof v === 'number');
        const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
        return sum + avg;
      }, 0) / deptUnits.length)
    : null;

  const dimInsights: { name: string; score: number }[] = allDimKeys.map((dim: string) => {
    const scores = deptUnits.map((u: any) => u.scores?.[dim]).filter((v): v is number => typeof v === 'number');
    return { name: dim, score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0 };
  }).sort((a: any, b: any) => a.score - b.score);

  const deptRanking: any[] = ((lowUnits?.units ?? []) as any[])
    .filter((u) => u.hospitalId === hospitalId)
    .sort((a, b) => b.overallFavorable - a.overallFavorable);

  const trendCycles = (trendsData?.cycles ?? []).slice(-6);
  const totalResponses = (participation as any[]).reduce((sum, r) => sum + (r.count ?? 0), 0);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.firstName} {getGreetingEmoji()}</h1>
        <p className="text-gray-500 mt-1">
          {profile?.department?.name ?? profile?.hospital?.name ?? 'Your department'} — department overview
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Surveys"  value={activeSurveys.length}   icon={Zap}           iconBg="bg-green-50 text-green-500"   href="/surveys" />
        <MetricCard label="Open Issues"     value={openIssues.length}      icon={AlertTriangle}  iconBg="bg-red-50 text-red-500"       href="/issues" />
        <MetricCard label="Overdue Tasks"   value={overdueTasks.length}    icon={Clock}          iconBg="bg-orange-50 text-orange-500" href="/tasks" />
        <MetricCard label="Dept Responses"  value={totalResponses || '—'}  icon={Users}          iconBg="bg-blue-50 text-blue-500" />
      </div>

      {(deptEngagementScore !== null || trendCycles.length > 1) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {deptEngagementScore !== null && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="section-label mb-3">Department Pulse Score</p>
              <div className="flex items-end gap-3 mb-3">
                <span className={`text-4xl font-bold ${deptEngagementScore >= 70 ? 'text-emerald-600' : deptEngagementScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {deptEngagementScore}%
                </span>
                <span className={`text-xs font-semibold mb-1.5 px-2.5 py-1 rounded-full ${deptEngagementScore >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : deptEngagementScore >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {deptEngagementScore >= 70 ? 'Healthy' : deptEngagementScore >= 50 ? 'At Risk' : 'Critical'}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${deptEngagementScore >= 70 ? 'bg-emerald-500' : deptEngagementScore >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${deptEngagementScore}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">Based on {deptUnits.length} unit{deptUnits.length !== 1 ? 's' : ''} in your department</p>
            </div>
          )}
          {trendCycles.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="section-label mb-3">Engagement Trend</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={trendCycles}>
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Line type="monotone" dataKey={(entry) => {
                    const vals = Object.values(entry.dimensions ?? {}).filter((v): v is number => typeof v === 'number');
                    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                  }} stroke="#6366f1" strokeWidth={2} dot={false} name="Engagement" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PanelCard title="Dept Surveys" icon={ClipboardList} action={<Link href="/surveys/new" className="text-xs font-medium text-brand-600 flex items-center gap-0.5">+ New <ChevronRight className="w-3 h-3" /></Link>}>
          {surveys.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-3">No surveys yet</p>
              <Link href="/surveys/new" className="btn-primary text-sm">Create first pulse</Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {surveys.slice(0, 5).map((s: any) => (
                <li key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 gap-2">
                  <span className="text-sm text-gray-700 truncate flex-1">{s.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>{s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title="Overdue Tasks" badge={overdueTasks.length} icon={Clock} action={<Link href="/tasks" className="text-xs font-medium text-brand-600 flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></Link>}>
          {tasksLoading ? <p className="text-gray-400 text-sm">Loading…</p> : overdueTasks.length === 0 ? <AllClearState /> : (
            <ul className="space-y-2">
              {overdueTasks.slice(0, 5).map((t: any) => (
                <li key={t.id} className="flex items-center gap-2 text-sm text-gray-700 truncate">
                  <Clock className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />{t.title}
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title="Open Issues" icon={AlertTriangle} action={<Link href="/issues" className="text-xs font-medium text-brand-600 flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></Link>}>
          {issuesLoading ? <p className="text-gray-400 text-sm">Loading…</p> : openIssues.length === 0 ? <AllClearState /> : (
            <ul className="space-y-2">
              {openIssues.slice(0, 5).map((i: any) => (
                <li key={i.id} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i.severity === 'CRITICAL' ? 'bg-red-500' : i.severity === 'HIGH' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                  <span className="text-sm text-gray-700 truncate flex-1">{i.title}</span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        {dimInsights.length > 0 && (
          <PanelCard title="Dimension Insights" icon={Activity}>
            <ul className="space-y-2.5">
              {dimInsights.slice(0, 6).map((d) => {
                const color = d.score >= 70 ? 'bg-emerald-500' : d.score >= 50 ? 'bg-amber-400' : 'bg-red-400';
                return (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-36 truncate">{d.name}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${d.score}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-9 text-right">{d.score}%</span>
                  </li>
                );
              })}
            </ul>
          </PanelCard>
        )}
      </div>

      <div>
        <p className="section-label mb-3">Quick Access</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAccessCard href="/surveys/new" icon={ClipboardList} iconBg="bg-brand-50 text-brand-600" title="New Pulse Survey" subtitle="Create for your dept" />
          <QuickAccessCard href="/tasks"       icon={CheckSquare}   iconBg="bg-indigo-50 text-indigo-600" title="View Tasks"    subtitle="Manage action items" />
          <QuickAccessCard href="/issues"      icon={AlertTriangle} iconBg="bg-red-50 text-red-500"       title="View Issues"  subtitle="Dept issues" />
          <QuickAccessCard href="/analytics"   icon={BarChart2}     iconBg="bg-purple-50 text-purple-600" title="Analytics"    subtitle="Dept insights" />
        </div>
      </div>
    </div>
  );
}

// ── Manager view ──────────────────────────────────────────────────────────────

function ManagerView({ user }: { user: any }) {
  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data),
  });

  const unitId = profile?.orgUnit?.id;

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ['manager-tasks', unitId],
    queryFn: () => api.get('/tasks', { params: { orgUnitId: unitId } }).then((r) => r.data),
    enabled: !!unitId,
  });
  const { data: issues = [], isLoading: issuesLoading } = useQuery<any[]>({
    queryKey: ['manager-issues', unitId],
    queryFn: () => api.get('/issues', { params: { orgUnitId: unitId } }).then((r) => r.data),
    enabled: !!unitId,
  });
  const { data: speakUpCases = [], isLoading: speakUpLoading } = useQuery<any[]>({
    queryKey: ['manager-speakup', unitId],
    queryFn: () => api.get('/speak-up/cases', { params: { orgUnitId: unitId } }).then((r) => r.data),
    enabled: !!unitId,
  });
  const { data: surveys = [] } = useQuery<any[]>({
    queryKey: ['surveys'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });
  const { data: participation = [] } = useQuery<any[]>({
    queryKey: ['manager-participation', unitId],
    queryFn: () => api.get('/analytics/participation', { params: { orgUnitId: unitId } }).then((r) => r.data),
    enabled: !!unitId,
    staleTime: 5 * 60_000,
  });

  if (profileLoading) return <p className="text-gray-400 text-sm animate-pulse">Loading…</p>;

  const activeSurveys   = surveys.filter((s: any) => s.status === 'ACTIVE');
  const recentSurveys   = surveys.filter((s: any) => s.status === 'CLOSED').slice(0, 3);
  const openIssues      = issues.filter((i: any) => !['RESOLVED', 'CLOSED'].includes(i.status));
  const openTasks       = tasks.filter((t: any) => t.status !== 'DONE');
  const inProgressTasks = tasks.filter((t: any) => t.status === 'IN_PROGRESS');
  const doneTasks       = tasks.filter((t: any) => t.status === 'DONE');
  const overdueTasks    = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE');
  const openCases       = speakUpCases.filter((c: any) => !['RESOLVED'].includes(c.status));
  const totalResponses  = (participation as any[]).reduce((sum, r) => sum + (r.count ?? 0), 0);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.firstName} {getGreetingEmoji()}</h1>
        <p className="text-gray-500 mt-1">{profile?.orgUnit?.name ?? 'Your unit'} — team overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Surveys"  value={activeSurveys.length} icon={ClipboardList}  iconBg="bg-blue-50 text-blue-500"    href="/surveys" />
        <MetricCard label="Open Tasks"      value={openTasks.length}     icon={CheckSquare}    iconBg="bg-indigo-50 text-indigo-500" href="/tasks" />
        <MetricCard label="Open Issues"     value={openIssues.length}    icon={AlertTriangle}  iconBg="bg-red-50 text-red-500"      href="/issues" />
        <MetricCard label="Speak-up Cases"  value={openCases.length}     icon={MessageCircle}  iconBg="bg-amber-50 text-amber-500"  href="/speak-up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PanelCard title="Team Surveys" icon={ClipboardList} action={<Link href="/surveys" className="text-xs font-medium text-brand-600 flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></Link>}>
          {activeSurveys.length === 0 && recentSurveys.length === 0 ? (
            <p className="text-gray-400 text-sm">No surveys yet</p>
          ) : (
            <ul className="space-y-2">
              {[...activeSurveys, ...recentSurveys].slice(0, 5).map((s: any) => (
                <li key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 gap-2">
                  <span className="text-sm text-gray-700 truncate flex-1">{s.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>{s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title="Action Items" icon={CheckSquare} action={<Link href="/tasks" className="text-xs font-medium text-brand-600 flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></Link>}>
          {tasksLoading ? <p className="text-gray-400 text-sm">Loading…</p> : tasks.length === 0 ? <AllClearState /> : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Open',        value: openTasks.length,       color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'In Progress', value: inProgressTasks.length, color: 'text-amber-600',  bg: 'bg-amber-50' },
                  { label: 'Done',        value: doneTasks.length,       color: 'text-emerald-600',bg: 'bg-emerald-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl px-3 py-2.5 text-center`}>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {overdueTasks.length > 0 && (
                <ul className="space-y-2">
                  {overdueTasks.slice(0, 3).map((t: any) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm text-gray-700 truncate">
                      <Clock className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />{t.title}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </PanelCard>

        <PanelCard title="Unit Issues" icon={AlertTriangle} action={<Link href="/issues" className="text-xs font-medium text-brand-600 flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></Link>}>
          {issuesLoading ? <p className="text-gray-400 text-sm">Loading…</p> : openIssues.length === 0 ? <AllClearState /> : (
            <ul className="space-y-2">
              {openIssues.slice(0, 5).map((i: any) => (
                <li key={i.id} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i.severity === 'CRITICAL' ? 'bg-red-500' : i.severity === 'HIGH' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                  <span className="text-sm text-gray-700 truncate flex-1">{i.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{i.status?.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title="Speak-up Cases" icon={MessageCircle} action={<Link href="/speak-up" className="text-xs font-medium text-brand-600 flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></Link>}>
          {speakUpLoading ? <p className="text-gray-400 text-sm">Loading…</p> : speakUpCases.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No cases from your unit
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Submitter identities are never shown</p>
              <ul className="space-y-2">
                {speakUpCases.slice(0, 4).map((c: any) => (
                  <li key={c.id} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.urgency === 'URGENT' ? 'bg-red-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-700 truncate flex-1">{c.category} — {c.description?.slice(0, 40) ?? ''}…</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${c.status === 'NEW' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'}`}>{c.status}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </PanelCard>
      </div>

      <div>
        <p className="section-label mb-3">Quick Access</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAccessCard href="/tasks"       icon={CheckSquare}   iconBg="bg-brand-50 text-brand-600"   title="Manage Tasks"   subtitle="Your to-dos" />
          <QuickAccessCard href="/issues/new"  icon={AlertTriangle} iconBg="bg-red-50 text-red-500"       title="Escalate Issue" subtitle="Flag a concern" />
          <QuickAccessCard href="/speak-up"    icon={MessageCircle} iconBg="bg-green-50 text-green-600"   title="Speak Up"       subtitle="Anonymous feedback" />
          <QuickAccessCard href="/analytics"   icon={BarChart2}     iconBg="bg-purple-50 text-purple-600" title="Analytics"      subtitle="Unit insights" />
        </div>
      </div>
    </div>
  );
}

// ── Staff / Nurse view (catchy) ───────────────────────────────────────────────

function StaffView({ user }: { user: any }) {
  const greeting = getGreeting();
  const greetingEmoji = getGreetingEmoji();

  return (
    <div className="space-y-7">
      {/* Hero greeting */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-500 rounded-2xl p-7 text-white shadow-lg">
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 right-12 w-20 h-20 bg-white/10 rounded-full" />
        <div className="absolute top-4 right-24 w-10 h-10 bg-white/10 rounded-full" />
        <div className="relative">
          <p className="text-white/80 text-sm font-medium mb-1 flex items-center gap-2">
            <Heart className="w-3.5 h-3.5" fill="currentColor" /> Franciscan Health Workforce
          </p>
          <h1 className="text-2xl font-bold mb-1">{greeting}, {user?.firstName}! {greetingEmoji}</h1>
          <p className="text-blue-100 text-sm">Your voice matters — thank you for the care you provide every day.</p>
          <div className="flex gap-3 mt-5">
            <Link href="/portal" className="flex items-center gap-2 bg-white text-brand-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
              <ClipboardList className="w-4 h-4" /> Take a Survey
            </Link>
            <Link href="/speak-up" className="flex items-center gap-2 bg-white/15 backdrop-blur text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/25 transition-colors border border-white/20">
              <MessageCircle className="w-4 h-4" /> Speak Up
            </Link>
          </div>
        </div>
      </div>

      {/* Quick access */}
      <div>
        <p className="section-label mb-3">Quick Access</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAccessCard href="/portal"    icon={ClipboardList}  iconBg="bg-brand-50 text-brand-600"   title="My Surveys"     subtitle="Active surveys" />
          <QuickAccessCard href="/speak-up"  icon={MessageCircle}  iconBg="bg-green-50 text-green-600"   title="Speak Up"       subtitle="Submit feedback" />
          <QuickAccessCard href="/portal"    icon={BarChart2}      iconBg="bg-purple-50 text-purple-600" title="My Impact"      subtitle="View your responses" />
          <QuickAccessCard href="/portal"    icon={Star}           iconBg="bg-amber-50 text-amber-500"   title="Recognition"    subtitle="Shout-outs & praise" />
        </div>
      </div>

      {/* How it works + privacy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="font-semibold text-gray-900 text-sm">Your privacy is guaranteed</h2>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 mb-3">
            <p className="text-sm text-emerald-800 font-medium">All responses are completely anonymous</p>
            <p className="text-xs text-emerald-700 mt-1">Your name and employee ID are never linked to your answers.</p>
          </div>
          <ul className="space-y-2">
            {[
              'Leadership sees aggregated trends — never individual responses',
              'Speak Up submissions are not traceable to you',
              'Your identity is protected by Franciscan Health policy',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-brand-600" />
            </div>
            <h2 className="font-semibold text-gray-900 text-sm">How your feedback drives change</h2>
          </div>
          <ol className="space-y-3">
            {[
              { step: '1', text: 'You complete a survey anonymously', color: 'bg-brand-100 text-brand-700' },
              { step: '2', text: 'Scores are aggregated by dimension (Workload, Recognition…)', color: 'bg-indigo-100 text-indigo-700' },
              { step: '3', text: 'Low areas surface as Issues for leadership to act on', color: 'bg-orange-100 text-orange-700' },
              { step: '4', text: 'Action plans are tracked — visible to you on this platform', color: 'bg-emerald-100 text-emerald-700' },
            ].map(({ step, text, color }) => (
              <li key={step} className="flex items-center gap-3 text-sm text-gray-700">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>{step}</span>
                {text}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  if (hasRole('SVP') || hasRole('SUPER_ADMIN')) return <SVPView user={user} />;
  if (hasRole('CNO'))      return <CNOView user={user} />;
  if (hasRole('DIRECTOR')) return <DirectorView user={user} />;
  if (hasRole('MANAGER'))  return <ManagerView user={user} />;
  return <StaffView user={user} />;
}
