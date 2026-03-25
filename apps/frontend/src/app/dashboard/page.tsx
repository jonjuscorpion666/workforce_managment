'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckSquare, ClipboardList, ArrowUpCircle } from 'lucide-react';
import api from '@/lib/api';

interface DashboardMetrics {
  metrics: {
    openIssues: number;
    activeSurveys: number;
    overdueTasks: number;
    blockedTasks: number;
  };
}

function MetricCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: any; color: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  const { data: stuck } = useQuery({
    queryKey: ['dashboard-stuck'],
    queryFn: () => api.get('/dashboard/stuck').then((r) => r.data),
  });

  if (isLoading) return <div className="text-gray-400">Loading dashboard...</div>;

  const m = data?.metrics;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Workforce engagement overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Open Issues"     value={m?.openIssues ?? 0}    icon={AlertTriangle} color="bg-red-500" />
        <MetricCard label="Active Surveys"  value={m?.activeSurveys ?? 0} icon={ClipboardList}  color="bg-blue-500" />
        <MetricCard label="Overdue Tasks"   value={m?.overdueTasks ?? 0}  icon={CheckSquare}   color="bg-orange-500" />
        <MetricCard label="Blocked Tasks"   value={m?.blockedTasks ?? 0}  icon={ArrowUpCircle} color="bg-yellow-500" />
      </div>

      {stuck && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Blocked Issues</h2>
            {stuck.blockedIssues?.length === 0 ? (
              <p className="text-gray-400 text-sm">No blocked issues</p>
            ) : (
              <ul className="space-y-2">
                {stuck.blockedIssues?.map((issue: any) => (
                  <li key={issue.id} className="flex items-center gap-2 text-sm">
                    <span className="badge bg-red-100 text-red-700">{issue.severity}</span>
                    <span className="truncate">{issue.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Overdue Tasks</h2>
            {stuck.overdueTasks?.length === 0 ? (
              <p className="text-gray-400 text-sm">No overdue tasks</p>
            ) : (
              <ul className="space-y-2">
                {stuck.overdueTasks?.map((task: any) => (
                  <li key={task.id} className="text-sm text-gray-700 truncate">{task.title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
