'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import Link from 'next/link';
import api from '@/lib/api';

interface Dashboard {
  total: number;
  bySeverity: { GREEN: number; YELLOW: number; RED: number };
  positivePct: number;
  negativePct: number;
  openRed: number;
  openYellow: number;
  openTotal: number;
  slaBreached: number;
  avgClosureHours: number | null;
  wardWithMostComplaints: string | null;
  bestWard: string | null;
  wards: { ward: string; total: number; negative: number; positivePct: number }[];
}

const SEV_COLORS = { GREEN: '#16a34a', YELLOW: '#f59e0b', RED: '#dc2626' };

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

export default function FeedbackDashboard() {
  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['fb-dashboard'],
    queryFn: () => api.get('/patient-feedback/dashboard').then((r) => r.data),
  });

  if (isLoading || !data) {
    return <p className="text-gray-400 py-12 text-center">Loading…</p>;
  }

  const pie = [
    { name: 'Green', value: data.bySeverity.GREEN, key: 'GREEN' as const },
    { name: 'Yellow', value: data.bySeverity.YELLOW, key: 'YELLOW' as const },
    { name: 'Red', value: data.bySeverity.RED, key: 'RED' as const },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Feedback — Dashboard</h1>
          <p className="text-sm text-gray-500">Inpatient nursing-care feedback trends.</p>
        </div>
        <Link
          href="/patient-feedback/tickets"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          View tickets
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Total feedback" value={data.total} />
        <Stat label="Positive" value={`${data.positivePct}%`} accent="text-green-600" />
        <Stat label="Negative" value={`${data.negativePct}%`} accent="text-amber-600" />
        <Stat label="Open red alerts" value={data.openRed} accent="text-red-600" />
        <Stat label="Open yellow" value={data.openYellow} accent="text-amber-600" />
        <Stat label="Open total" value={data.openTotal} />
        <Stat label="SLA breached" value={data.slaBreached} accent={data.slaBreached ? 'text-red-600' : undefined} />
        <Stat
          label="Avg closure"
          value={data.avgClosureHours != null ? `${data.avgClosureHours}h` : '—'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
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
          <h2 className="font-semibold text-gray-800 mb-3">Feedback by ward</h2>
          {data.wards.length === 0 ? (
            <p className="text-gray-400 text-sm py-12 text-center">No feedback yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.wards} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
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

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <Stat
          label="Ward with most complaints"
          value={data.wardWithMostComplaints ?? '—'}
          accent="text-red-600"
        />
        <Stat label="Best-rated ward" value={data.bestWard ?? '—'} accent="text-green-600" />
      </div>
    </div>
  );
}
