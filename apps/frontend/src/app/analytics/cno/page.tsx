'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import api from '@/lib/api';

// ── helpers ───────────────────────────────────────────────────────────────────

function scoreBg(s: number) {
  return s >= 70 ? 'bg-emerald-100 text-emerald-700' : s >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
}
function scoreBar(s: number) {
  return s >= 70 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-400' : 'bg-red-400';
}
function scoreText(s: number) {
  return s >= 70 ? 'text-emerald-600' : s >= 50 ? 'text-amber-500' : 'text-red-600';
}

const DIMS = [
  'Advocacy', 'Organizational Pride', 'Workload & Wellbeing', 'Meaningful Work',
  'Recognition', 'Leadership Comms', 'Psychological Safety', 'Manager Feedback',
  'Professional Growth', 'Overall Experience',
];

const DIM_COLORS: Record<string, string> = {
  'Advocacy': '#3b82f6', 'Organizational Pride': '#8b5cf6',
  'Workload & Wellbeing': '#f59e0b', 'Meaningful Work': '#10b981',
  'Recognition': '#ec4899', 'Leadership Comms': '#6366f1',
  'Psychological Safety': '#14b8a6', 'Manager Feedback': '#f97316',
  'Professional Growth': '#84cc16', 'Overall Experience': '#06b6d4',
};

