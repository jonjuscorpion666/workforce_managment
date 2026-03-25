'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function MeetingsPage() {
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => api.get('/meetings').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500 mt-1">Pre/post survey meeting logs and notes</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Schedule Meeting
        </button>
      </div>
      {isLoading ? <p className="text-gray-400">Loading...</p> : (
        <div className="grid gap-4">
          {(meetings as any[]).map((m) => (
            <div key={m.id} className="card flex items-start gap-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{m.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{m.type} · {formatDate(m.scheduledAt)}</p>
                {m.notes?.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">{m.notes.length} note(s)</p>
                )}
              </div>
              <span className="text-xs text-gray-400">{m.location || 'Virtual'}</span>
            </div>
          ))}
          {(meetings as any[]).length === 0 && (
            <p className="text-gray-400 text-sm">No meetings scheduled</p>
          )}
        </div>
      )}
    </div>
  );
}
