'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle, ShieldCheck, AlertTriangle, Clock, CheckCircle2,
  ArrowUpCircle, Eye, Plus, ChevronRight, BarChart3, Users,
  Flag, Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

// ── Types ─────────────────────────────────────────────────────────────────────

type CaseStatus = 'NEW' | 'ACKNOWLEDGED' | 'SCHEDULED' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
type CaseUrgency = 'URGENT' | 'NORMAL';
type CasePrivacy = 'ANONYMOUS' | 'CONFIDENTIAL';
type CaseCategory = 'STAFFING' | 'LEADERSHIP' | 'SCHEDULING' | 'CULTURE' | 'SAFETY' | 'OTHER';
type CaseRoutedTo = 'DIRECTOR' | 'CNO' | 'HR';

const CATEGORIES: { value: CaseCategory; label: string; desc: string }[] = [
  { value: 'STAFFING',    label: 'Staffing',    desc: 'Understaffing, coverage gaps, unsafe ratios' },
  { value: 'LEADERSHIP',  label: 'Leadership',  desc: 'Manager behaviour, leadership concerns' },
  { value: 'SCHEDULING',  label: 'Scheduling',  desc: 'Scheduling fairness, shift swaps, PTO' },
  { value: 'CULTURE',     label: 'Culture',     desc: 'Harassment, discrimination, team dynamics' },
  { value: 'SAFETY',      label: 'Safety',      desc: 'Patient or employee safety risk (urgent)' },
  { value: 'OTHER',       label: 'Other',       desc: 'Anything not listed above' },
];

