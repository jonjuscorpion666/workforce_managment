// Single source of truth for patient-feedback severity & ticket-status styling.
// Imported by Tickets, Responses and Dashboard so the colour language never
// drifts between screens.

export type Severity = 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface SeverityMeta {
  label: string;
  badge: string;   // pill classes
  bar: string;     // left-border accent class
  hex: string;     // chart fill
  rank: number;    // triage priority (higher = worse)
}

export const SEVERITY: Record<Severity, SeverityMeta> = {
  CRITICAL: { label: 'Critical', badge: 'bg-red-600 text-white',     bar: 'border-l-red-700',   hex: '#7f1d1d', rank: 4 },
  RED:      { label: 'Red',      badge: 'bg-red-100 text-red-700',   bar: 'border-l-red-500',   hex: '#dc2626', rank: 3 },
  YELLOW:   { label: 'Yellow',   badge: 'bg-amber-100 text-amber-700', bar: 'border-l-amber-400', hex: '#f59e0b', rank: 2 },
  GREEN:    { label: 'Green',    badge: 'bg-green-100 text-green-700', bar: 'border-l-green-500', hex: '#16a34a', rank: 1 },
};

export const TICKET_STATUS: Record<TicketStatus, string> = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  RESOLVED:    'bg-green-100 text-green-700',
  CLOSED:      'bg-gray-100 text-gray-600',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY[severity] ?? SEVERITY.YELLOW;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.badge}`}>
      {m.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        TICKET_STATUS[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
