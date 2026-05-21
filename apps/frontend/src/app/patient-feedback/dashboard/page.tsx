'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { AlertOctagon, Clock, MessageSquare, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import PfHeader from '@/components/patient-feedback/PfHeader';
import { SEVERITY } from '@/components/patient-feedback/severity';

type Period = 'daily' | 'monthly' | 'quarterly';
const PERIOD_LABELS: Record<Period, string> = {
  daily: 'last 14 days',
  monthly: 'last 12 months',
  quarterly: 'last 8 quarters',
};

interface Dashboard {
  total: number;
  bySeverity: { GREEN: number; YELLOW: number; RED: number; CRITICAL: number };
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  openCritical: number;
  openRed: number;
  openYellow: number;
  openTotal: number;
  slaBreached: number;
  pendingOver24h: number;
  avgClosureHours: number | null;
  avgResponseHours: number | null;
  mostCommonIssue: string | null;
  hospitalWithMostComplaints: string | null;
  bestHospital: string | null;
  hospitals: { hospitalId: string; name: string; total: number; positive: number; neutral: number; negative: number; positivePct: number }[];
  period: Period;
  trend: { period: string; total: number; positive: number; neutral: number; negative: number }[];
  perHospital: {
    hospitalId: string;
    name: string;
    series: { period: string; total: number; positive: number; neutral: number; negative: number }[];
  }[];
}

const SEV_COLORS = {
  GREEN: SEVERITY.GREEN.hex,
  YELLOW: SEVERITY.YELLOW.hex,
  RED: SEVERITY.RED.hex,
  CRITICAL: SEVERITY.CRITICAL.hex,
};

