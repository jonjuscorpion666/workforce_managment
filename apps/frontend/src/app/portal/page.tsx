'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, CheckCircle2, Clock, LogOut, ChevronRight, ShieldCheck,
  Megaphone, AlertTriangle, Bell, Check, Globe, Building2, LayoutGrid,
  ChevronDown, MessageCircle, CheckSquare, TrendingUp, BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import api from '@/lib/api';
import { useNurseAuth } from '@/lib/nurse-auth';
import { formatDate } from '@/lib/utils';

// ─── Style maps ─────────────────────────────────────────────────────────────

const PRIORITY_BAR: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-400',
  MEDIUM:   'bg-blue-400',
  LOW:      'bg-gray-300',
};

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border border-red-200',
  HIGH:     'bg-orange-100 text-orange-700',
  MEDIUM:   'bg-blue-100 text-blue-700',
  LOW:      'bg-gray-100 text-gray-500',
};

const SCOPE_ICON: Record<string, React.ElementType> = {
  SYSTEM: Globe, HOSPITAL: Building2, DEPARTMENT: LayoutGrid,
  UNIT: LayoutGrid, ROLE: Bell, COMBINATION: Bell,
};

function typeLabel(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Announcement card ───────────────────────────────────────────────────────

function AnnouncementCard({ ann, onMarkRead, onAcknowledge }: {
  ann: any;
  onMarkRead: (id: string) => void;
  onAcknowledge: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(ann.priority === 'CRITICAL' || !ann.isRead);
  const ScopeIcon = SCOPE_ICON[ann.audienceMode] ?? Globe;

  function handleExpand() {
    setExpanded((v) => !v);
    if (!ann.isRead) onMarkRead(ann.id);
  }

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden
      ${ann.priority === 'CRITICAL' ? 'border-red-300 ring-1 ring-red-200' : !ann.isRead ? 'border-blue-200' : 'border-gray-200'}`}>

      {/* Priority bar */}
      <div className={`h-1 ${PRIORITY_BAR[ann.priority] ?? 'bg-gray-200'}`} />

      {/* Header row — always visible */}
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={handleExpand}>
        {/* Unread dot */}
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${!ann.isRead ? 'bg-blue-500' : 'bg-gray-200'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[ann.priority] ?? 'bg-gray-100 text-gray-500'}`}>
              {ann.priority}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {typeLabel(ann.type)}
            </span>
            {ann.isPinned && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pinned</span>
            )}
            {ann.requiresAcknowledgement && !ann.isAcknowledged && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Ack required
              </span>
            )}
            {ann.isAcknowledged && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Acknowledged
              </span>
            )}
          </div>

          <p className="font-semibold text-gray-900 text-sm">{ann.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <ScopeIcon className="w-3 h-3" />
            {formatDate(ann.publishedAt ?? ann.createdAt)}
          </p>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ann.body}</p>

          {/* Tags */}
          {ann.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ann.tags.map((tag: string) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {/* Acknowledgement action */}
          {ann.requiresAcknowledgement && !ann.isAcknowledged && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-800">
                  You must acknowledge this announcement
                  {ann.acknowledgementDueAt && ` · Due ${formatDate(ann.acknowledgementDueAt)}`}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); onAcknowledge(ann.id); }}
                  className="mt-2 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                  <Check className="w-3.5 h-3.5" /> I acknowledge this
                </button>
              </div>
            </div>
          )}

          {ann.isAcknowledged && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Acknowledged on {formatDate(ann.acknowledgedAt)}
            </p>
          )}

          {ann.expireAt && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Expires {formatDate(ann.expireAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Speak Up inline form ────────────────────────────────────────────────────

const SPEAK_UP_CATEGORIES = [
  { value: 'STAFFING',   label: 'Staffing' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'SCHEDULING', label: 'Scheduling' },
  { value: 'CULTURE',    label: 'Culture' },
  { value: 'SAFETY',     label: 'Safety' },
  { value: 'OTHER',      label: 'Other' },
] as const;

function SpeakUpSection() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'ANONYMOUS' | 'CONFIDENTIAL'>('ANONYMOUS');
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [preferredLevel, setPreferredLevel] = useState<'DIRECTOR' | 'CNO' | 'HR'>('HR');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/speak-up/cases', { category, description, privacy, urgency, preferredLevel }),
    onSuccess: () => { setSubmitted(true); setDescription(''); },
  });

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">Speak Up</p>
            <p className="text-xs text-gray-500">Raise a concern directly with Director, CNO, or HR</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 bg-white rounded-xl border border-blue-200 shadow-sm p-5 space-y-4">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-gray-800">Concern submitted</p>
              <p className="text-sm text-gray-500 mt-1">
                {urgency === 'URGENT' ? 'You will hear back within 24 hours.' : 'You will hear back within 72 hours.'}
              </p>
              <button
                onClick={() => { setSubmitted(false); setOpen(false); }}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p>Your concern bypasses your direct manager and goes to {preferredLevel}. {privacy === 'ANONYMOUS' ? 'Your identity is never stored.' : 'Your name is stored securely, hidden from your manager.'}</p>
              </div>

              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {SPEAK_UP_CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        category === c.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Your concern <span className="text-red-500">*</span></p>
                <textarea
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Describe what happened, when, and who was involved. The more detail, the faster we can act."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Urgency + Preferred level + Privacy in one compact row */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-gray-600 mb-1.5">Urgency</p>
                  <div className="flex flex-col gap-1">
                    {(['NORMAL', 'URGENT'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setUrgency(v)}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                          urgency === v
                            ? v === 'URGENT' ? 'border-red-400 bg-red-50 text-red-700 font-semibold' : 'border-blue-400 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {v === 'URGENT' ? '🔴 Urgent' : '🔵 Normal'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-600 mb-1.5">Escalate to</p>
                  <div className="flex flex-col gap-1">
                    {(['DIRECTOR', 'CNO', 'HR'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setPreferredLevel(v)}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                          preferredLevel === v ? 'border-blue-400 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-600 mb-1.5">Privacy</p>
                  <div className="flex flex-col gap-1">
                    {(['ANONYMOUS', 'CONFIDENTIAL'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setPrivacy(v)}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                          privacy === v ? 'border-blue-400 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {v === 'ANONYMOUS' ? '🔒 Anon' : '🔐 Conf.'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !description.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {mutation.isPending ? 'Submitting…' : 'Submit Concern'}
              </button>
              {mutation.isError && (
                <p className="text-xs text-red-600 text-center">
                  {(mutation.error as any)?.response?.data?.message ?? 'Submission failed. Try again.'}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Main portal page ────────────────────────────────────────────────────────

export default function NursePortalPage() {
  const { nurse, isAuthenticated, logout, accessToken } = useNurseAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // Guard
  useEffect(() => {
    if (!isAuthenticated) router.replace('/portal/login');
  }, [isAuthenticated, router]);

  // Inject nurse token into API calls
  useEffect(() => {
    if (accessToken) localStorage.setItem('access_token', accessToken);
  }, [accessToken]);

  const { data: surveys = [], isLoading: surveysLoading } = useQuery({
    queryKey: ['nurse-surveys'],
    queryFn: () => api.get('/surveys', { params: { status: 'ACTIVE' } }).then((r) => r.data),
    enabled: isAuthenticated,
  });

  const { data: feed = [], isLoading: feedLoading } = useQuery<any[]>({
    queryKey: ['nurse-announcements'],
    queryFn: () => api.get('/announcements/feed').then((r) => r.data),
    enabled: isAuthenticated,
  });

  const { data: allIssues = [] } = useQuery<any[]>({
    queryKey: ['nurse-dept-issues'],
    queryFn: () => api.get('/issues').then((r) => r.data),
    enabled: isAuthenticated,
  });

  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ['nurse-dept-tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
    enabled: isAuthenticated,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nurse-announcements'] }),
  });

  const acknowledge = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/acknowledge`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nurse-announcements'] }),
  });

  if (!isAuthenticated) return null;

  const activeSurveys    = (surveys as any[]).filter((s) => s.status === 'ACTIVE');
  const unreadCount      = feed.filter((a) => !a.isRead).length;
  const pendingAckCount  = feed.filter((a) => a.requiresAcknowledgement && !a.isAcknowledged).length;
  const criticalUnacked  = feed.filter((a) => a.priority === 'CRITICAL' && a.requiresAcknowledgement && !a.isAcknowledged);

  const myOrgUnitId = nurse?.orgUnit?.id;
  const OPEN_STATUSES = new Set(['OPEN', 'ACTION_PLANNED', 'IN_PROGRESS', 'BLOCKED', 'AWAITING_VALIDATION', 'REOPENED']);
  const deptIssues = allIssues
    .filter((i) => OPEN_STATUSES.has(i.status))
    .filter((i) => !myOrgUnitId || !i.orgUnit || i.orgUnit?.id === myOrgUnitId);
  const deptTasks = allTasks
    .filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
    .filter((t) => !myOrgUnitId || !t.orgUnitId || t.orgUnitId === myOrgUnitId);

  function handleLogout() {
    logout();
    router.push('/portal/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Nurse Portal</p>
              <p className="text-xs text-gray-500">Welcome, {nurse?.firstName} {nurse?.lastName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/portal/guide" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
              <BookOpen className="w-4 h-4" /> Guide
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-blue-600">{activeSurveys.length}</p>
            <p className="text-xs text-gray-500 mt-1">Surveys</p>
          </div>
          <div className={`rounded-xl border p-4 text-center shadow-sm ${deptIssues.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <p className={`text-3xl font-bold ${deptIssues.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{deptIssues.length}</p>
            <p className="text-xs text-gray-500 mt-1">Open Issues</p>
          </div>
          <div className={`rounded-xl border p-4 text-center shadow-sm ${deptTasks.length > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
            <p className={`text-3xl font-bold ${deptTasks.length > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>{deptTasks.length}</p>
            <p className="text-xs text-gray-500 mt-1">Active Tasks</p>
          </div>
        </div>

        {/* Second stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm relative">
            <p className="text-3xl font-bold text-indigo-600">{feed.length}</p>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            <p className="text-xs text-gray-500 mt-1">Announce</p>
          </div>
          <div className={`rounded-xl border p-4 text-center shadow-sm ${pendingAckCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <p className={`text-3xl font-bold ${pendingAckCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>{pendingAckCount}</p>
            <p className="text-xs text-gray-500 mt-1">Pending Ack</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center shadow-sm">
            <MessageCircle className="w-7 h-7 text-blue-500 mx-auto" />
            <p className="text-xs text-blue-700 font-semibold mt-1">Speak Up</p>
          </div>
        </div>

        {/* Critical unacknowledged banner */}
        {criticalUnacked.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">
                {criticalUnacked.length} critical announcement{criticalUnacked.length > 1 ? 's' : ''} require your acknowledgement
              </p>
              <p className="text-xs text-red-600 mt-0.5">Scroll to announcements below and acknowledge each one.</p>
            </div>
          </div>
        )}

        {/* Anonymous reminder */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">
            <span className="font-semibold">All your survey responses are anonymous.</span>{' '}
            Your answers are never linked to your name or employee ID.
          </p>
        </div>

        {/* ── Announcements ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900">Announcements</h2>
            {unreadCount > 0 && (
              <span className="text-xs bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          {feedLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/4 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          )}

          {!feedLoading && feed.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium text-sm">No announcements yet</p>
              <p className="text-gray-400 text-xs mt-1">Leadership announcements will appear here.</p>
            </div>
          )}

          <div className="space-y-3">
            {feed.map((ann) => (
              <AnnouncementCard
                key={ann.id}
                ann={ann}
                onMarkRead={(id) => markRead.mutate(id)}
                onAcknowledge={(id) => acknowledge.mutate(id)}
              />
            ))}
          </div>
        </section>

        {/* ── Surveys ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Available Surveys</h2>
          </div>

          {surveysLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {!surveysLoading && activeSurveys.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No active surveys right now</p>
              <p className="text-gray-400 text-sm mt-1">Check back later — your manager will notify you when a new survey opens.</p>
            </div>
          )}

          <div className="space-y-3">
            {activeSurveys.map((survey: any) => (
              <Link key={survey.id} href={`/portal/survey/${survey.id}`}
                className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-5 group">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        <Clock className="w-3 h-3" /> Active
                      </span>
                      {survey.isAnonymous && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          Anonymous
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {survey.title}
                    </h3>
                    {survey.description && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{survey.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{survey.questions?.length ?? '—'} questions</span>
                      {survey.closesAt && <span>Closes {formatDate(survey.closesAt)}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 flex-shrink-0 ml-4 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Department Issues ── */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">Department Issues</h2>
            {deptIssues.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">
                {deptIssues.length} open
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Issues identified from survey feedback in your department — your responses help drive these improvements.
          </p>

          {deptIssues.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-gray-500 font-medium text-sm">No open issues in your department</p>
              <p className="text-gray-400 text-xs mt-1">Great news — keep the feedback coming through surveys.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deptIssues.slice(0, 5).map((issue: any) => (
                <div key={issue.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                      issue.severity === 'CRITICAL' ? 'bg-red-500' :
                      issue.severity === 'HIGH'     ? 'bg-orange-400' :
                      issue.severity === 'MEDIUM'   ? 'bg-blue-400' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                          issue.severity === 'HIGH'     ? 'bg-orange-100 text-orange-700' :
                          issue.severity === 'MEDIUM'   ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}>{issue.severity}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          issue.status === 'IN_PROGRESS'     ? 'bg-indigo-100 text-indigo-700' :
                          issue.status === 'ACTION_PLANNED'  ? 'bg-purple-100 text-purple-700' :
                          issue.status === 'BLOCKED'         ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{issue.status.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                      {issue.category && (
                        <p className="text-xs text-gray-400 mt-0.5">{issue.category}{issue.subcategory ? ` · ${issue.subcategory}` : ''}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {deptIssues.length > 5 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{deptIssues.length - 5} more issues being tracked</p>
              )}
            </div>
          )}
        </section>

        {/* ── Department Tasks ── */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900">Department Tasks</h2>
            {deptTasks.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                {deptTasks.length} active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Action items your department leadership is working through based on survey insights.
          </p>

          {deptTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-gray-500 font-medium text-sm">No active tasks in your department</p>
              <p className="text-gray-400 text-xs mt-1">Tasks created from survey insights will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deptTasks.slice(0, 5).map((task: any) => (
                <div key={task.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      task.priority === 'HIGH' || task.priority === 'CRITICAL' ? 'text-orange-500' : 'text-indigo-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          task.status === 'TODO'        ? 'bg-gray-100 text-gray-600' :
                          'bg-purple-100 text-purple-700'
                        }`}>{task.status?.replace(/_/g, ' ')}</span>
                        {task.dueDate && new Date(task.dueDate) < new Date() && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.dueDate && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {deptTasks.length > 5 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{deptTasks.length - 5} more tasks in progress</p>
              )}
            </div>
          )}
        </section>

        {/* ── Speak Up ── */}
        <SpeakUpSection />

        <p className="text-center text-xs text-gray-400 pt-4">
          Workforce Transformation Platform · Nurse Portal
        </p>
      </main>
    </div>
  );
}