function avg(vals: number[]) {
  const v = vals.filter((x) => x > 0);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900 text-lg">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Hospital vs Hospital bar chart ────────────────────────────────────────────

function HospitalComparisonChart({ hospitals, myHospitalId }: { hospitals: any[]; myHospitalId: string }) {
  if (!hospitals.length) return <p className="text-gray-400 text-sm">No multi-hospital data available yet.</p>;

  const data = hospitals.map((h) => ({
    name: h.name.length > 20 ? h.name.slice(0, 18) + '…' : h.name,
    fullName: h.name,
    score: h.avg,
    isMine: h.id === myHospitalId,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: any, _: any, p: any) => [`${v}%`, p.payload.fullName]} />
        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isMine ? '#3b82f6' : '#cbd5e1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Dimension radar: my hospital vs system avg ────────────────────────────────

function DimensionRadar({ myDims, systemDims }: { myDims: Record<string, number>; systemDims: Record<string, number> }) {
  const data = DIMS.map((d) => ({
    dim: d.length > 14 ? d.slice(0, 13) + '…' : d,
    fullDim: d,
    mine: myDims[d] ?? 0,
    system: systemDims[d] ?? 0,
  })).filter((d) => d.mine > 0 || d.system > 0);

  if (!data.length) return <p className="text-gray-400 text-sm">No dimension data available yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
        <Radar name="My Hospital" dataKey="mine" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
        <Radar name="System Avg" dataKey="system" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip formatter={(v: any) => `${v}%`} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Dimension bar table: my hospital vs system ────────────────────────────────

function DimensionTable({ myDims, systemDims }: { myDims: Record<string, number>; systemDims: Record<string, number> }) {
  return (
    <div className="space-y-2">
      {DIMS.filter((d) => (myDims[d] ?? 0) > 0).map((dim) => {
        const mine = myDims[dim] ?? 0;
        const sys  = systemDims[dim] ?? 0;
        const diff = mine - sys;
        return (
          <div key={dim} className="grid grid-cols-[1fr_80px_80px_60px] items-center gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800 truncate">{dim}</p>
              <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div className={`h-full ${scoreBar(mine)} rounded-full`} style={{ width: `${mine}%` }} />
              </div>
            </div>
            <span className={`text-sm font-bold text-right ${scoreText(mine)}`}>{mine}%</span>
            <span className="text-sm text-gray-400 text-right">{sys > 0 ? `${sys}%` : '—'}</span>
            {diff !== 0 && sys > 0 ? (
              <span className={`text-xs font-semibold text-right ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {diff > 0 ? '+' : ''}{diff}
              </span>
            ) : <span />}
          </div>
        );
      })}
      <div className="flex gap-3 text-xs text-gray-400 pt-1 border-t border-gray-100">
        <span className="ml-auto">My hospital</span>
        <span className="w-20 text-right">System avg</span>
        <span className="w-14 text-right">Diff</span>
      </div>
    </div>
  );
}

// ── Department heatmap ────────────────────────────────────────────────────────

function DeptHeatmap({ units }: { units: any[] }) {
  if (!units.length) return <p className="text-gray-400 text-sm">No department data yet.</p>;

  const activeDims = DIMS.filter((d) => units.some((u) => (u.scores?.[d] ?? 0) > 0));

  function cellColor(score: number) {
    if (score <= 0) return 'bg-gray-50 text-gray-300';
    if (score >= 70) return 'bg-emerald-100 text-emerald-800';
    if (score >= 50) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left pr-3 py-2 text-gray-500 font-medium min-w-[140px]">Department</th>
            <th className="text-center px-2 py-2 text-gray-400 font-medium">Overall</th>
            {activeDims.map((d) => (
              <th key={d} className="text-center px-1.5 py-2 text-gray-400 font-medium whitespace-nowrap" title={d}>
                {d.split(' ').map((w) => w[0]).join('')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {units.map((u) => (
            <tr key={u.orgUnitId} className="hover:bg-gray-50">
              <td className="pr-3 py-2 font-medium text-gray-800 truncate max-w-[160px]">{u.orgUnitName}</td>
              <td className="px-2 py-2 text-center">
                <span className={`px-1.5 py-0.5 rounded-full font-semibold ${scoreBg(u.overallFavorable)}`}>
                  {u.overallFavorable}%
                </span>
              </td>
              {activeDims.map((d) => {
                const score = u.scores?.[d] ?? 0;
                return (
                  <td key={d} className="px-1.5 py-2 text-center" title={`${d}: ${score}%`}>
                    <span className={`inline-block px-1 py-0.5 rounded text-[11px] font-semibold ${cellColor(score)}`}>
                      {score > 0 ? score : '—'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">Column headers are dimension initials. Hover a cell to see the full name.</p>
    </div>
  );
}

// ── Trend line ────────────────────────────────────────────────────────────────

function HospitalTrendChart({ data }: { data: any }) {
  const cycles = data?.cycles ?? [];
  if (!cycles.length) return <p className="text-gray-400 text-sm">No trend data yet — complete more survey cycles.</p>;

  const dims = Object.keys(cycles[0]?.dimensions ?? {});
  const chartData = cycles.map((c: any) => ({ period: c.period, ...c.dimensions }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: any) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {dims.map((d) => (
          <Line key={d} type="monotone" dataKey={d}
            stroke={DIM_COLORS[d] ?? '#94a3b8'} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Root cause (sentiment) ────────────────────────────────────────────────────

function SentimentPanel({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <p className="text-gray-400 text-sm animate-pulse">Loading sentiment…</p>;
  const dist  = data?.sentimentDistribution ?? {};
  const total = data?.totalTextResponses ?? 0;
  const themes: any[] = data?.themes ?? [];

  if (total === 0) return <p className="text-gray-400 text-sm">No open-text responses for this hospital yet.</p>;

  const topNeg = [...themes].sort((a, b) => b.negativeCount - a.negativeCount).slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {(['positive', 'neutral', 'negative'] as const).map((s) => {
          const pct = total > 0 ? Math.round(((dist[s] ?? 0) / total) * 100) : 0;
          const colors = { positive: 'bg-emerald-50 text-emerald-700 border-emerald-200', neutral: 'bg-gray-50 text-gray-600 border-gray-200', negative: 'bg-red-50 text-red-700 border-red-200' };
          return (
            <div key={s} className={`rounded-xl border p-3 text-center ${colors[s]}`}>
              <p className="text-2xl font-bold">{pct}%</p>
              <p className="text-xs font-medium capitalize mt-0.5">{s}</p>
              <p className="text-xs opacity-70">{dist[s] ?? 0} responses</p>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top concern areas</p>
        <div className="space-y-2">
          {topNeg.map((t, i) => (
            <div key={t.theme} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <span className="text-lg font-bold text-red-300">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{t.theme}</p>
                <p className="text-xs text-gray-500">{t.count} mentions · {t.count > 0 ? Math.round((t.negativeCount / t.count) * 100) : 0}% negative</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">All themes</p>
        <div className="space-y-1.5">
          {themes.map((t: any) => {
            const pct = themes[0]?.count > 0 ? Math.round((t.count / themes[0].count) * 100) : 0;
            return (
              <div key={t.theme} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-44 truncate flex-shrink-0">{t.theme}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{t.count} mentions</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CNOAnalyticsPage() {
  const [surveyId, setSurveyId] = useState('');

  // 1. Profile → hospitalId
  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data),
  });
  const hospitalId   = profile?.hospital?.id;
  const hospitalName = profile?.hospital?.name ?? 'Your Hospital';

  const qs = surveyId ? `?surveyId=${surveyId}` : '';

  // 2. Analytics data
  const { data: surveys = [] } = useQuery<any[]>({
    queryKey: ['surveys-list'],
    queryFn: () => api.get('/surveys').then((r) => Array.isArray(r.data) ? r.data : (r.data.data ?? [])),
  });
  const { data: lowUnits, isLoading: luLoading } = useQuery<any>({
    queryKey: ['cno-low-units', surveyId],
    queryFn: () => api.get(`/analytics/low-units${qs}`).then((r) => r.data),
    enabled: !!hospitalId,
    staleTime: 3 * 60_000,
  });
  const { data: heatmap, isLoading: hmLoading } = useQuery<any>({
    queryKey: ['cno-heatmap', surveyId],
    queryFn: () => api.get(`/analytics/heatmap${qs}`).then((r) => r.data),
    enabled: !!hospitalId,
    staleTime: 3 * 60_000,
  });
  const { data: trends, isLoading: trendsLoading } = useQuery<any>({
    queryKey: ['cno-trends', hospitalId, surveyId],
    queryFn: () => api.get(`/analytics/trends${surveyId ? `?surveyId=${surveyId}&orgUnitId=${hospitalId}` : `?orgUnitId=${hospitalId}`}`).then((r) => r.data),
    enabled: !!hospitalId,
    staleTime: 3 * 60_000,
  });
  const { data: sentiment, isLoading: sentLoading } = useQuery<any>({
    queryKey: ['cno-sentiment', hospitalId, surveyId],
    queryFn: () => api.get(`/analytics/sentiment${surveyId ? `?surveyId=${surveyId}&orgUnitId=${hospitalId}` : `?orgUnitId=${hospitalId}`}`).then((r) => r.data),
    enabled: !!hospitalId,
    staleTime: 3 * 60_000,
  });
  const { data: participation = [] } = useQuery<any[]>({
    queryKey: ['cno-participation', surveyId],
    queryFn: () => api.get(`/analytics/participation${qs}`).then((r) => r.data),
    enabled: !!hospitalId,
  });

  if (profileLoading) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}
    </div>
  );

  // ── Data derivations ────────────────────────────────────────────────────────

  const allUnits: any[]     = lowUnits?.units ?? [];
  const myHospUnits: any[]  = allUnits.filter((u) => u.hospitalId === hospitalId);
  const myHospScores        = myHospUnits.map((u) => u.overallFavorable).filter((v) => v > 0);
  const myHospOverall       = avg(myHospScores);
  const myHospResponses     = (participation as any[]).filter((p) => p.hospitalId === hospitalId).reduce((s, p) => s + p.count, 0);

  // Hospital-level aggregation (for comparison chart)
  const hospitalMap = new Map<string, { name: string; scores: number[] }>();
  for (const u of allUnits) {
    if (!u.hospitalId) continue;
    if (!hospitalMap.has(u.hospitalId)) hospitalMap.set(u.hospitalId, { name: u.hospitalName ?? u.hospitalId, scores: [] });
    if (u.overallFavorable > 0) hospitalMap.get(u.hospitalId)!.scores.push(u.overallFavorable);
  }
  const hospitals = Array.from(hospitalMap.entries())
    .map(([id, { name, scores }]) => ({ id, name, avg: avg(scores) }))
    .sort((a, b) => b.avg - a.avg);
  const systemOverall = avg(hospitals.map((h) => h.avg));
  const myRank        = hospitals.findIndex((h) => h.id === hospitalId) + 1;
  const myVsSystem    = myHospOverall - systemOverall;

  // My hospital dimension averages (from heatmap)
  const myHmUnits: any[] = (heatmap?.units ?? []).filter((u: any) => {
    const lu = allUnits.find((l) => l.orgUnitId === u.orgUnitId);
    return lu ? lu.hospitalId === hospitalId : false;
  });
  const myDims: Record<string, number> = {};
  if (myHmUnits.length) {
    for (const dim of DIMS) {
      myDims[dim] = avg(myHmUnits.map((u) => u.scores?.[dim] ?? 0));
    }
  }

  // System dimension averages
  const systemDims: Record<string, number> = {};
  if ((heatmap?.units ?? []).length) {
    for (const dim of DIMS) {
      systemDims[dim] = avg((heatmap.units as any[]).map((u) => u.scores?.[dim] ?? 0));
    }
  }

  // Dept rankings within my hospital (enriched with heatmap scores)
  const deptRanking = myHospUnits
    .map((u) => ({ ...u, scores: myHmUnits.find((h) => h.orgUnitId === u.orgUnitId)?.scores ?? {} }))
    .sort((a, b) => b.overallFavorable - a.overallFavorable);

  // Low-performing depts within my hospital
  const lowDepts = deptRanking.filter((u) => u.overallFavorable < (lowUnits?.threshold ?? 70));

  const loading = luLoading || hmLoading;

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{hospitalName} — Analytics</h1>
          <p className="text-gray-500 mt-1">In-depth engagement analytics for your hospital and system-wide comparison</p>
        </div>
        <div className="flex flex-col gap-1 min-w-[260px]">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filter by Survey</label>
          <select value={surveyId} onChange={(e) => setSurveyId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All surveys</option>
            {(surveys as any[]).map((s) => (
              <option key={s.id} value={s.id}>{s.title} ({s.status})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card h-28 animate-pulse bg-gray-50" />)}
        </div>
      ) : (
        <>
          {/* ── Summary score cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className={`text-4xl font-bold ${scoreText(myHospOverall)}`}>{myHospOverall > 0 ? `${myHospOverall}%` : '—'}</p>
              <p className="text-sm text-gray-500 mt-1">Hospital Engagement</p>
            </div>
            <div className="card text-center">
              <p className={`text-4xl font-bold ${systemOverall > 0 ? scoreText(systemOverall) : 'text-gray-300'}`}>
                {systemOverall > 0 ? `${systemOverall}%` : '—'}
              </p>
              <p className="text-sm text-gray-500 mt-1">Franciscan System Avg</p>
            </div>
            <div className="card text-center">
              {myVsSystem !== 0 && systemOverall > 0 ? (
                <p className={`text-4xl font-bold ${myVsSystem > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {myVsSystem > 0 ? '+' : ''}{myVsSystem}
                </p>
              ) : <p className="text-4xl font-bold text-gray-300">—</p>}
              <p className="text-sm text-gray-500 mt-1">vs System Average</p>
            </div>
            <div className="card text-center">
              {myRank > 0 ? (
                <>
                  <p className="text-4xl font-bold text-blue-600">#{myRank}</p>
                  <p className="text-sm text-gray-500 mt-1">of {hospitals.length} hospitals</p>
                </>
              ) : <p className="text-4xl font-bold text-gray-300">—</p>}
            </div>
          </div>

          {/* ── Hospital vs Hospital ───────────────────────────────────────── */}
          <Section
            title="Hospital Comparison — Franciscan System"
            subtitle={`Blue bar = ${hospitalName}. Sorted by engagement score.`}
          >
            <HospitalComparisonChart hospitals={hospitals} myHospitalId={hospitalId} />
            {hospitals.length > 0 && (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b text-left">
                      <th className="pb-2 pr-4">Rank</th>
                      <th className="pb-2 pr-4">Hospital</th>
                      <th className="pb-2 pr-4 text-center">Departments</th>
                      <th className="pb-2 text-center">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {hospitals.map((h, i) => (
                      <tr key={h.id} className={h.id === hospitalId ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}>
                        <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                        <td className="py-2 pr-4 text-gray-800">
                          {h.name}{h.id === hospitalId && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">You</span>}
                        </td>
                        <td className="py-2 pr-4 text-center text-gray-500 text-xs">
                          {allUnits.filter((u) => u.hospitalId === h.id).length}
                        </td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBg(h.avg)}`}>{h.avg}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Dimension breakdown ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section
              title="Engagement Dimensions — Radar"
              subtitle="My hospital (blue) vs Franciscan system average (grey)"
            >
              <DimensionRadar myDims={myDims} systemDims={systemDims} />
            </Section>

            <Section
              title="Dimension Scores vs System Average"
              subtitle="Colour = health (green ≥70%, amber 50–70%, red <50%)"
            >
              <DimensionTable myDims={myDims} systemDims={systemDims} />
            </Section>
          </div>

          {/* ── Dept heatmap ───────────────────────────────────────────────── */}
          <Section
            title={`Department Heatmap — ${hospitalName}`}
            subtitle="All departments within your hospital. Each cell = dimension score. Initials key: hover column header."
          >
            <DeptHeatmap units={deptRanking} />
          </Section>

          {/* ── Dept ranking table ─────────────────────────────────────────── */}
          <Section
            title="Department Rankings"
            subtitle={`${deptRanking.length} departments in ${hospitalName}`}
          >
            {deptRanking.length === 0 ? (
              <p className="text-gray-400 text-sm">No department data yet.</p>
            ) : (
              <div className="space-y-2">
                {deptRanking.map((u, i) => (
                  <div key={u.orgUnitId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-bold text-gray-400 w-6 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.orgUnitName}</p>
                      {u.lowestDimension && (
                        <p className="text-xs text-gray-400">Lowest: {u.lowestDimension} ({u.lowestScore}%)</p>
                      )}
                    </div>
                    <div className="w-28 hidden sm:block">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${scoreBar(u.overallFavorable)} rounded-full`} style={{ width: `${u.overallFavorable}%` }} />
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${scoreBg(u.overallFavorable)}`}>
                      {u.overallFavorable}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Low performing depts ───────────────────────────────────────── */}
          {lowDepts.length > 0 && (
            <Section
              title={`Departments Needing Attention (${lowDepts.length})`}
              subtitle={`Below ${lowUnits?.threshold ?? 70}% favorable threshold`}
            >
              <div className="space-y-2">
                {lowDepts.map((u) => (
                  <div key={u.orgUnitId} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{u.orgUnitName}</p>
                      <p className="text-xs text-red-500 mt-0.5">
                        Weakest area: {u.lowestDimension ?? '—'} · {u.lowestScore != null ? `${u.lowestScore}%` : '—'}
                      </p>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${scoreBg(u.overallFavorable)}`}>
                      {u.overallFavorable}%
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Trend over time ─────────────────────────────────────────────── */}
          <Section
            title={`${hospitalName} — Score Trends`}
            subtitle="Engagement dimension scores over time for your hospital"
          >
            {trendsLoading
              ? <div className="h-40 animate-pulse bg-gray-50 rounded-lg" />
              : <HospitalTrendChart data={trends} />}
          </Section>

          {/* ── Sentiment / Root Cause ─────────────────────────────────────── */}
          <Section
            title="Root Cause Analysis — Sentiment & Themes"
            subtitle="Themes extracted from open-text survey responses within your hospital"
          >
            <SentimentPanel data={sentiment} loading={sentLoading} />
          </Section>

        </>
      )}
    </div>
  );
}
