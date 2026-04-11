'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone, Plus, Check, Clock, Globe, Building2, LayoutGrid,
  AlertTriangle, Info, CheckSquare, Bell, ChevronRight,
  BarChart2, Eye, EyeOff, Filter, Settings2,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import BulkDeleteBar from '@/components/BulkDeleteBar';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  status: string;
  audienceMode: string;
  requiresAcknowledgement: boolean;
  isPinned: boolean;
  publishedAt: string;
  expireAt: string | null;
  acknowledgementDueAt: string | null;
  tags: string[] | null;
  // feed-only fields
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
}

// ─── Style maps ────────────────────────────────────────────────────────────

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

const TYPE_STYLES: Record<string, string> = {
  INFORMATIONAL:            'bg-sky-100 text-sky-700',
  ACTION_REQUIRED:          'bg-rose-100 text-rose-700',
  SURVEY_LAUNCH:            'bg-violet-100 text-violet-700',
  DEADLINE_REMINDER:        'bg-amber-100 text-amber-700',
  POLICY_UPDATE:            'bg-teal-100 text-teal-700',
  CRITICAL_ALERT:           'bg-red-100 text-red-700',
  LEADERSHIP_COMMUNICATION: 'bg-indigo-100 text-indigo-700',
  TRAINING_COMPLIANCE:      'bg-green-100 text-green-700',
  // legacy
  YOU_SAID_WE_DID: 'bg-green-100 text-green-700',
  GENERAL:         'bg-gray-100 text-gray-700',
  SURVEY_RESULT:   'bg-blue-100 text-blue-700',
  ACTION_UPDATE:   'bg-yellow-100 text-yellow-700',
};

const SCOPE_ICON: Record<string, React.ElementType> = {
  SYSTEM:      Globe,
  HOSPITAL:    Building2,
  DEPARTMENT:  LayoutGrid,
  UNIT:        LayoutGrid,
  ROLE:        Bell,
  COMBINATION: Filter,
};

