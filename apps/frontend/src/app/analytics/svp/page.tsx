'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend,
} from 'recharts';
import api from '@/lib/api';

// ── helpers ───────────────────────────────────────────────────────────────────

function kpiCard(label: string, value: string | number, sub?: string, color = 'text-gray-900') {
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function scoreBg(s: number | null) {
  if (s === null) return 'bg-gray-100 text-gray-400';
  if (s >= 75) return 'bg-emerald-100 text-emerald-700';
  if (s >= 60) return 'bg-lime-100 text-lime-700';
  if (s >= 45) return 'bg-amber-100 text-amber-700';
  if (s >= 30) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function scoreCell(s: number | null) {
  const cls = scoreBg(s);
  return (
    <td className={`px-2 py-2 text-center text-xs font-semibold ${cls}`}>
      {s !== null ? `${s}%` : '—'}
    </td>
  );
}

function alertBadge(severity: string) {
  if (severity === 'critical') return 'bg-red-100 border-red-300 text-red-800';
  return 'bg-amber-50 border-amber-300 text-amber-800';
}

const TABS = ['Executive', 'Heatmap', 'Execution', 'Leaders', 'Trends'] as const;

// ── Executive tab ─────────────────────────────────────────────────────────────

function ExecutiveTab({ d }: { d: any }) {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCard('Overall Engagement', `${d.overallEngagement}%`,
          `${d.totalUnitsTracked} units tracked`,
          d.overallEngagement >= 70 ? 'text-emerald-600' : d.overallEngagement >= 50 ? 'text-amber-500' : 'text-red-600')}
        {kpiCard('eNPS', d.eNps !== null ? d.eNps : 'N/A',
          'Employee Net Promoter',
          (d.eNps ?? 0) >= 20 ? 'text-emerald-600' : (d.eNps ?? 0) >= 0 ? 'text-amber-500' : 'text-red-600')}
        {kpiCard('Responses', d.responseCount.toLocaleString(), 'Total submitted')}
        {kpiCard('Low Units', d.lowPerformingUnitsCount,
          'below 70% favorable',
          d.lowPerformingUnitsCount > 3 ? 'text-red-600' : 'text-amber-500')}
        {kpiCard('Open Issues', d.issueStats.open,
          `${d.issueStats.overdue} overdue`,
          d.issueStats.overdue > 0 ? 'text-red-600' : 'text-gray-900')}
        {kpiCard('Overdue Tasks', d.taskStats.overdue,
          `${d.taskStats.over30Days} > 30 days`,
          d.taskStats.over30Days > 0 ? 'text-red-600' : d.taskStats.overdue > 0 ? 'text-amber-500' : 'text-gray-900')}
      </div>

      {/* Risk alerts */}
      {d.riskAlerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Risk Alerts</h3>
          <div className="space-y-2">
            {d.riskAlerts.map((a: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${alertBadge(a.severity)}`}>
                <span className="text-lg">{a.severity === 'critical' ? '🔴' : '🟡'}</span>
                <div>
                  <p className="font-medium text-sm">{a.label}</p>
                  <p className="text-xs mt-0.5 opacity-80">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 problem areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 Problem Areas</h3>
          <div className="space-y-2">
            {d.topProblems.map((p: any, i: number) => (
              <div key={p.dimension} className="flex items-center gap-3">
                <span className="text-sm font-bold text-red-400 w-5">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{p.dimension}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${scoreBg(p.score)}`}>{p.score}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${p.score}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low performing units */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Lowest Performing Units</h3>
          <div className="space-y-2">
            {d.lowUnits.slice(0, 5).map((u: any) => (
              <div key={u.orgUnitId} className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{u.orgUnitName}</p>
                  <p className="text-xs text-gray-500">{u.hospitalName}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${scoreBg(u.overallScore)}`}>
                  {u.overallScore}%
                </span>
              </div>
            ))}
            {d.lowUnits.length === 0 && <p className="text-sm text-gray-400">All units above threshold</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Heatmap tab ───────────────────────────────────────────────────────────────

function HeatmapTab({ d }: { d: any }) {
  const dims: string[] = d.dimensions ?? [];
  const hospitals: any[] = d.hospitalHeatmap ?? [];

  if (!hospitals.length) return <p className="text-gray-400 text-sm">No data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 font-semibold text-gray-600 bg-gray-50 border border-gray-200 whitespace-nowrap">Hospital</th>
            <th className="px-2 py-2 font-semibold text-gray-600 bg-gray-50 border border-gray-200 text-center whitespace-nowrap">Overall</th>
            {dims.map((dim) => (
              <th key={dim} className="px-2 py-2 font-semibold text-gray-600 bg-gray-50 border border-gray-200 text-center whitespace-nowrap" style={{ minWidth: 80 }}>
                {dim}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hospitals.map((h) => (
            <tr key={h.hospitalId}>
              <td className="px-3 py-2 border border-gray-200 font-medium text-gray-800 whitespace-nowrap bg-white">
                <p>{h.hospitalName}</p>
                <p className="text-gray-400 font-normal">{h.responseCount} responses</p>
              </td>
              <td className={`px-2 py-2 border border-gray-200 text-center font-bold ${scoreBg(h.overallScore)}`}>
                {h.overallScore}%
              </td>
              {dims.map((dim) => scoreCell(h.dimensions[dim] ?? null))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" />Critical (&lt;30%)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" />Poor (30–44%)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" />Fair (45–59%)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-lime-200 inline-block" />Good (60–74%)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" />Strong (≥75%)</span>
      </div>
    </div>
  );
}

// ── Execution tab ─────────────────────────────────────────────────────────────

function ExecutionTab({ d }: { d: any }) {
  const is = d.issueStats;
  const ts = d.taskStats;

  const issueBarData = [
    { name: 'Open', value: is.open, fill: '#ef4444' },
    { name: 'In Progress', value: is.inProgress, fill: '#f59e0b' },
    { name: 'Blocked', value: is.blocked, fill: '#8b5cf6' },
    { name: 'Resolved', value: is.resolved, fill: '#10b981' },
    { name: 'Closed', value: is.closed, fill: '#6b7280' },
  ];

  const taskBarData = [
    { name: 'To Do', value: ts.todo, fill: '#94a3b8' },
    { name: 'In Progress', value: ts.inProgress, fill: '#3b82f6' },
    { name: 'Blocked', value: ts.blocked, fill: '#8b5cf6' },
    { name: 'Done', value: ts.done, fill: '#10b981' },
    { name: 'Overdue', value: ts.overdue, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Issue + Task charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-1">Issues by Status</h3>
          <p className="text-xs text-gray-400 mb-4">{is.total} total · {is.withNoOwner} unowned · {is.overdue} overdue</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={issueBarData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {issueBarData.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-1">Tasks by Status</h3>
          <p className="text-xs text-gray-400 mb-4">{ts.total} total · avg {ts.avgDaysToComplete ?? '—'} days to complete · {ts.over30Days} stuck &gt;30 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={taskBarData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {taskBarData.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Severity breakdown */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Issue Severity Breakdown</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Critical', key: 'CRITICAL', color: 'text-red-600 bg-red-50 border-red-200' },
            { label: 'High', key: 'HIGH', color: 'text-orange-600 bg-orange-50 border-orange-200' },
            { label: 'Medium', key: 'MEDIUM', color: 'text-amber-600 bg-amber-50 border-amber-200' },
            { label: 'Low', key: 'LOW', color: 'text-gray-600 bg-gray-50 border-gray-200' },
          ].map(({ label, key, color }) => (
            <div key={key} className={`text-center p-3 rounded-lg border ${color}`}>
              <p className="text-2xl font-bold">{is.bySeverity?.[key] ?? 0}</p>
              <p className="text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stuck items */}
      {d.stuckItems?.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-gray-900 mb-3">Where It Is Stuck — Overdue Tasks</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b">
                <th className="pb-2 pr-4">Task</th>
                <th className="pb-2 pr-4">Owner</th>
                <th className="pb-2 pr-4">Unit</th>
                <th className="pb-2 pr-4 text-center">Days Overdue</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {d.stuckItems.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-800">{t.title}</td>
                  <td className="py-2 pr-4 text-gray-500">{t.ownerName ?? '—'}</td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">{t.orgUnitName ?? '—'}</td>
                  <td className="py-2 pr-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.daysOverdue > 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.daysOverdue}d
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Leaders tab ───────────────────────────────────────────────────────────────

function LeadersTab({ d }: { d: any }) {
  const leaders: any[] = d.leaderScorecard ?? [];
  if (!leaders.length) return <p className="text-gray-400 text-sm">No task data yet</p>;

  return (
    <div className="card overflow-x-auto">
      <h3 className="font-semibold text-gray-900 mb-4">Leader Accountability Scorecard</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase border-b">
            <th className="pb-2 pr-6">Leader</th>
            <th className="pb-2 pr-4 text-center">Total Tasks</th>
            <th className="pb-2 pr-4 text-center">Completed</th>
            <th className="pb-2 pr-4 text-center">Overdue</th>
            <th className="pb-2 pr-4 text-center">Completion Rate</th>
            <th className="pb-2">Execution Grade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {leaders.map((l: any) => {
            const grade = l.completionRate >= 80 ? { label: 'Strong', cls: 'bg-emerald-100 text-emerald-700' }
              : l.completionRate >= 60 ? { label: 'On Track', cls: 'bg-lime-100 text-lime-700' }
              : l.completionRate >= 40 ? { label: 'At Risk', cls: 'bg-amber-100 text-amber-700' }
              : { label: 'Critical', cls: 'bg-red-100 text-red-700' };
            return (
              <tr key={l.ownerId} className="hover:bg-gray-50">
                <td className="py-2 pr-6 font-medium text-gray-800">{l.ownerName}</td>
                <td className="py-2 pr-4 text-center text-gray-600">{l.totalTasks}</td>
                <td className="py-2 pr-4 text-center text-emerald-600 font-medium">{l.completed}</td>
                <td className="py-2 pr-4 text-center">
                  {l.overdue > 0
                    ? <span className="text-red-600 font-medium">{l.overdue}</span>
                    : <span className="text-gray-400">0</span>}
                </td>
                <td className="py-2 pr-4 text-center">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full rounded-full bg-blue-400" style={{ width: `${l.completionRate}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-10">{l.completionRate}%</span>
                  </div>
                </td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${grade.cls}`}>{grade.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Trends tab ────────────────────────────────────────────────────────────────

function TrendsTab({ d }: { d: any }) {
  const burnout: any[] = d.burnoutTrend ?? [];
  const retention: any[] = d.retentionRiskUnits ?? [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-1">Burnout & Wellbeing Trend</h3>
        <p className="text-xs text-gray-400 mb-4">% of respondents with minimal workload concerns (favorable)</p>
        {burnout.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={burnout}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="score" name="Wellbeing Score" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm">No trend data yet</p>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-1">Retention Risk Units</h3>
        <p className="text-xs text-gray-400 mb-4">Units with low Advocacy scores (&lt;50%) — proxy for intent-to-leave</p>
        {retention.length > 0 ? (
          <div className="space-y-2">
            {retention.map((u: any) => (
              <div key={u.orgUnitName} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">{u.orgUnitName}
                      <span className="text-xs text-gray-400 ml-1">({u.hospitalName})</span>
                    </span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${scoreBg(u.advocacyScore)}`}>
                      {u.advocacyScore}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${u.advocacyScore}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">All units have healthy advocacy scores</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SvpDashboardPage() {
  const [tab, setTab] = useState<typeof TABS[number]>('Executive');
  const [surveyId, setSurveyId] = useState('');

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys-list'],
    queryFn: () => api.get('/surveys').then((r) => {
      const d = r.data;
      return Array.isArray(d) ? d : (d.data ?? d.surveys ?? []);
    }),
  });

  const { data: d, isLoading } = useQuery({
    queryKey: ['svp-dashboard', surveyId],
    queryFn: () => api.get(`/analytics/svp${surveyId ? `?surveyId=${surveyId}` : ''}`).then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">SVP Analytics</h1>
          <p className="text-gray-500 mt-1">Executive view — engagement, execution, and accountability</p>
        </div>
        <div className="min-w-[260px]">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Survey</label>
          <select value={surveyId} onChange={(e) => setSurveyId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All surveys</option>
            {surveys.map((s: any) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}
        </div>
      ) : !d ? (
        <p className="text-gray-400 text-sm">No data available</p>
      ) : (
        <>
          {tab === 'Executive'  && <ExecutiveTab d={d} />}
          {tab === 'Heatmap'    && <HeatmapTab   d={d} />}
          {tab === 'Execution'  && <ExecutionTab  d={d} />}
          {tab === 'Leaders'    && <LeadersTab    d={d} />}
          {tab === 'Trends'     && <TrendsTab     d={d} />}
        </>
      )}
    </div>
  );
}
