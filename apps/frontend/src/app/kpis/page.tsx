'use client';

import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import api from '@/lib/api';

export default function KPIsPage() {
  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => api.get('/kpis').then((r) => r.data),
  });

  const { data: trends = [] } = useQuery({
    queryKey: ['kpis-trends'],
    queryFn: () => api.get('/kpis/trends').then((r) => r.data),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KPIs & Performance</h1>
        <p className="text-gray-500 mt-1">Engagement, participation, and resolution metrics</p>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">KPI Trends</h2>
        {(trends as any[]).length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg" stroke="#3b82f6" name="Average Score" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm">No KPI history yet</p>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All KPIs</h2>
        </div>
        {isLoading ? <p className="p-6 text-gray-400">Loading...</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Dimension', 'Current', 'Target', 'Baseline', 'Period'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(kpis as any[]).map((k) => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{k.name}</td>
                  <td className="px-4 py-3 text-gray-500">{k.dimension}</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">{k.currentValue}{k.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{k.targetValue}{k.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{k.baselineValue}{k.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{k.period}</td>
                </tr>
              ))}
              {(kpis as any[]).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No KPIs recorded</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
