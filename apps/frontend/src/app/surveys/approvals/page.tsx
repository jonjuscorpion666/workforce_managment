'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, Clock, Building2, Target, User,
  ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import SurveyPreviewModal from '@/components/surveys/SurveyPreviewModal';

interface Question {
  id: string;
  text: string;
  helpText?: string;
  type: string;
  isRequired?: boolean;
  options?: string[];
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  objective?: string;
  type: string;
  isAnonymous?: boolean;
  targetScope: string;
  targetOrgUnitIds: string[];
  createdById: string;
  createdByRole: string;
  approvalStatus: string;
  rejectionReason?: string;
  createdAt: string;
  questions: Question[];
}

function ApprovalStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:      'bg-amber-100 text-amber-700',
    APPROVED:     'bg-green-100 text-green-700',
    REJECTED:     'bg-red-100 text-red-700',
    NOT_REQUIRED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function SurveyCard({ survey, onApprove, onReject, onPreview, isActing }: {
  survey: Survey;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onPreview: () => void;
  isActing: boolean;
}) {
  const [expanded, setExpanded]     = useState(false);
  const [rejecting, setRejecting]   = useState(false);
  const [reason, setReason]         = useState('');

  function submitReject() {
    if (!reason.trim()) return;
    onReject(reason.trim());
    setRejecting(false);
    setReason('');
  }

  const scopeLabel = survey.targetScope === 'SYSTEM' ? 'System-Wide'
    : `${survey.targetOrgUnitIds?.length ?? 0} Hospital${(survey.targetOrgUnitIds?.length ?? 0) !== 1 ? 's' : ''}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <ApprovalStatusBadge status={survey.approvalStatus} />
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{survey.type}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Building2 className="w-3 h-3" />{scopeLabel}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{survey.title}</h3>
            {survey.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{survey.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{survey.questions?.length ?? 0}Q</span>
            <button
              onClick={onPreview}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              title="Preview survey as staff"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button onClick={() => setExpanded((v) => !v)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><User className="w-3 h-3" /> CNO · {survey.createdByRole}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Submitted {formatDate(survey.createdAt)}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-4 space-y-3">
          {survey.objective && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-1">
                <Target className="w-3.5 h-3.5" /> Objective
              </p>
              <p className="text-sm text-blue-800">{survey.objective}</p>
            </div>
          )}
          {survey.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Previous rejection reason</p>
              <p className="text-sm text-red-700">{survey.rejectionReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Action row — only shown for PENDING */}
      {survey.approvalStatus === 'PENDING' && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          {!rejecting ? (
            <>
              <button
                onClick={() => setRejecting(true)}
                disabled={isActing}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Request Revisions
              </button>
              <button
                onClick={onPreview}
                disabled={isActing}
                className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                Preview & Approve
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <input
                className="input text-sm flex-1"
                placeholder="Reason for requesting revisions..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitReject()}
                autoFocus
              />
              <button onClick={submitReject} disabled={!reason.trim() || isActing}
                className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
                <XCircle className="w-4 h-4" /> Send
              </button>
              <button onClick={() => { setRejecting(false); setReason(''); }} className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [previewSurvey, setPreviewSurvey] = useState<Survey | null>(null);

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ['surveys', 'pending'],
    queryFn: () => api.get('/surveys/pending-approvals').then((r) => r.data),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/surveys/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Survey approved');
      setPreviewSurvey(null);
    },
    onError: () => toast.error('Failed to approve survey'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/surveys/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['surveys'] }); toast.success('Revisions requested'); },
    onError: () => toast.error('Failed to send revision request'),
  });

  const pending  = surveys.filter((s) => s.approvalStatus === 'PENDING');
  const reviewed = surveys.filter((s) => s.approvalStatus !== 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Survey Approvals</h1>
          <p className="text-gray-500 mt-1">Review and approve CNO-submitted hospital surveys</p>
        </div>
        {pending.length > 0 && (
          <span className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-full">
            <Clock className="w-4 h-4" /> {pending.length} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <>
          {/* Pending */}
          {pending.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No surveys are waiting for your review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((s) => (
                <SurveyCard
                  key={s.id}
                  survey={s}
                  isActing={approveMut.isPending || rejectMut.isPending}
                  onApprove={() => approveMut.mutate(s.id)}
                  onReject={(reason) => rejectMut.mutate({ id: s.id, reason })}
                  onPreview={() => setPreviewSurvey(s)}
                />
              ))}
            </div>
          )}

          {/* Recently reviewed */}
          {reviewed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recently Reviewed</h2>
              <div className="space-y-3">
                {reviewed.slice(0, 5).map((s) => (
                  <SurveyCard
                    key={s.id}
                    survey={s}
                    isActing={false}
                    onApprove={() => {}}
                    onReject={() => {}}
                    onPreview={() => setPreviewSurvey(s)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview & approve modal */}
      {previewSurvey && (
        <SurveyPreviewModal
          title={previewSurvey.title}
          description={previewSurvey.description}
          objective={previewSurvey.objective}
          type={previewSurvey.type}
          isAnonymous={previewSurvey.isAnonymous}
          questions={previewSurvey.questions ?? []}
          allowEmptyConfirm
          onClose={() => setPreviewSurvey(null)}
          confirmLabel={previewSurvey.approvalStatus === 'PENDING' ? 'Confirm & Approve' : 'Close Preview'}
          confirmIcon="publish"
          isPending={approveMut.isPending}
          onConfirm={() => {
            if (previewSurvey.approvalStatus === 'PENDING') approveMut.mutate(previewSurvey.id);
            else setPreviewSurvey(null);
          }}
        />
      )}
    </div>
  );
}