function typeLabel(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Announcement Card ─────────────────────────────────────────────────────

function AnnouncementCard({
  ann, onRead, onAck,
}: {
  ann: Announcement;
  onRead: (id: string) => void;
  onAck: (id: string) => void;
}) {
  const ScopeIcon = SCOPE_ICON[ann.audienceMode] ?? Globe;
  const isCritical = ann.priority === 'CRITICAL';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md
      ${!ann.isRead ? 'border-blue-200' : 'border-gray-100'}
      ${isCritical ? 'ring-1 ring-red-300' : ''}`}>

      {/* Priority bar */}
      <div className={`h-1 ${PRIORITY_BAR[ann.priority] ?? 'bg-gray-200'}`} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Unread dot */}
          <div className="flex-shrink-0 mt-1">
            {!ann.isRead
              ? <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block" />
              : <span className="w-2.5 h-2.5 rounded-full bg-gray-200 block" />}
          </div>

          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[ann.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                {ann.priority}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLES[ann.type] ?? 'bg-gray-100 text-gray-600'}`}>
                {typeLabel(ann.type)}
              </span>
              {ann.isPinned && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pinned</span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                <ScopeIcon className="w-3 h-3" />
                {ann.audienceMode.toLowerCase()}
              </span>
            </div>

            {/* Title */}
            <h3 className={`text-base font-semibold text-gray-900 mb-1 ${!ann.isRead ? 'font-bold' : ''}`}>
              {ann.title}
            </h3>

            {/* Body preview */}
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{ann.body}</p>

            {/* Footer row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{formatDate(ann.publishedAt)}</span>
                {ann.expireAt && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Clock className="w-3 h-3" /> Expires {formatDate(ann.expireAt)}
                  </span>
                )}
                {ann.requiresAcknowledgement && !ann.isAcknowledged && (
                  <span className="flex items-center gap-1 text-rose-500 font-medium">
                    <AlertTriangle className="w-3 h-3" /> Acknowledgement required
                    {ann.acknowledgementDueAt && ` · Due ${formatDate(ann.acknowledgementDueAt)}`}
                  </span>
                )}
                {ann.isAcknowledged && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="w-3 h-3" /> Acknowledged
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {!ann.isRead && (
                  <button
                    onClick={() => onRead(ann.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Mark read
                  </button>
                )}
                {ann.requiresAcknowledgement && !ann.isAcknowledged && (
                  <button
                    onClick={() => onAck(ann.id)}
                    className="text-xs bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors">
                    <CheckSquare className="w-3.5 h-3.5" /> Acknowledge
                  </button>
                )}
                <Link
                  href={`/announcements/${ann.id}`}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Read more <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLeadership = hasRole('SVP') || hasRole('SUPER_ADMIN') || hasRole('CNP') || hasRole('DIRECTOR');

  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const [tab, setTab]               = useState<'feed' | 'dashboard' | 'manage'>('feed');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => prev.size === ids.length ? new Set() : new Set(ids));
  }

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => api.post('/announcements/bulk-delete', { ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements-all'] }); setSelectedIds(new Set()); },
  });
  const [filterPriority, setFP]     = useState('');
  const [filterType, setFT]         = useState('');
  const [filterRead, setFR]         = useState('');
  const [filterAck, setFA]          = useState('');

  // ── Feed ──
  const { data: feed = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements-feed'],
    queryFn: () => api.get('/announcements/feed').then((r) => r.data),
  });

  // ── Dashboard metrics ──
  const { data: metrics } = useQuery({
    queryKey: ['announcements-dashboard'],
    queryFn: () => api.get('/announcements/dashboard').then((r) => r.data),
    enabled: tab === 'dashboard' && isLeadership,
  });

  const { data: allAnnouncements = [] } = useQuery<any[]>({
    queryKey: ['announcements-all'],
    queryFn: () => api.get('/announcements').then((r) => r.data),
    enabled: tab === 'manage' && isSuperAdmin,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements-feed'] }),
  });

  const acknowledge = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/acknowledge`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements-feed'] }),
  });

  // ── Filtering ──
  const filtered = feed.filter((a) => {
    if (filterPriority && a.priority !== filterPriority) return false;
    if (filterType && a.type !== filterType) return false;
    if (filterRead === 'unread' && a.isRead) return false;
    if (filterRead === 'read' && !a.isRead) return false;
    if (filterAck === 'pending' && a.isAcknowledged) return false;
    if (filterAck === 'done' && !a.isAcknowledged) return false;
    return true;
  });

  const unreadCount  = feed.filter((a) => !a.isRead).length;
  const pendingAck   = feed.filter((a) => a.requiresAcknowledgement && !a.isAcknowledged).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {unreadCount > 0
              ? `${unreadCount} unread · ${pendingAck > 0 ? `${pendingAck} requiring acknowledgement` : 'all acknowledged'}`
              : 'All caught up'}
          </p>
        </div>
        {mounted && isLeadership && (
          <Link href="/announcements/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Announcement
          </Link>
        )}
      </div>

      {/* Critical banner */}
      {feed.filter((a) => a.priority === 'CRITICAL' && !a.isAcknowledged && a.requiresAcknowledgement).length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Critical announcements require your acknowledgement</p>
            <p className="text-xs text-red-600 mt-0.5">
              {feed.filter((a) => a.priority === 'CRITICAL' && !a.isAcknowledged && a.requiresAcknowledgement).length} critical announcement(s) pending your response.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {mounted && isLeadership && (
        <div className="flex border-b border-gray-200 gap-1">
          {([
            ['feed', 'My Feed', Megaphone],
            ['dashboard', 'Leadership Dashboard', BarChart2],
            ...(isSuperAdmin ? [['manage', 'Manage All', Settings2]] : []),
          ] as [string, string, React.ElementType][]).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
                ${tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Feed tab ── */}
      {tab === 'feed' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select className="input text-sm py-1.5 w-auto" value={filterPriority} onChange={(e) => setFP(e.target.value)}>
              <option value="">All Priorities</option>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select className="input text-sm py-1.5 w-auto" value={filterType} onChange={(e) => setFT(e.target.value)}>
              <option value="">All Types</option>
              {['INFORMATIONAL', 'ACTION_REQUIRED', 'SURVEY_LAUNCH', 'DEADLINE_REMINDER',
                'POLICY_UPDATE', 'CRITICAL_ALERT', 'LEADERSHIP_COMMUNICATION', 'TRAINING_COMPLIANCE'].map((t) => (
                <option key={t} value={t}>{typeLabel(t)}</option>
              ))}
            </select>
            <select className="input text-sm py-1.5 w-auto" value={filterRead} onChange={(e) => setFR(e.target.value)}>
              <option value="">Read & Unread</option>
              <option value="unread">Unread only</option>
              <option value="read">Read only</option>
            </select>
            <select className="input text-sm py-1.5 w-auto" value={filterAck} onChange={(e) => setFA(e.target.value)}>
              <option value="">All Acknowledgement</option>
              <option value="pending">Pending ack</option>
              <option value="done">Acknowledged</option>
            </select>
            {(filterPriority || filterType || filterRead || filterAck) && (
              <button onClick={() => { setFP(''); setFT(''); setFR(''); setFA(''); }}
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <EyeOff className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 h-32 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{feed.length === 0 ? 'No announcements yet' : 'No announcements match your filters'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  ann={ann}
                  onRead={(id) => markRead.mutate(id)}
                  onAck={(id) => acknowledge.mutate(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Manage tab (SUPER_ADMIN) ── */}
      {tab === 'manage' && isSuperAdmin && (
        <div className="space-y-3">
          <BulkDeleteBar
            count={selectedIds.size}
            noun="announcement"
            isPending={bulkDelete.isPending}
            onClear={() => setSelectedIds(new Set())}
            onDelete={() => bulkDelete.mutate(Array.from(selectedIds))}
          />
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      className="accent-red-600"
                      checked={allAnnouncements.length > 0 && selectedIds.size === allAnnouncements.length}
                      onChange={() => toggleSelectAll(allAnnouncements.map((a) => a.id))}
                    />
                  </th>
                  {['Title', 'Type', 'Priority', 'Status', 'Created'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allAnnouncements.map((a) => (
                  <tr key={a.id} className={`hover:bg-gray-50 ${selectedIds.has(a.id) ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="accent-red-600"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{a.title}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[a.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.status}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
                {allAnnouncements.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No announcements</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Dashboard tab ── */}
      {tab === 'dashboard' && mounted && isLeadership && (
        <div className="space-y-6">
          {!metrics ? (
            <div className="text-gray-400 text-sm">Loading metrics...</div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Published',        value: metrics.totalPublished,       color: 'text-blue-700',  bg: 'bg-blue-50' },
                  { label: 'Require Ack',       value: metrics.requiresAcknowledgement, color: 'text-rose-700', bg: 'bg-rose-50' },
                  { label: 'Overall Read Rate', value: `${metrics.overallReadRate}%`, color: 'text-green-700', bg: 'bg-green-50' },
                  { label: 'Overall Ack Rate',  value: `${metrics.overallAckRate}%`,  color: 'text-amber-700', bg: 'bg-amber-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-2xl p-5`}>
                    <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Breakdown by priority */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Published by Priority</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.byPriority ?? {}).map(([priority, count]: any) => (
                    <div key={priority} className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-20 text-center ${PRIORITY_STYLES[priority] ?? 'bg-gray-100 text-gray-500'}`}>
                        {priority}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`${PRIORITY_BAR[priority] ?? 'bg-gray-300'} h-2 rounded-full`}
                          style={{ width: `${Math.min(100, (count / metrics.totalPublished) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-6 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total recipient events', value: metrics.totalRecipientEvents, icon: Bell },
                  { label: 'Total reads',            value: metrics.totalRead,             icon: Eye },
                  { label: 'Total acknowledgements', value: metrics.totalAcknowledged,     icon: Check },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
                      <p className="text-sm text-gray-500 mt-1">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Link href="/announcements/manage" className="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1">
                  <Info className="w-4 h-4" /> View all announcements & individual metrics
                </Link>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