const STATUS_META: Record<CaseStatus, { label: string; color: string; bg: string; icon: any }> = {
  NEW:          { label: 'New',         color: 'text-blue-700',    bg: 'bg-blue-100',    icon: MessageCircle },
  ACKNOWLEDGED: { label: 'Acknowledged',color: 'text-purple-700',  bg: 'bg-purple-100',  icon: Eye },
  SCHEDULED:    { label: 'Scheduled',   color: 'text-indigo-700',  bg: 'bg-indigo-100',  icon: Clock },
  IN_PROGRESS:  { label: 'In Progress', color: 'text-amber-700',   bg: 'bg-amber-100',   icon: Clock },
  RESOLVED:     { label: 'Resolved',    color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  ESCALATED:    { label: 'Escalated',   color: 'text-red-700',     bg: 'bg-red-100',     icon: ArrowUpCircle },
};

const ROUTED_LABELS: Record<CaseRoutedTo, string> = {
  DIRECTOR: 'Director',
  CNO: 'CNO',
  HR: 'HR',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysOpen(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function isSlaBreached(sla: string | null) {
  if (!sla) return false;
  return new Date(sla) < new Date();
}

function StatusBadge({ status }: { status: CaseStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.NEW;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  );
}

// ── Submission Form ───────────────────────────────────────────────────────────

function SubmitForm() {
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState<CaseCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<CasePrivacy>('ANONYMOUS');
  const [urgency, setUrgency] = useState<CaseUrgency>('NORMAL');
  const [preferredLevel, setPreferredLevel] = useState<CaseRoutedTo>('HR');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/speak-up/cases', { category, description, privacy, urgency, preferredLevel }),
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ['speak-up-cases'] });
      qc.invalidateQueries({ queryKey: ['speak-up-metrics'] });
    },
  });

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-emerald-900 mb-2">Your voice has been heard</h3>
          <p className="text-sm text-emerald-700 mb-1">
            Your case has been submitted{privacy === 'ANONYMOUS' ? ' anonymously' : ' confidentially'}.
          </p>
          <p className="text-sm text-emerald-700 mb-6">
            {urgency === 'URGENT'
              ? 'Urgent cases are reviewed within 24 hours.'
              : 'You will receive a response within 72 hours.'}
          </p>
          <button
            onClick={() => { setSubmitted(false); setDescription(''); setCategory('OTHER'); }}
            className="btn-secondary text-sm"
          >
            Submit another concern
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Trust banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Safe, structured escalation</p>
          <p className="text-blue-700">Your concern bypasses your direct manager and goes straight to {preferredLevel}. Identity is {privacy === 'ANONYMOUS' ? 'never stored' : 'stored securely and hidden from your manager'}.</p>
        </div>
      </div>

      {/* Category */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">What is this about? <span className="text-red-500">*</span></p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`text-left p-3 rounded-xl border text-sm transition-all ${
                category === c.value
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400 ring-offset-1'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <p className="font-semibold text-gray-800">{c.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{c.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Describe your concern <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={5}
          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          placeholder="Be as specific as you can. Include dates, names, and what happened. The more detail, the faster we can act."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Urgency + Preferred level */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Urgency</p>
          <div className="flex flex-col gap-1.5">
            {([['NORMAL', 'Normal', '72h response'], ['URGENT', 'Urgent', '24h response — safety risk']] as const).map(([v, label, sub]) => (
              <button
                key={v}
                type="button"
                onClick={() => setUrgency(v)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all ${
                  urgency === v
                    ? v === 'URGENT'
                      ? 'border-red-400 bg-red-50 ring-1 ring-red-400'
                      : 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {v === 'URGENT' ? <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" /> : <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                <div>
                  <p className="font-medium text-gray-800 leading-tight">{label}</p>
                  <p className="text-[11px] text-gray-500">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Preferred escalation to</p>
          <div className="flex flex-col gap-1.5">
            {([['DIRECTOR', 'Director', 'Unit / department lead'], ['CNO', 'CNO', 'Chief Nursing Officer'], ['HR', 'HR', 'Human Resources']] as const).map(([v, label, sub]) => (
              <button
                key={v}
                type="button"
                onClick={() => setPreferredLevel(v)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all ${
                  preferredLevel === v
                    ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800 leading-tight">{label}</p>
                  <p className="text-[11px] text-gray-500">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Privacy</p>
        <div className="flex gap-3">
          {([['ANONYMOUS', 'Anonymous', 'Your identity is never stored or shared'] as const,
            ['CONFIDENTIAL', 'Confidential', 'Your name is stored but hidden from your manager'] as const]).map(([v, label, sub]) => (
            <button
              key={v}
              type="button"
              onClick={() => setPrivacy(v)}
              className={`flex-1 p-3 rounded-xl border text-left text-sm transition-all ${
                privacy === v
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <ShieldCheck className={`w-4 h-4 ${privacy === v ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="font-semibold text-gray-800">{label}</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !description.trim()}
          className="btn-primary w-full py-3 text-base"
        >
          {mutation.isPending ? 'Submitting…' : 'Submit Concern'}
        </button>
        {mutation.isError && (
          <p className="text-sm text-red-600 mt-2 text-center">
            {(mutation.error as any)?.response?.data?.message ?? 'Submission failed. Please try again.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Metrics strip ─────────────────────────────────────────────────────────────

function MetricsStrip({ metrics }: { metrics: any }) {
  const cards = [
    { label: 'Total Cases',  value: metrics.total,      color: 'text-gray-900' },
    { label: 'Open',         value: metrics.open,       color: 'text-blue-700' },
    { label: 'Overdue (SLA)',value: metrics.overdue,    color: metrics.overdue > 0 ? 'text-red-600' : 'text-emerald-600' },
    { label: 'Escalated',    value: metrics.escalated,  color: metrics.escalated > 0 ? 'text-red-600' : 'text-gray-500' },
    { label: 'Resolved',     value: metrics.resolved,   color: 'text-emerald-700' },
    { label: 'Urgent',       value: metrics.urgent,     color: metrics.urgent > 0 ? 'text-orange-600' : 'text-gray-500' },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-200 px-3 py-3 text-center shadow-sm">
          <p className={`text-2xl font-bold ${c.color}`}>{c.value ?? 0}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Cases List ────────────────────────────────────────────────────────────────

function CasesList() {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const { data: metrics } = useQuery({
    queryKey: ['speak-up-metrics'],
    queryFn: () => api.get('/speak-up/metrics').then((r) => r.data),
  });

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['speak-up-cases', filterStatus, filterUrgency, filterCategory],
    queryFn: () => {
      const params: any = {};
      if (filterStatus)   params.status   = filterStatus;
      if (filterUrgency)  params.urgency  = filterUrgency;
      if (filterCategory) params.category = filterCategory;
      return api.get('/speak-up/cases', { params }).then((r) => r.data);
    },
  });

  return (
    <div className="space-y-5">
      {/* Metrics */}
      {metrics && <MetricsStrip metrics={metrics} />}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([v, m]) => (
            <option key={v} value={v}>{m.label}</option>
          ))}
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
        >
          <option value="">All urgency</option>
          <option value="URGENT">Urgent</option>
          <option value="NORMAL">Normal</option>
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {(filterStatus || filterUrgency || filterCategory) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterUrgency(''); setFilterCategory(''); }}
            className="text-xs text-blue-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Case #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgency</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Routed To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Privacy</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Days Open</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SLA</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={10} className="py-12 text-center text-gray-400">Loading…</td></tr>
            ) : (cases as any[]).length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-gray-400">No cases found</td></tr>
            ) : (
              (cases as any[]).map((c) => {
                const breached = isSlaBreached(c.slaDeadline);
                const days = daysOpen(c.createdAt);
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/speak-up/cases/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-700">{c.caseNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-600 capitalize">{c.category?.toLowerCase()}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <p className="truncate text-gray-700">{c.description ?? c.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.urgency === 'URGENT' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Urgent
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Normal</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-700">{ROUTED_LABELS[c.routedTo as CaseRoutedTo] ?? c.routedTo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-gray-400" />
                        {c.privacy === 'ANONYMOUS' ? 'Anon' : 'Conf.'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${days > 7 ? 'text-orange-600' : 'text-gray-700'}`}>{days}d</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      {breached && c.status !== 'RESOLVED' ? (
                        <span className="text-xs font-semibold text-red-600 flex items-center gap-0.5">
                          <Flag className="w-3 h-3" /> Breached
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{c.slaDeadline ? fmtDate(c.slaDeadline) : '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SpeakUpPage() {
  const { hasRole } = useAuth();
  const viewOnly = hasRole('SVP') || hasRole('SUPER_ADMIN') || hasRole('CNP');
  const [tab, setTab] = useState<'submit' | 'cases'>(viewOnly ? 'cases' : 'submit');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Speak Up</h1>
              <p className="text-xs text-gray-500">
                {viewOnly ? 'Viewing submitted cases' : 'Safe escalation · bypasses your manager'}
              </p>
            </div>
          </div>
          {/* Tab switcher — Submit tab hidden for SVP / CNO */}
          {!viewOnly && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTab('submit')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === 'submit' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Submit
              </button>
              <button
                onClick={() => setTab('cases')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === 'cases' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Cases
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {tab === 'submit' && !viewOnly ? <SubmitForm /> : <CasesList />}
      </div>
    </div>
  );
}