function Stat({
  label, value, accent, small, urgent, icon: Icon,
}: {
  label: string; value: string | number; accent?: string; small?: boolean;
  urgent?: boolean; icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={`rounded-2xl border shadow-sm p-5 ${
        urgent ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
      }`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </p>
      <p className={`${small ? 'text-base leading-snug' : 'text-2xl'} font-bold mt-1 ${accent ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-6 mb-2">
      {children}
    </p>
  );
}

interface OrgUnit { id: string; name: string; level: string }

export default function FeedbackDashboard() {
  const [hospitalId, setHospitalId] = useState('');
  const [period, setPeriod] = useState<Period>('monthly');

  // Only org-wide managers (SVP/SUPER_ADMIN) pick a hospital. CNO is locked to
  // their hospital; Director/Manager to their units — both scoped server-side.
  const { data: scope } = useQuery<{ all: boolean }>({
    queryKey: ['fb-scope'],
    queryFn: () => api.get('/patient-feedback/scope').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const canPickHospital = !!scope?.all;

  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/org/units').then((r) => r.data),
    staleTime: 5 * 60_000,
    enabled: canPickHospital, // others have nothing to pick — skip the lookup
  });
  const hospitals = orgUnits
    .filter((u) => u.level === 'HOSPITAL')
    .sort((a, b) => a.name.localeCompare(b.name));

  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['fb-dashboard', hospitalId, period, canPickHospital],
    queryFn: () =>
      api
        .get('/patient-feedback/dashboard', {
          params: { period, ...(hospitalId && canPickHospital ? { hospitalId } : {}) },
        })
        .then((r) => r.data),
  });

  if (isLoading || !data) {
    return <p className="text-gray-400 py-12 text-center">Loading…</p>;
  }

  const pie = [
    { name: 'Green', value: data.bySeverity.GREEN, key: 'GREEN' as const },
    { name: 'Yellow', value: data.bySeverity.YELLOW, key: 'YELLOW' as const },
    { name: 'Red', value: data.bySeverity.RED, key: 'RED' as const },
    { name: 'Critical', value: data.bySeverity.CRITICAL, key: 'CRITICAL' as const },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <PfHeader
        title="Dashboard"
        subtitle="Inpatient nursing-care feedback trends."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Period segmented control */}
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
              {(['daily', 'monthly', 'quarterly'] as Period[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all',
                    period === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            {canPickHospital && (
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">All hospitals</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            )}
          </div>
        }
      />

      <SectionLabel>Volume</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Total feedback" value={data.total} />
        <Stat label="Positive" value={`${data.positivePct}%`} accent="text-green-600" />
        <Stat label="Neutral" value={`${data.neutralPct}%`} accent="text-amber-500" />
        <Stat label="Negative" value={`${data.negativePct}%`} accent="text-red-600" />
        <Stat label="Open total" value={data.openTotal} />
      </div>

      <SectionLabel>Action needed</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Open critical"
          value={data.openCritical}
          icon={AlertOctagon}
          urgent={data.openCritical > 0}
          accent={data.openCritical ? 'text-red-700' : undefined}
        />
        <Stat label="Open red alerts" value={data.openRed} accent="text-red-600" />
        <Stat label="Open yellow" value={data.openYellow} accent="text-amber-600" />
        <Stat
          label="SLA breached"
          value={data.slaBreached}
          icon={Clock}
          urgent={data.slaBreached > 0}
          accent={data.slaBreached ? 'text-red-600' : undefined}
        />
        <Stat
          label="Pending > 24h"
          value={data.pendingOver24h}
          icon={Clock}
          accent={data.pendingOver24h ? 'text-amber-600' : undefined}
        />
        <Stat
          label="Most common issue"
          value={data.mostCommonIssue ?? '—'}
          icon={MessageSquare}
          small
        />
      </div>

      <SectionLabel>Performance</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Avg response"
          value={data.avgResponseHours != null ? `${data.avgResponseHours}h` : '—'}
          icon={TrendingUp}
        />
        <Stat
          label="Avg closure"
          value={data.avgClosureHours != null ? `${data.avgClosureHours}h` : '—'}
          icon={TrendingUp}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Severity mix</h2>
          {data.total === 0 ? (
            <p className="text-gray-400 text-sm py-12 text-center">No feedback yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" outerRadius={90} label>
                  {pie.map((p) => (
                    <Cell key={p.key} fill={SEV_COLORS[p.key]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Feedback by hospital</h2>
          {data.hospitals.length === 0 ? (
            <p className="text-gray-400 text-sm py-12 text-center">No feedback yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.hospitals} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="negative" name="Negative" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-4">
        <h2 className="font-semibold text-gray-800 mb-3">
          Volume — {PERIOD_LABELS[data.period]}
        </h2>
        {data.total === 0 ? (
          <p className="text-gray-400 text-sm py-12 text-center">No feedback yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.trend} margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="positive" name="Positive" stackId="x" fill={SEVERITY.GREEN.hex} radius={[0, 0, 0, 0]} />
              <Bar dataKey="neutral" name="Neutral" stackId="x" fill={SEVERITY.YELLOW.hex} radius={[0, 0, 0, 0]} />
              <Bar dataKey="negative" name="Negative" stackId="x" fill={SEVERITY.RED.hex} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {canPickHospital && data.perHospital && data.perHospital.length > 0 && (
        <PerHospitalMatrix
          perHospital={data.perHospital}
          buckets={data.trend.slice(-6).map((b) => b.period)}
        />
      )}

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <Stat
          label="Hospital with most complaints"
          value={data.hospitalWithMostComplaints ?? '—'}
          accent="text-red-600"
        />
        <Stat label="Best-rated hospital" value={data.bestHospital ?? '—'} accent="text-green-600" />
      </div>
    </div>
  );
}

function PerHospitalMatrix({
  perHospital, buckets,
}: {
  perHospital: Dashboard['perHospital'];
  buckets: string[];
}) {
  // Sort hospitals by total recent negatives so the worst surfaces first.
  const rows = [...perHospital]
    .map((h) => {
      const map = new Map(h.series.map((s) => [s.period, s] as [string, typeof s]));
      const cells = buckets.map((b) => map.get(b) ?? { period: b, total: 0, positive: 0, neutral: 0, negative: 0 });
      const recentNeg = cells.reduce((s, c) => s + c.negative, 0);
      return { ...h, cells, recentNeg };
    })
    .sort((a, b) => b.recentNeg - a.recentNeg);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-4 table-scroll">
      <div className="p-5 pb-2">
        <h2 className="font-semibold text-gray-800">Per-hospital — last {buckets.length} periods</h2>
        <p className="text-xs text-gray-400 mt-0.5">Each cell shows positive / neutral / negative.</p>
      </div>
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2.5">Hospital</th>
            {buckets.map((b) => (
              <th key={b} className="px-3 py-2.5 text-center font-medium">{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.hospitalId} className="border-t border-gray-50">
              <td className="px-4 py-2.5 font-medium text-gray-800">{r.name}</td>
              {r.cells.map((c) => {
                const tint = c.negative > 0 && c.negative >= c.positive ? 'bg-red-50 text-red-700' : c.total > 0 ? 'text-gray-700' : 'text-gray-300';
                return (
                  <td key={c.period} className={`px-3 py-2.5 text-center text-xs font-medium ${tint}`}>
                    {c.total === 0 ? '—' : `${c.positive} / ${c.neutral} / ${c.negative}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
