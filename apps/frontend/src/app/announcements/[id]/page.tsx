'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckSquare, Check, Clock, Globe, Building2,
  LayoutGrid, Bell, AlertTriangle, Tag, Calendar, Users,
  BarChart2, Trash2, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border border-red-200',
  HIGH:     'bg-orange-100 text-orange-700 border border-orange-200',
  MEDIUM:   'bg-blue-100 text-blue-700',
  LOW:      'bg-gray-100 text-gray-500',
};

const PRIORITY_BAR: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-400',
  MEDIUM:   'bg-blue-400',
  LOW:      'bg-gray-300',
};

const SCOPE_ICON: Record<string, React.ElementType> = {
  SYSTEM: Globe, HOSPITAL: Building2, DEPARTMENT: LayoutGrid,
  UNIT: LayoutGrid, ROLE: Bell, COMBINATION: Users,
};

function typeLabel(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const { hasRole } = useAuth();
  const toast   = useToast();

  const isLeadership = hasRole('SVP') || hasRole('SUPER_ADMIN') || hasRole('CNO') || hasRole('DIRECTOR');

  const { data: ann, isLoading } = useQuery({
    queryKey: ['announcement', id],
    queryFn: () => api.get(`/announcements/${id}`).then((r) => r.data),
  });

  const { data: metrics } = useQuery({
    queryKey: ['announcement-metrics', id],
    queryFn: () => api.get(`/announcements/${id}/metrics`).then((r) => r.data),
    enabled: isLeadership && !!id,
  });

  const markRead = useMutation({
    mutationFn: () => api.post(`/announcements/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements-feed'] }),
  });

  const acknowledge = useMutation({
    mutationFn: () => api.post(`/announcements/${id}/acknowledge`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcement', id] });
      qc.invalidateQueries({ queryKey: ['announcements-feed'] });
      toast.success('Acknowledged');
    },
    onError: () => toast.error('Failed to acknowledge'),
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/announcements/${id}/cancel`),
    onSuccess: () => { toast.success('Announcement cancelled'); router.push('/announcements'); },
    onError: () => toast.error('Failed to cancel announcement'),
  });

  const archive = useMutation({
    mutationFn: () => api.post(`/announcements/${id}/archive`),
    onSuccess: () => { toast.success('Announcement archived'); router.push('/announcements'); },
    onError: () => toast.error('Failed to archive announcement'),
  });

  // Mark read once when the announcement first loads and isn't already read
  useEffect(() => {
    if (ann && !ann.isRead) {
      markRead.mutate();
    }
  }, [ann?.id]); // eslint-disable-line

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-1/3" />
        <div className="card h-48 animate-pulse" />
      </div>
    );
  }

  if (!ann) {
    return (
      <div className="max-w-2xl mx-auto text-center pt-16 space-y-4">
        <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto" />
        <p className="text-gray-500">Announcement not found</p>
        <Link href="/announcements" className="btn-secondary text-sm inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
    );
  }

  const ScopeIcon = SCOPE_ICON[ann.audienceMode] ?? Globe;
  const isCritical = ann.priority === 'CRITICAL';
  const needsAck   = ann.requiresAcknowledgement && !ann.isAcknowledged;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Back */}
      <Link href="/announcements" className="flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm w-fit">
        <ArrowLeft className="w-4 h-4" /> Announcements
      </Link>

      {/* Priority bar */}
      <div className={`h-1.5 rounded-full ${PRIORITY_BAR[ann.priority] ?? 'bg-gray-200'}`} />

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[ann.priority] ?? 'bg-gray-100'}`}>
            {ann.priority}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{typeLabel(ann.type)}</span>
          {ann.isPinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pinned</span>}
          <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
            <ScopeIcon className="w-3 h-3" /> {ann.audienceMode.toLowerCase()}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{ann.title}</h1>

        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Published {formatDate(ann.publishedAt ?? ann.createdAt)}
          </span>
          {ann.expireAt && (
            <span className="flex items-center gap-1 text-amber-500">
              <Clock className="w-3 h-3" /> Expires {formatDate(ann.expireAt)}
            </span>
          )}
        </div>
      </div>

      {/* Critical acknowledgement banner */}
      {needsAck && isCritical && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Action required — Critical announcement</p>
            <p className="text-xs text-red-600 mt-0.5">
              You must acknowledge this announcement.
              {ann.acknowledgementDueAt && ` Due by ${formatDate(ann.acknowledgementDueAt)}.`}
            </p>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="card">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{ann.body}</p>
      </div>

      {/* Tags */}
      {ann.tags?.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-gray-400" />
          {ann.tags.map((tag: string) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {/* Acknowledgement section */}
      {ann.requiresAcknowledgement && (
        <div className={`rounded-xl p-5 border ${ann.isAcknowledged ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          {ann.isAcknowledged ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">You acknowledged this announcement</p>
                {ann.acknowledgedAt && (
                  <p className="text-xs text-green-600 mt-0.5">Acknowledged on {formatDate(ann.acknowledgedAt)}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckSquare className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Acknowledgement required</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Clicking below confirms you have read and understood this announcement.
                  {ann.acknowledgementDueAt && ` Due by ${formatDate(ann.acknowledgementDueAt)}.`}
                </p>
                <button
                  onClick={() => acknowledge.mutate()}
                  disabled={acknowledge.isPending}
                  className="mt-3 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                  <Check className="w-4 h-4" />
                  {acknowledge.isPending ? 'Submitting...' : 'I acknowledge this announcement'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leadership metrics */}
      {isLeadership && metrics && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-800 text-sm">Communication Metrics</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Recipients',     value: metrics.totalRecipients },
              { label: 'Read Rate',      value: `${metrics.readRate}%` },
              { label: 'Ack Rate',       value: `${metrics.ackRate}%` },
              { label: 'Pending Ack',    value: metrics.pendingAcknowledgements },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Management actions (leadership) */}
      {isLeadership && ann.status !== 'CANCELLED' && ann.status !== 'ARCHIVED' && (
        <div className="flex gap-3 pt-2">
          {ann.status === 'PUBLISHED' && (
            <button
              onClick={() => { if (confirm('Cancel this announcement?')) cancel.mutate(); }}
              disabled={cancel.isPending}
              className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-800 border border-rose-200 hover:border-rose-300 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
              <XCircle className="w-4 h-4" /> Cancel announcement
            </button>
          )}
          {['EXPIRED', 'CANCELLED'].includes(ann.status) && (
            <button
              onClick={() => { if (confirm('Archive this announcement?')) archive.mutate(); }}
              disabled={archive.isPending}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Archive
            </button>
          )}
        </div>
      )}

    </div>
  );
}
