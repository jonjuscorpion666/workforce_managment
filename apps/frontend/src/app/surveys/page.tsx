'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Link2, Check, Clock, CheckCircle2, XCircle, ShieldCheck, BookmarkPlus, Pencil } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import BulkDeleteBar from '@/components/BulkDeleteBar';

function ApprovalBadge({ status }: { status?: string }) {
  if (!status || status === 'NOT_REQUIRED') return null;
  const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    PENDING:  { label: 'Pending Approval', cls: 'bg-amber-100 text-amber-700', Icon: Clock },
    APPROVED: { label: 'Approved',         cls: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
    REJECTED: { label: 'Revisions Needed', cls: 'bg-red-100 text-red-700',    Icon: XCircle },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function SurveysPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { hasRole } = useAuth();
  const isSVP = hasRole('SVP') || hasRole('SUPER_ADMIN');
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const qc = useQueryClient();
  const toast = useToast();

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => prev.size === ids.length ? new Set() : new Set(ids));
  }

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => api.get('/surveys').then((r) => r.data),
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => api.post('/surveys/bulk-delete', { ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['surveys'] }); setSelectedIds(new Set()); toast.success('Surveys deleted'); },
    onError: () => toast.error('Failed to delete surveys'),
  });

  const saveAsTemplate = useMutation({
    mutationFn: (surveyId: string) => api.post(`/surveys/${surveyId}/save-as-template`).then((r) => r.data),
    onSuccess: (_, surveyId) => {
      qc.invalidateQueries({ queryKey: ['survey-templates'] });
      setSavedTemplateId(surveyId);
      setTimeout(() => setSavedTemplateId(null), 2500);
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['surveys', 'pending-count'],
    queryFn: () => api.get('/surveys/pending-approvals').then((r) => r.data.length),
    enabled: isSVP,
  });

  function copyLink(surveyId: string) {
    const url = `${window.location.origin}/survey/${surveyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(surveyId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
          <p className="text-gray-500 mt-1">Manage workforce pulse surveys</p>
        </div>
        <div className="flex items-center gap-3">
          {/* SVP: approval queue link with badge */}
          {isSVP && (
            <Link
              href="/surveys/approvals"
              className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Approvals
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
          <Link href="/surveys/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Survey
          </Link>
        </div>
      </div>

      {isSuperAdmin && (
        <BulkDeleteBar
          count={selectedIds.size}
          noun="survey"
          isPending={bulkDelete.isPending}
          onClear={() => setSelectedIds(new Set())}
          onDelete={() => bulkDelete.mutate(Array.from(selectedIds))}
        />
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {isSuperAdmin && (
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      className="accent-red-600"
                      checked={surveys.length > 0 && selectedIds.size === surveys.length}
                      onChange={() => toggleSelectAll(surveys.map((s: any) => s.id))}
                    />
                  </th>
                )}
                {['Title', 'Type', 'Status', 'Approval', 'Target', 'Anonymous', 'Opens', 'Closes', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {surveys.map((s: any) => (
                <tr key={s.id} className={`hover:bg-gray-50 cursor-pointer ${selectedIds.has(s.id) ? 'bg-red-50' : ''}`}>
                  {isSuperAdmin && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="accent-red-600"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div>
                      {s.title}
                      {s.rejectionReason && (
                        <p className="text-xs text-red-500 mt-0.5 truncate max-w-[200px]" title={s.rejectionReason}>
                          ↩ {s.rejectionReason}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.type}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getStatusColor(s.status)}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ApprovalBadge status={s.approvalStatus} />
                  </td>
                  <td className="px-4 py-3">
                    {s.targetScope === 'SYSTEM' || !s.targetScope ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">System-Wide</span>
                    ) : s.targetScope === 'HOSPITAL' ? (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {s.targetOrgUnitIds?.length ?? 0} Hospital{s.targetOrgUnitIds?.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Unit</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.isAnonymous ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.opensAt ? formatDate(s.opensAt) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.closesAt ? formatDate(s.closesAt) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.status === 'DRAFT' && (
                        <Link
                          href={`/surveys/${s.id}/edit`}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Link>
                      )}
                      {s.status === 'ACTIVE' && (
                        <button
                          onClick={() => copyLink(s.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {copiedId === s.id
                            ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</>
                            : <><Link2 className="w-3.5 h-3.5" /> Copy Link</>
                          }
                        </button>
                      )}
                      <button
                        onClick={() => saveAsTemplate.mutate(s.id)}
                        disabled={saveAsTemplate.isPending}
                        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium disabled:opacity-40"
                        title="Save as template"
                      >
                        {savedTemplateId === s.id
                          ? <><Check className="w-3.5 h-3.5 text-green-500" /> Saved!</>
                          : <><BookmarkPlus className="w-3.5 h-3.5" /> Template</>
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {surveys.length === 0 && (
                <tr><td colSpan={isSuperAdmin ? 10 : 9} className="px-4 py-8 text-center text-gray-400">No surveys yet</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
