'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, getStatusColor } from '@/lib/utils';
import api from '@/lib/api';

export default function EscalationsPage() {
  const qc = useQueryClient();
  const { data: escalations = [], isLoading } = useQuery({
    queryKey: ['escalations'],
    queryFn: () => api.get('/escalations').then((r) => r.data),
  });

  const ack = useMutation({
    mutationFn: (id: string) => api.patch(`/escalations/${id}/acknowledge`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escalations'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Escalations</h1>
        <p className="text-gray-500 mt-1">Overdue and inactivity escalation tracking</p>
      </div>
      {isLoading ? <p className="text-gray-400">Loading...</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Entity', 'Reason', 'Level', 'Status', 'Escalated To', 'Date', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(escalations as any[]).map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{e.entityType}/{e.entityId?.slice(0, 8)}…</td>
                  <td className="px-4 py-3"><span className="badge bg-red-100 text-red-700">{e.reason}</span></td>
                  <td className="px-4 py-3 text-gray-500">L{e.level}</td>
                  <td className="px-4 py-3"><span className={`badge ${getStatusColor(e.status)}`}>{e.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{e.escalatedToId?.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(e.createdAt)}</td>
                  <td className="px-4 py-3">
                    {e.status === 'PENDING' && (
                      <button onClick={() => ack.mutate(e.id)} className="text-brand-600 hover:underline text-xs">
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(escalations as any[]).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No escalations</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
