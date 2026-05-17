'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PfHeader from '@/components/patient-feedback/PfHeader';

interface FeedbackRow {
  id: string;
  submittedAt: string;
  severity: 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL';
  channel: string;
  rating: number | null;
  comment: string | null;
  locationMismatch: boolean;
  locationDisplay: string;
  answers: { questionId: string; label: string; answer: string | number }[];
}

const SEV: Record<string, string> = {
  GREEN: 'bg-green-100 text-green-700',
  YELLOW: 'bg-amber-100 text-amber-700',
  RED: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-red-600 text-white',
};

interface OrgUnit { id: string; name: string; level: string }

export default function ResponsesPage() {
  const toast = useToast();
  const [severity, setSeverity] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/org/units').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const hospitals = orgUnits
    .filter((u) => u.level === 'HOSPITAL')
    .sort((a, b) => a.name.localeCompare(b.name));

  const params = {
    ...(severity ? { severity } : {}),
    ...(hospitalId ? { hospitalId } : {}),
  };

  const { data: rows = [], isLoading } = useQuery<FeedbackRow[]>({
    queryKey: ['fb-responses', severity, hospitalId],
    queryFn: () => api.get('/patient-feedback/responses', { params }).then((r) => r.data),
  });

  async function exportCsv() {
    setDownloading(true);
    try {
      const res = await api.get('/patient-feedback/responses/export', {
        params,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <PfHeader
        title="Responses"
        subtitle="Every submitted feedback, including positive — scoped to your wards."
        actions={
          <button
            onClick={exportCsv}
            disabled={downloading || rows.length === 0}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> {downloading ? 'Exporting…' : 'Export CSV'}
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
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
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All severities</option>
          {['GREEN', 'YELLOW', 'RED', 'CRITICAL'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm table-scroll">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Comment</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No feedback yet.</td></tr>
            )}
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="border-t border-gray-50 cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(r.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {r.locationDisplay}
                    {r.locationMismatch && (
                      <span className="ml-2 text-xs text-amber-600">(location disputed)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEV[r.severity]}`}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.rating != null ? `${r.rating}/5` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.channel}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-gray-600">{r.comment ?? '—'}</td>
                </tr>
                {expanded === r.id && (
                  <tr className="bg-gray-50/60">
                    <td colSpan={6} className="px-6 py-4">
                      <ul className="space-y-1.5 text-sm max-w-xl">
                        {r.answers.map((a) => (
                          <li key={a.questionId} className="flex justify-between gap-4">
                            <span className="text-gray-600">{a.label}</span>
                            <span className="font-medium text-gray-900">{String(a.answer)}</span>
                          </li>
                        ))}
                      </ul>
                      {r.comment && (
                        <p className="mt-3 text-sm text-gray-700 bg-white rounded-lg p-3 italic">
                          “{r.comment}”
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
