'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import {
  AlertTriangle, CheckSquare, ClipboardList, ArrowUpCircle,
  ShieldCheck, Clock, TrendingUp, Users, MessageCircle,
  Building2, CheckCircle2, Zap, BarChart2, Eye, UserCircle2,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

function MetricCard({ label, value, icon: Icon, color, href }: {
  label: string; value: number | string; icon: any; color: string; href?: string;
}) {
  const inner = (
    <div className="card flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
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

  if (isLoading) return <p className="text-gray-400 text-sm">Loading...</p>;
  const m = data?.metrics;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.firstName} 👋</h1>
        <p className="text-gray-500 mt-1">System-wide overview — all Franciscan Health hospitals</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Open Issues"      value={m?.openIssues ?? 0}      icon={AlertTriangle}  color="bg-red-500"    href="/issues" />
        <MetricCard label="Active Surveys"   value={m?.activeSurveys ?? 0}   icon={ClipboardList}  color="bg-blue-500"   href="/surveys" />
        <MetricCard label="Overdue Tasks"    value={m?.overdueTasks ?? 0}    icon={CheckSquare}    color="bg-orange-500" href="/tasks" />
        <MetricCard label="Pending Approvals" value={pendingApprovals.length} icon={ShieldCheck}    color="bg-amber-500"  href="/surveys/approvals" />
      </div>

      {pendingApprovals.length > 0 && (
        <div className="card border-l-4 border-amber-400">
          <SectionHeader title="Surveys Awaiting Your Approval" action={
            <Link href="/surveys/approvals" className="text-xs text-amber-600 hover:text-amber-800 font-medium">View all →</Link>
          } />
          <div className="space-y-2">
            {pendingApprovals.slice(0, 3).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                  <p className="text-xs text-gray-400">{s.type} · {s.questions?.length ?? 0} questions</p>
                </div>
                <Link href="/surveys/approvals" className="flex-shrink-0 ml-3 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-200 font-medium">Review</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {stuck && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <SectionHeader title="Blocked Issues" action={<Link href="/issues" className="text-xs text-blue-600 font-medium">View all →</Link>} />
            {stuck.blockedIssues?.length === 0 ? (
              <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> No blocked issues</p>
            ) : (
              <ul className="space-y-2">
                {stuck.blockedIssues?.slice(0, 5).map((issue: any) => (
                  <li key={issue.id} className="flex items-center gap-2 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{issue.severity}</span>
                    <span className="truncate text-gray-700">{issue.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <SectionHeader title="Overdue Tasks" action={<Link href="/tasks" className="text-xs text-blue-600 font-medium">View all →</Link>} />
            {stuck.overdueTasks?.length === 0 ? (
              <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> No overdue tasks</p>
            ) : (
              <ul className="space-y-2">
                {stuck.overdueTasks?.slice(0, 5).map((task: any) => (
                  <li key={task.id} className="text-sm text-gray-700 truncate flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />{task.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Link href="/analytics/svp" className="btn-primary flex items-center gap-2 text-sm"><BarChart2 className="w-4 h-4" /> SVP Analytics</Link>
        <Link href="/surveys/approvals" className="btn-secondary flex items-center gap-2 text-sm"><ShieldCheck className="w-4 h-4" /> Approval Queue</Link>
        <Link href="/escalations" className="btn-secondary flex items-center gap-2 text-sm"><ArrowUpCircle className="w-4 h-4" /> Escalations</Link>
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

  if (isLoading) return <p className="text-gray-400 text-sm">Loading...</p>;

  const draft    = surveys.filter((s) => s.status === 'DRAFT');
  const pending  = surveys.filter((s) => s.approvalStatus === 'PENDING');
  const active   = surveys.filter((s) => s.status === 'ACTIVE');
  const rejected = surveys.filter((s) => s.approvalStatus === 'REJECTED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.firstName} 👋</h1>
        <p className="text-gray-500 mt-1">{profile?.hospital?.name ?? user?.orgUnit?.name ?? 'Your hospital'} — nurse engagement overview</p>
      </div>

      {/* Profile + manager card */}
      {profile && (
        <div className="card flex flex-wrap gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{profile.firstName} {profile.lastName}</p>
              <p className="text-xs text-gray-500">{profile.jobTitle ?? 'CNO'}{profile.hospital ? ` · ${profile.hospital.name}` : ''}</p>
            </div>
          </div>
          {profile.manager && (
            <div className="border-l border-gray-200 pl-6 min-w-0">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Reports to</p>
              <p className="text-sm font-semibold text-gray-800">{profile.manager.firstName} {profile.manager.lastName}</p>
              {profile.manager.jobTitle && <p className="text-xs text-gray-500">{profile.manager.jobTitle}</p>}
            </div>
          )}
          {profile.department && (
            <div className="border-l border-gray-200 pl-6 min-w-0">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Department</p>
              <p className="text-sm font-semibold text-gray-800">{profile.department.name}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Draft Surveys"   value={draft.length}   icon={ClipboardList}  color="bg-gray-500"   href="/surveys" />
        <MetricCard label="Pending Approval" value={pending.length} icon={Clock}          color="bg-amber-500"  href="/surveys" />
        <MetricCard label="Active Surveys"  value={active.length}  icon={Zap}            color="bg-green-500"  href="/surveys" />
        <MetricCard label="Need Revision"   value={rejected.length} icon={AlertTriangle}  color="bg-red-500"    href="/surveys" />
      </div>

      {rejected.length > 0 && (
        <div className="card border-l-4 border-red-400">
          <SectionHeader title="Surveys Needing Revision" />
          <div className="space-y-2">
            {rejected.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                  {s.rejectionReason && <p className="text-xs text-red-500 mt-0.5 truncate">↩ {s.rejectionReason}</p>}
                </div>
                <Link href={`/surveys/${s.id}/edit`} className="flex-shrink-0 ml-3 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg hover:bg-red-200 font-medium">Edit</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div className="card">
          <SectionHeader title="Active Surveys" action={<Link href="/surveys" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          <div className="space-y-2">
            {active.slice(0, 4).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                  <p className="text-xs text-gray-400">{s.type} · {s.questions?.length ?? 0} questions</p>
                </div>
                <span className="flex-shrink-0 ml-3 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">ACTIVE</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Link href="/surveys/new" className="btn-primary flex items-center gap-2 text-sm"><ClipboardList className="w-4 h-4" /> New Survey</Link>
        <Link href="/surveys" className="btn-secondary flex items-center gap-2 text-sm"><Eye className="w-4 h-4" /> My Surveys</Link>
        <Link href="/issues" className="btn-secondary flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4" /> Issues</Link>
        <Link href="/analytics/cno" className="btn-secondary flex items-center gap-2 text-sm"><BarChart2 className="w-4 h-4" /> View Full Analytics</Link>
      </div>
    </div>
  );
}

// ── Director view ─────────────────────────────────────────────────────────────

function DirectorView({ user }: { user: any }) {
  // 1. Fetch full profile to get departmentId (primary scope) + hospitalId
  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data),
  });

  const deptId     = profile?.department?.id;
  const hospitalId = profile?.hospital?.id;

  // 2. All queries scoped to Director's department
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
  const { data: surveys = [], isLoading: surveysLoading } = useQuery<any[]>({
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
  // Engagement trend scoped to Director's department
  const { data: trendsData } = useQuery<any>({
    queryKey: ['director-trends', deptId],
    queryFn: () => api.get('/analytics/trends', { params: { departmentId: deptId } }).then((r) => r.data),
    enabled: !!deptId,
    staleTime: 5 * 60_000,
  });
  // Response counts scoped to Director's department
  const { data: participation = [] } = useQuery<any[]>({
    queryKey: ['director-participation', deptId],
    queryFn: () => api.get('/analytics/participation', { params: { departmentId: deptId } }).then((r) => r.data),
    enabled: !!deptId,
    staleTime: 5 * 60_000,
  });

  if (profileLoading || surveysLoading) return <p className="text-gray-400 text-sm">Loading...</p>;

  const activeSurveys = surveys.filter((s) => s.status === 'ACTIVE');
  const openIssues    = issues.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status));
  const overdueTasks  = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE');

  // Department pulse score: average across all units in the dept from heatmap
  const deptUnits: any[] = heatmap?.units ?? [];
  const allDimKeys = heatmap?.dimensions ?? [];
  const deptEngagementScore = deptUnits.length > 0
    ? Math.round(
        deptUnits.reduce((sum: number, u: any) => {
          const vals = Object.values(u.scores ?? {}).filter((v): v is number => typeof v === 'number');
          const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
          return sum + avg;
        }, 0) / deptUnits.length
      )
    : null;

  // Dimension insights: average per dimension across dept units
  const dimInsights: { name: string; score: number }[] = allDimKeys.map((dim: string) => {
    const scores = deptUnits
      .map((u: any) => u.scores?.[dim])
      .filter((v): v is number => typeof v === 'number');
    return { name: dim, score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0 };
  }).sort((a: any, b: any) => a.score - b.score);

  const deptRanking: any[] = ((lowUnits?.units ?? []) as any[])
    .filter((u) => u.hospitalId === hospitalId)
    .sort((a, b) => b.overallFavorable - a.overallFavorable);

  // Trend chart data
  const trendCycles = (trendsData?.cycles ?? []).slice(-6);

  // Total responses from this department
  const totalResponses = (participation as any[]).reduce((sum, r) => sum + (r.count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.firstName} 👋</h1>
        <p className="text-gray-500 mt-1">
          {profile?.department?.name ?? profile?.hospital?.name ?? user?.orgUnit?.name ?? 'Your department'} — department overview
        </p>
      </div>

      {/* Director profile card */}
      {profile && (
        <div className="card flex flex-wrap gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{profile.firstName} {profile.lastName}</p>
              <p className="text-xs text-gray-500">{profile.jobTitle ?? 'Director'}{profile.hospital ? ` · ${profile.hospital.name}` : ''}</p>
            </div>
          </div>
          {profile.hospital && (
            <div className="border-l border-gray-200 pl-6 min-w-0">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Hospital</p>
              <p className="text-sm font-semibold text-gray-800">{profile.hospital.name}</p>
            </div>
          )}
          {profile.department && (
            <div className="border-l border-gray-200 pl-6 min-w-0">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Department</p>
              <p className="text-sm font-semibold text-gray-800">{profile.department.name}</p>
            </div>
          )}
          {profile.manager && (
            <div className="border-l border-gray-200 pl-6 min-w-0">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Reports to</p>
              <p className="text-sm font-semibold text-gray-800">{profile.manager.firstName} {profile.manager.lastName}</p>
              {profile.manager.jobTitle && <p className="text-xs text-gray-500">{profile.manager.jobTitle}</p>}
            </div>
          )}
          {profile.employeeId && (
            <div className="border-l border-gray-200 pl-6 min-w-0">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Employee ID</p>
              <p className="text-sm font-semibold text-gray-800">{profile.employeeId}</p>
            </div>
          )}
        </div>
      )}

      {/* Metrics scoped to hospital */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Surveys"  value={activeSurveys.length}   icon={Zap}          color="bg-green-500"  href="/surveys" />
        <MetricCard label="Open Issues"     value={openIssues.length}      icon={AlertTriangle} color="bg-red-500"    href="/issues" />
        <MetricCard label="Overdue Tasks"   value={overdueTasks.length}    icon={Clock}         color="bg-orange-500" href="/tasks" />
        <MetricCard label="Dept Responses"  value={totalResponses || '—'}  icon={Users}         color="bg-blue-500" />
      </div>

      {/* Department pulse score + trend */}
      {(deptEngagementScore !== null || trendCycles.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {deptEngagementScore !== null && (
            <div className="card">
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Department Pulse Score</p>
              <div className="flex items-end gap-3 mb-3">
                <span className={`text-4xl font-bold ${deptEngagementScore >= 70 ? 'text-emerald-600' : deptEngagementScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {deptEngagementScore}%
                </span>
                <span className={`text-sm font-medium mb-1 px-2 py-0.5 rounded-full ${deptEngagementScore >= 70 ? 'bg-emerald-100 text-emerald-700' : deptEngagementScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {deptEngagementScore >= 70 ? 'Healthy' : deptEngagementScore >= 50 ? 'At Risk' : 'Critical'}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full">
                <div
                  className={`h-full rounded-full ${deptEngagementScore >= 70 ? 'bg-emerald-500' : deptEngagementScore >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${deptEngagementScore}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Based on {deptUnits.length} unit(s) in your department</p>
            </div>
          )}
          {trendCycles.length > 1 && (
            <div className="card">
              <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">Engagement Trend</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={trendCycles}>
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Line
                    type="monotone"
                    dataKey={(entry) => {
                      const vals = Object.values(entry.dimensions ?? {}).filter((v): v is number => typeof v === 'number');
                      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                    }}
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    name="Engagement"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Surveys with approval status + response counts */}
        <div className="card">
          <SectionHeader title="Hospital Surveys" action={<Link href="/surveys/new" className="text-xs text-blue-600 font-medium">+ New →</Link>} />
          {surveys.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">No surveys yet</p>
              <Link href="/surveys/new" className="btn-primary text-sm">Create first pulse</Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {surveys.slice(0, 5).map((s: any) => {
                const responses = (participation as any[]).filter((p) => p.surveyId === s.id).reduce((sum, p) => sum + (p.count ?? 0), 0);
                return (
                  <li key={s.id} className="py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-700 truncate flex-1">{s.title}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : s.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>{s.status}</span>
                        {s.approvalStatus && s.approvalStatus !== 'APPROVED' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.approvalStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' : s.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : ''}`}>{s.approvalStatus}</span>
                        )}
                      </div>
                    </div>
                    {responses > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{responses} response{responses !== 1 ? 's' : ''} from your department</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Open issues */}
        <div className="card">
          <SectionHeader title="Open Issues" action={<Link href="/issues" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          {issuesLoading ? <p className="text-gray-400 text-sm">Loading…</p> : openIssues.length === 0 ? (
            <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> No open issues</p>
          ) : (
            <ul className="space-y-2">
              {openIssues.slice(0, 5).map((i: any) => (
                <li key={i.id} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i.severity === 'CRITICAL' ? 'bg-red-500' : i.severity === 'HIGH' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                  <span className="text-sm text-gray-700 truncate flex-1">{i.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{i.status?.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overdue tasks */}
        <div className="card">
          <SectionHeader title="Overdue Tasks" action={<Link href="/tasks" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          {tasksLoading ? <p className="text-gray-400 text-sm">Loading…</p> : overdueTasks.length === 0 ? (
            <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> All caught up</p>
          ) : (
            <ul className="space-y-2">
              {overdueTasks.slice(0, 5).map((t: any) => (
                <li key={t.id} className="text-sm text-gray-700 truncate flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />{t.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dimension insights */}
        {dimInsights.length > 0 && (
          <div className="card">
            <SectionHeader title="Dimension Insights" />
            <ul className="space-y-2">
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
            {dimInsights.length > 0 && dimInsights[0].score < 70 && (
              <p className="text-xs text-orange-600 mt-3 font-medium">
                ⚠ Lowest: {dimInsights[0].name} ({dimInsights[0].score}%)
              </p>
            )}
          </div>
        )}

        {/* Department engagement ranking */}
        {deptRanking.length > 0 && (
          <div className="card lg:col-span-2">
            <SectionHeader title="Dept Engagement Ranking" />
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {deptRanking.slice(0, 8).map((u: any, i: number) => {
                const score = u.overallFavorable;
                const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-400';
                return (
                  <li key={u.orgUnitId} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                    <span className="text-sm text-gray-700 truncate flex-1">{u.orgUnitName}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-9 text-right">{score}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/surveys/new" className="btn-primary flex items-center gap-2 text-sm"><ClipboardList className="w-4 h-4" /> New Pulse Survey</Link>
        <Link href="/tasks" className="btn-secondary flex items-center gap-2 text-sm"><CheckSquare className="w-4 h-4" /> View Tasks</Link>
        <Link href="/issues" className="btn-secondary flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4" /> View Issues</Link>
      </div>
    </div>
  );
}

// ── Manager view ──────────────────────────────────────────────────────────────

function ManagerView({ user }: { user: any }) {
  // 1. Fetch profile to get unit scope
  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data),
  });

  const unitId = profile?.orgUnit?.id;

  // 2. All queries scoped to manager's unit
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

  if (profileLoading) return <p className="text-gray-400 text-sm">Loading...</p>;

  const activeSurveys  = surveys.filter((s: any) => s.status === 'ACTIVE');
  const recentSurveys  = surveys.filter((s: any) => s.status === 'CLOSED').slice(0, 3);
  const openIssues     = issues.filter((i: any) => !['RESOLVED', 'CLOSED'].includes(i.status));
  const openTasks      = tasks.filter((t: any) => t.status !== 'DONE');
  const inProgressTasks = tasks.filter((t: any) => t.status === 'IN_PROGRESS');
  const doneTasks      = tasks.filter((t: any) => t.status === 'DONE');
  const overdueTasks   = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE');
  const openCases      = speakUpCases.filter((c: any) => !['RESOLVED'].includes(c.status));
  const totalResponses = (participation as any[]).reduce((sum, r) => sum + (r.count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.firstName} 👋</h1>
        <p className="text-gray-500 mt-1">
          {profile?.orgUnit?.name ?? 'Your unit'} — team overview
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Surveys"  value={activeSurveys.length} icon={ClipboardList} color="bg-blue-500"    href="/surveys" />
        <MetricCard label="Open Tasks"      value={openTasks.length}     icon={CheckSquare}   color="bg-indigo-500"  href="/tasks" />
        <MetricCard label="Open Issues"     value={openIssues.length}    icon={AlertTriangle} color="bg-red-500"     href="/issues" />
        <MetricCard label="Speak-up Cases"  value={openCases.length}     icon={MessageCircle} color="bg-amber-500"   href="/speak-up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team surveys with unit response counts */}
        <div className="card">
          <SectionHeader title="Team Surveys" action={<Link href="/surveys" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          {activeSurveys.length === 0 && recentSurveys.length === 0 ? (
            <p className="text-gray-400 text-sm">No surveys yet</p>
          ) : (
            <ul className="space-y-2">
              {[...activeSurveys, ...recentSurveys].slice(0, 5).map((s: any) => {
                const unitResponses = (participation as any[])
                  .filter((p) => p.orgUnitId === unitId)
                  .reduce((sum, p) => sum + (p.count ?? 0), 0);
                return (
                  <li key={s.id} className="py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-700 truncate flex-1">{s.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{s.status}</span>
                    </div>
                    {s.status === 'ACTIVE' && totalResponses > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{totalResponses} response{totalResponses !== 1 ? 's' : ''} from your unit</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Task completion status */}
        <div className="card">
          <SectionHeader title="Action Items" action={<Link href="/tasks" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          {tasksLoading ? <p className="text-gray-400 text-sm">Loading…</p> : tasks.length === 0 ? (
            <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> No tasks for your unit</p>
          ) : (
            <>
              {/* Status breakdown */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Open',        value: openTasks.length,       color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'In Progress', value: inProgressTasks.length, color: 'text-amber-600',  bg: 'bg-amber-50' },
                  { label: 'Done',        value: doneTasks.length,       color: 'text-emerald-600',bg: 'bg-emerald-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-lg px-3 py-2 text-center`}>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
              {overdueTasks.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-orange-600 mb-1">Overdue ({overdueTasks.length})</p>
                  <ul className="space-y-1">
                    {overdueTasks.slice(0, 3).map((t: any) => (
                      <li key={t.id} className="text-sm text-gray-700 truncate flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />{t.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ul className="space-y-1">
                {openTasks.filter((t: any) => !overdueTasks.includes(t)).slice(0, 4).map((t: any) => (
                  <li key={t.id} className="text-sm text-gray-700 truncate flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />{t.title}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Open issues from unit */}
        <div className="card">
          <SectionHeader title="Unit Issues" action={<Link href="/issues" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          {issuesLoading ? <p className="text-gray-400 text-sm">Loading…</p> : openIssues.length === 0 ? (
            <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> No open issues</p>
          ) : (
            <ul className="space-y-2">
              {openIssues.slice(0, 5).map((i: any) => (
                <li key={i.id} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i.severity === 'CRITICAL' ? 'bg-red-500' : i.severity === 'HIGH' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                  <span className="text-sm text-gray-700 truncate flex-1">{i.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{i.status?.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Anonymous speak-up cases from unit */}
        <div className="card">
          <SectionHeader title="Speak-up Cases" action={<Link href="/speak-up" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          {speakUpLoading ? <p className="text-gray-400 text-sm">Loading…</p> : speakUpCases.length === 0 ? (
            <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> No cases from your unit</p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Submitter identities are never shown
              </p>
              <ul className="space-y-2">
                {speakUpCases.slice(0, 5).map((c: any) => (
                  <li key={c.id} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.urgency === 'URGENT' ? 'bg-red-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-700 truncate flex-1">{c.category} — {c.description?.slice(0, 50) ?? 'No description'}…</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                      c.status === 'NEW' ? 'bg-amber-100 text-amber-700' :
                      c.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{c.status}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/tasks" className="btn-primary flex items-center gap-2 text-sm"><CheckSquare className="w-4 h-4" /> Manage Tasks</Link>
        <Link href="/issues/new" className="btn-secondary flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4" /> Escalate Issue</Link>
        <Link href="/speak-up" className="btn-secondary flex items-center gap-2 text-sm"><MessageCircle className="w-4 h-4" /> Speak Up</Link>
      </div>
    </div>
  );
}

// ── Staff view ────────────────────────────────────────────────────────────────

function StaffView({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.firstName} 👋</h1>
        <p className="text-gray-500 mt-1">Your workspace — check active surveys and submit feedback</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/portal" className="card border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-600 rounded-xl"><ClipboardList className="w-5 h-5 text-white" /></div>
            <p className="font-semibold text-gray-900 group-hover:text-blue-700">Active Surveys</p>
          </div>
          <p className="text-sm text-gray-500">View and complete surveys assigned to your hospital unit</p>
          <p className="text-xs text-blue-600 mt-2 font-medium">Go to survey portal →</p>
        </Link>

        <Link href="/speak-up" className="card border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-green-600 rounded-xl"><MessageCircle className="w-5 h-5 text-white" /></div>
            <p className="font-semibold text-gray-900 group-hover:text-green-700">Speak Up</p>
          </div>
          <p className="text-sm text-gray-500">Submit anonymous feedback or raise a concern — your name is never stored</p>
          <p className="text-xs text-green-600 mt-2 font-medium">Submit anonymously →</p>
        </Link>
      </div>

      <div className="card bg-green-50 border border-green-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800">Your responses are always anonymous</p>
            <p className="text-sm text-green-700 mt-1">
              All surveys on this platform are submitted anonymously. Your name and employee ID are never stored alongside your answers.
              Leadership sees aggregated trends only — never individual responses.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">How your feedback drives change</h2>
        <ol className="space-y-3">
          {[
            { step: '1', text: 'You complete a survey anonymously', color: 'bg-blue-100 text-blue-700' },
            { step: '2', text: 'Scores are aggregated by dimension (e.g. Workload, Recognition)', color: 'bg-indigo-100 text-indigo-700' },
            { step: '3', text: 'Low-scoring areas surface as Issues for leadership to act on', color: 'bg-orange-100 text-orange-700' },
            { step: '4', text: 'Action plans are created and tracked — visible to you on the platform', color: 'bg-green-100 text-green-700' },
          ].map(({ step, text, color }) => (
            <li key={step} className="flex items-center gap-3 text-sm text-gray-700">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>{step}</span>
              {text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  if (hasRole('SVP') || hasRole('SUPER_ADMIN')) return <SVPView user={user} />;
  if (hasRole('CNP'))      return <CNOView user={user} />;
  if (hasRole('DIRECTOR')) return <DirectorView user={user} />;
  if (hasRole('MANAGER'))  return <ManagerView user={user} />;
  return <StaffView user={user} />;
}
