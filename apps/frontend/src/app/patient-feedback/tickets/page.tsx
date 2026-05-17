'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface Ticket {
  id: string;
  ticketNumber: string;
  severity: 'YELLOW' | 'RED';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  department: string;
  locationDisplay: string;
  assignedToName: string | null;
  actionTaken: string | null;
  dueAt: string | null;
  closedAt: string | null;
  createdAt: string;
  feedback: {
    rating: number | null;
    answers: { questionId: string; label: string; answer: string | number }[];
    comment: string | null;
    submittedAt: string;
    locationMismatch: boolean;
  } | null;
}

const SEV = {
  RED: 'bg-red-100 text-red-700',
  YELLOW: 'bg-amber-100 text-amber-700',
};
const STATUS = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ['fb-tickets', statusFilter, severityFilter],
    queryFn: () =>
      api
        .get('/patient-feedback/tickets', {
          params: {
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(severityFilter ? { severity: severityFilter } : {}),
          },
        })
        .then((r) => r.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Tickets</h1>
          <p className="text-sm text-gray-500">
            Yellow & red inpatient nursing-care cases needing follow-up.
          </p>
        </div>
        <Link
          href="/patient-feedback"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          Locations
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All severities</option>
          <option value="RED">Red</option>
          <option value="YELLOW">Yellow</option>
        </select>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-gray-400 py-8 text-center">Loading…</p>}
        {!isLoading && tickets.length === 0 && (
          <p className="text-gray-400 py-8 text-center bg-white rounded-2xl border border-gray-100">
            No tickets — all feedback has been positive.
          </p>
        )}
        {tickets.map((t) => (
          <TicketRow
            key={t.id}
            ticket={t}
            open={expanded === t.id}
            onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TicketRow({ ticket, open, onToggle }: { ticket: Ticket; open: boolean; onToggle: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [action, setAction] = useState(ticket.actionTaken ?? '');
  const overdue =
    ticket.dueAt && !ticket.closedAt && new Date(ticket.dueAt).getTime() < Date.now();

  const update = useMutation({
    mutationFn: (body: any) => api.patch(`/patient-feedback/tickets/${ticket.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fb-tickets'] });
      toast.success('Ticket updated');
    },
    onError: () => toast.error('Update failed'),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <span className="font-mono text-xs text-gray-500">{ticket.ticketNumber}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEV[ticket.severity]}`}>
          {ticket.severity}
        </span>
        <span className="text-sm font-medium text-gray-800">{ticket.locationDisplay}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[ticket.status]}`}>
          {ticket.status}
        </span>
        {overdue && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
            SLA breached
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {new Date(ticket.createdAt).toLocaleString()}
        </span>
      </button>

      {open && (
        <div className="px-6 pb-5 pt-1 border-t border-gray-50">
          <div className="grid sm:grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Patient responses</h3>
              {ticket.feedback?.locationMismatch && (
                <p className="text-xs text-amber-600 mb-2">⚠ Patient marked the location as incorrect.</p>
              )}
              <ul className="space-y-1.5 text-sm">
                {ticket.feedback?.answers.map((a) => (
                  <li key={a.questionId} className="flex justify-between gap-3">
                    <span className="text-gray-600">{a.label}</span>
                    <span className="font-medium text-gray-900">{String(a.answer)}</span>
                  </li>
                ))}
                {ticket.feedback?.rating != null && (
                  <li className="flex justify-between gap-3">
                    <span className="text-gray-600">Overall rating</span>
                    <span className="font-medium text-gray-900">{ticket.feedback.rating}/5</span>
                  </li>
                )}
              </ul>
              {ticket.feedback?.comment && (
                <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-lg p-3 italic">
                  “{ticket.feedback.comment}”
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Follow-up</h3>

              <AssigneePicker
                currentName={ticket.assignedToName}
                onAssign={(id) => update.mutate({ assignedToId: id, actionTaken: action })}
              />

              <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Action taken</label>
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                rows={4}
                className="input"
                placeholder="Document the follow-up and resolution…"
              />
              <button
                onClick={() => update.mutate({ actionTaken: action })}
                disabled={update.isPending}
                className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                Save action
              </button>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => update.mutate({ status: s, actionTaken: action })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        ticket.status === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-600/10 text-blue-700 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                {ticket.assignedToName ? `Assigned to ${ticket.assignedToName}` : 'Unassigned'} ·
                {' '}SLA due {ticket.dueAt ? new Date(ticket.dueAt).toLocaleString() : '—'}
                {ticket.closedAt && ` · Closed ${new Date(ticket.closedAt).toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssigneePicker({
  currentName, onAssign,
}: {
  currentName: string | null;
  onAssign: (id: string | null) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const { data: results = [] } = useQuery<any[]>({
    queryKey: ['fb-user-search', q],
    queryFn: () =>
      api
        .get('/admin/users/search', { params: { q, roles: 'MANAGER,DIRECTOR,CNO' } })
        .then((r) => r.data),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned to</label>
      <p className="text-sm mb-1.5">
        {currentName ? (
          <span className="font-medium text-gray-900">{currentName}</span>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        )}
      </p>
      <input
        className="input"
        placeholder="Search supervisor by name or email…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {open && results.length > 0 && (
        <div className="mt-1 border border-gray-200 rounded-xl shadow-sm max-h-44 overflow-y-auto bg-white">
          {results.map((u: any) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onAssign(u.id);
                setQ('');
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between gap-2"
            >
              <span>{u.firstName} {u.lastName}</span>
              <span className="text-xs text-gray-400">
                {u.roles?.[0]?.name}{u.orgUnit?.name ? ` · ${u.orgUnit.name}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
      {currentName && (
        <button
          type="button"
          onClick={() => onAssign(null)}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium"
        >
          Unassign
        </button>
      )}
    </div>
  );
}
