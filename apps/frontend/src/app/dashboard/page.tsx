'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import {
  AlertTriangle, CheckSquare, ClipboardList, ArrowUpCircle,
  ShieldCheck, Clock, TrendingUp, Users, MessageCircle,
  Building2, CheckCircle2, Zap, BarChart2, Eye,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

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

  if (isLoading) return <p className="text-gray-400 text-sm">Loading...</p>;

  const draft    = surveys.filter((s) => s.status === 'DRAFT');
  const pending  = surveys.filter((s) => s.approvalStatus === 'PENDING');
  const active   = surveys.filter((s) => s.status === 'ACTIVE');
  const rejected = surveys.filter((s) => s.approvalStatus === 'REJECTED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.firstName} 👋</h1>
        <p className="text-gray-500 mt-1">{user?.orgUnit?.name ?? 'Your hospital'} — nurse engagement overview</p>
      </div>

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
      </div>
    </div>
  );
}

// ── Director view ─────────────────────────────────────────────────────────────

function DirectorView({ user }: { user: any }) {
  const { data: surveys = [], isLoading: surveysLoading } = useQuery<any[]>({
    queryKey: ['surveys'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
  });

  if (surveysLoading || tasksLoading) return <p className="text-gray-400 text-sm">Loading...</p>;

  const activeSurveys = surveys.filter((s) => s.status === 'ACTIVE');
  const draftSurveys  = surveys.filter((s) => s.status === 'DRAFT');
  const overdue = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.firstName} 👋</h1>
        <p className="text-gray-500 mt-1">{user?.orgUnit?.name ?? 'Your department'} — team pulse overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Surveys"  value={activeSurveys.length} icon={Zap}          color="bg-green-500"  href="/surveys" />
        <MetricCard label="Draft Surveys"   value={draftSurveys.length}  icon={ClipboardList} color="bg-gray-500"   href="/surveys" />
        <MetricCard label="Total Tasks"     value={tasks.length}         icon={CheckSquare}   color="bg-blue-500"   href="/tasks" />
        <MetricCard label="Overdue Tasks"   value={overdue.length}       icon={Clock}         color="bg-orange-500" href="/tasks" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader title="Department Surveys" action={<Link href="/surveys/new" className="text-xs text-blue-600 font-medium">+ New →</Link>} />
          {surveys.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">No surveys yet</p>
              <Link href="/surveys/new" className="btn-primary text-sm">Create your first pulse</Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {surveys.slice(0, 4).map((s: any) => (
                <li key={s.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700 truncate flex-1">{s.title}</span>
                  <span className={`flex-shrink-0 ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : s.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>{s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <SectionHeader title="Overdue Tasks" action={<Link href="/tasks" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          {overdue.length === 0 ? (
            <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> No overdue tasks</p>
          ) : (
            <ul className="space-y-2">
              {overdue.slice(0, 5).map((t: any) => (
                <li key={t.id} className="text-sm text-gray-700 truncate flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />{t.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/surveys/new" className="btn-primary flex items-center gap-2 text-sm"><ClipboardList className="w-4 h-4" /> New Pulse Survey</Link>
        <Link href="/tasks" className="btn-secondary flex items-center gap-2 text-sm"><CheckSquare className="w-4 h-4" /> View Tasks</Link>
        <Link href="/issues" className="btn-secondary flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4" /> Raise Issue</Link>
      </div>
    </div>
  );
}

// ── Manager view ──────────────────────────────────────────────────────────────

function ManagerView({ user }: { user: any }) {
  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
  });
  const { data: surveys = [] } = useQuery<any[]>({
    queryKey: ['surveys'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Loading...</p>;

  const myTasks = tasks.filter((t: any) => t.assignedToId === user?.id || t.status !== 'DONE');
  const overdue = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE');
  const activeSurveys = surveys.filter((s: any) => s.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.firstName} 👋</h1>
        <p className="text-gray-500 mt-1">Your team at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Surveys"  value={activeSurveys.length} icon={ClipboardList} color="bg-blue-500"   href="/surveys" />
        <MetricCard label="Open Tasks"      value={myTasks.length}       icon={CheckSquare}   color="bg-indigo-500" href="/tasks" />
        <MetricCard label="Overdue Tasks"   value={overdue.length}       icon={Clock}         color="bg-orange-500" href="/tasks" />
        <MetricCard label="Team Members"    value="—"                    icon={Users}         color="bg-teal-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader title="Active Surveys" action={<Link href="/surveys" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          {activeSurveys.length === 0 ? (
            <p className="text-gray-400 text-sm">No active surveys right now</p>
          ) : (
            <ul className="space-y-2">
              {activeSurveys.slice(0, 4).map((s: any) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <Zap className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="truncate text-gray-700">{s.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <SectionHeader title="Overdue Tasks" action={<Link href="/tasks" className="text-xs text-blue-600 font-medium">View all →</Link>} />
          {overdue.length === 0 ? (
            <p className="text-gray-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> All caught up!</p>
          ) : (
            <ul className="space-y-2">
              {overdue.slice(0, 5).map((t: any) => (
                <li key={t.id} className="text-sm truncate flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />{t.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/tasks" className="btn-primary flex items-center gap-2 text-sm"><CheckSquare className="w-4 h-4" /> Manage Tasks</Link>
        <Link href="/issues" className="btn-secondary flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4" /> Raise Issue</Link>
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
