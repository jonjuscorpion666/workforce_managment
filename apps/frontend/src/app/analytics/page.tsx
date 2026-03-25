'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import api from '@/lib/api';

// ── helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  return s >= 75 ? 'text-emerald-600' : s >= 50 ? 'text-amber-500' : 'text-red-600';
}
function scoreBg(s: number) {
  return s >= 75 ? 'bg-emerald-100 text-emerald-700' : s >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
}
function sentimentBadge(s: string) {
  if (s === 'positive') return 'bg-emerald-100 text-emerald-700';
  if (s === 'negative') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

// ── Participation chart ───────────────────────────────────────────────────────

function ParticipationChart({ data }: { data: any[] }) {
  const [groupBy, setGroupBy] = useState<'unit' | 'hospital'>('unit');

  const chartData = groupBy === 'hospital'
    ? Object.values(
        data.reduce((acc: Record<string, any>, r: any) => {
          const key = r.hospitalId ?? 'Unknown';
          if (!acc[key]) acc[key] = { name: r.hospitalName ?? key, count: 0 };
          acc[key].count += r.count;
          return acc;
        }, {}),
      )
    : data.map((r: any) => ({ name: r.orgUnitName ?? r.orgUnitId, count: r.count }));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Participation</h2>
        <div className="flex gap-1 text-xs">
          {(['unit', 'hospital'] as const).map((g) => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={`px-2 py-1 rounded ${groupBy === g ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {g === 'unit' ? 'Department' : 'Hospital'}
            </button>
          ))}
        </div>
      </div>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="Responses" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-400 text-sm">No participation data</p>
      )}
    </div>
  );
}

// ── Trends chart ──────────────────────────────────────────────────────────────

const DIM_COLORS: Record<string, string> = {
  'Advocacy': '#3b82f6', 'Organizational Pride': '#8b5cf6',
  'Workload & Wellbeing': '#f59e0b', 'Meaningful Work': '#10b981',
  'Recognition': '#ec4899', 'Leadership Comms': '#6366f1',
  'Psychological Safety': '#14b8a6', 'Manager Feedback': '#f97316',
  'Professional Growth': '#84cc16', 'Overall Experience': '#06b6d4',
};

function TrendsChart({ data }: { data: any }) {
  const cycles = data?.cycles ?? [];
  if (!cycles.length) return (
    <div className="card">
      <h2 className="font-semibold text-gray-900 mb-4">Score Trends</h2>
      <p className="text-gray-400 text-sm">No trend data yet</p>
    </div>
  );

  const dims = Object.keys(cycles[0]?.dimensions ?? {});
  const chartData = cycles.map((c: any) => ({ period: c.period, ...c.dimensions }));

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-900 mb-4">Score Trends by Dimension</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: any) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {dims.map((d) => (
            <Line key={d} type="monotone" dataKey={d}
              stroke={DIM_COLORS[d] ?? '#94a3b8'} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Low-Performing Units ──────────────────────────────────────────────────────

function LowUnitsTable({ data }: { data: any }) {
  if (!data?.units?.length) return (
    <div className="card">
      <h2 className="font-semibold text-gray-900 mb-2">Low-Performing Units</h2>
      <p className="text-gray-400 text-sm">No units below threshold</p>
    </div>
  );

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">
          Low-Performing Units
          <span className="text-sm font-normal text-gray-400 ml-2">(below {data.threshold}% favorable)</span>
        </h2>
        <span className="text-sm text-red-500 font-medium">{data.units.length} unit(s)</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase border-b">
            <th className="pb-2 pr-4">Unit</th>
            <th className="pb-2 pr-4">Hospital</th>
            <th className="pb-2 pr-4 text-center">Responses</th>
            <th className="pb-2 pr-4 text-center">Overall</th>
            <th className="pb-2 pr-4">Weakest Dimension</th>
            <th className="pb-2 text-center">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.units.map((u: any) => (
            <tr key={u.orgUnitId} className="hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium text-gray-800">{u.orgUnitName}</td>
              <td className="py-2 pr-4 text-gray-500 text-xs">{u.hospitalName ?? '—'}</td>
              <td className="py-2 pr-4 text-center text-gray-600">{u.responseCount}</td>
              <td className="py-2 pr-4 text-center">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBg(u.overallFavorable)}`}>
                  {u.overallFavorable}%
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-600">{u.lowestDimension ?? '—'}</td>
              <td className="py-2 text-center">
                <span className={`font-semibold text-xs ${scoreColor(u.lowestScore ?? 0)}`}>
                  {u.lowestScore != null ? `${u.lowestScore}%` : '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sentiment donut ───────────────────────────────────────────────────────────

const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#94a3b8', negative: '#ef4444' };

function SentimentDonut({ dist, total }: { dist: any; total: number }) {
  const data = [
    { name: 'Positive', value: dist.positive, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral',  value: dist.neutral,  color: SENTIMENT_COLORS.neutral  },
    { name: 'Negative', value: dist.negative, color: SENTIMENT_COLORS.negative },
  ].filter((d) => d.value > 0);

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v: any, name: any) => [`${v} (${pct(v)}%)`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-xs mt-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
            <span className="text-gray-600">{d.name} <strong>{pct(d.value)}%</strong></span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">{total} open-text responses analysed</p>
    </div>
  );
}

// ── Theme card ────────────────────────────────────────────────────────────────

function ThemeCard({ theme, count, negativeCount, quotes, maxCount }: any) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((count / maxCount) * 100);
  const negPct = count > 0 ? Math.round((negativeCount / count) * 100) : 0;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 text-sm">{theme}</span>
            {negPct >= 50 && (
              <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full">
                {negPct}% negative
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{count} mentions</span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {/* progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 mt-3 mb-2 font-medium uppercase tracking-wide">
            Sample comments
          </p>
          {quotes.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No quotes available</p>
          ) : (
            quotes.map((q: any, i: number) => (
              <div key={i} className="flex gap-2 items-start">
                <span className={`mt-0.5 shrink-0 text-xs px-1.5 py-0.5 rounded-full ${sentimentBadge(q.sentiment)}`}>
                  {q.sentiment}
                </span>
                <p className="text-sm text-gray-700 italic">"{q.text}"</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Root Cause Analysis panel ─────────────────────────────────────────────────

function RootCausePanel({ surveyId, orgUnits }: { surveyId: string; orgUnits: any[] }) {
  const [unitFilter, setUnitFilter] = useState('');

  const qs = new URLSearchParams();
  if (surveyId)  qs.set('surveyId',  surveyId);
  if (unitFilter) qs.set('orgUnitId', unitFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-sentiment', surveyId, unitFilter],
    queryFn: () => api.get(`/analytics/sentiment?${qs.toString()}`).then((r) => r.data),
  });

  const dist  = data?.sentimentDistribution ?? { positive: 0, neutral: 0, negative: 0 };
  const total = data?.totalTextResponses ?? 0;
  const themes: any[] = data?.themes ?? [];
  const maxCount = themes[0]?.count ?? 1;

  // Top 3 negative themes for the callout box
  const topNegative = [...themes]
    .sort((a, b) => b.negativeCount - a.negativeCount)
    .slice(0, 3);

  return (
    <div className="card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">Root Cause Analysis</h2>
          <p className="text-gray-500 text-sm mt-0.5">Themes and sentiment extracted from open-text comments</p>
        </div>
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        >
          <option value="">All departments</option>
          {orgUnits.map((u: any) => (
            <option key={u.orgUnitId} value={u.orgUnitId}>
              {u.hospitalName} › {u.orgUnitName}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-12 animate-pulse bg-gray-100 rounded-lg" />)}
        </div>
      ) : total === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No open-text responses found for this selection</p>
      ) : (
        <>
          {/* Sentiment + top issues row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Sentiment Distribution</p>
              <SentimentDonut dist={dist} total={total} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Top Concern Areas</p>
              <div className="space-y-2">
                {topNegative.map((t, i) => {
                  const negPct = t.count > 0 ? Math.round((t.negativeCount / t.count) * 100) : 0;
                  return (
                    <div key={t.theme} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                      <span className="text-lg font-bold text-red-300">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{t.theme}</p>
                        <p className="text-xs text-gray-500">{t.count} mentions · {negPct}% negative sentiment</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Theme breakdown */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              All Themes — click to expand comments
            </p>
            <div className="space-y-2">
              {themes.map((t: any) => (
                <ThemeCard
                  key={t.theme}
                  theme={t.theme}
                  count={t.count}
                  negativeCount={t.negativeCount}
                  quotes={t.quotes}
                  maxCount={maxCount}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [surveyId, setSurveyId] = useState<string>('');

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys-list'],
    queryFn: () => api.get('/surveys').then((r) => {
      const d = r.data;
      return Array.isArray(d) ? d : (d.data ?? d.surveys ?? []);
    }),
  });

  const qs = surveyId ? `?surveyId=${surveyId}` : '';

  const { data: participation = [], isLoading: loadingP } = useQuery({
    queryKey: ['analytics-participation', surveyId],
    queryFn: () => api.get(`/analytics/participation${qs}`).then((r) => r.data),
  });

  const { data: trends, isLoading: loadingT } = useQuery({
    queryKey: ['analytics-trends', surveyId],
    queryFn: () => api.get(`/analytics/trends${qs}`).then((r) => r.data),
  });

  const { data: lowUnits, isLoading: loadingL } = useQuery({
    queryKey: ['analytics-low-units', surveyId],
    queryFn: () => api.get(`/analytics/low-units${qs}`).then((r) => r.data),
  });

  return (
    <div className="space-y-8">
      {/* Header + Survey Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Engagement scores, participation, and root cause analysis</p>
        </div>
        <div className="flex flex-col gap-1 min-w-[280px]">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Survey</label>
          <select
            value={surveyId}
            onChange={(e) => setSurveyId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All surveys</option>
            {surveys.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.title}{s.status ? ` (${s.status})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Participation + Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loadingP ? <div className="card h-40 animate-pulse bg-gray-50" /> : <ParticipationChart data={participation} />}
        {loadingT ? <div className="card h-40 animate-pulse bg-gray-50" /> : <TrendsChart data={trends} />}
      </div>

      {/* Low-Performing Units */}
      {loadingL
        ? <div className="card h-32 animate-pulse bg-gray-50" />
        : <LowUnitsTable data={lowUnits} />
      }

      {/* Root Cause Analysis */}
      <RootCausePanel surveyId={surveyId} orgUnits={participation} />
    </div>
  );
}
