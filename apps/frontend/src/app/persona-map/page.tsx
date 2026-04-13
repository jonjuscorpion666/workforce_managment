'use client';
import { useAuth } from '@/lib/auth';
import {
  Crown, Building2, LayoutGrid, Users, UserCircle,
  CheckCircle2, Eye, BarChart2, Pencil, BadgeCheck,
} from 'lucide-react';
import Link from 'next/link';

const PERSONAS = [
  {
    name: 'SVP / Super Admin',
    icon: Crown,
    color: {
      bg: 'bg-purple-600',
      light: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
    },
    tagline: 'System-wide strategic oversight & governance',
    responsibilities: [
      'Approve or reject CNO-submitted surveys',
      'Monitor engagement across all hospitals',
      'Configure governance policies',
      'Escalate critical issues system-wide',
      'Access full audit trail',
    ],
    sees: [
      'System-wide engagement metrics',
      'Pending approval queue',
      'Cross-hospital analytics',
      'All escalations',
      'Full audit log',
    ],
    metrics: ['Pending approvals', 'System NPS', 'Escalations', 'Survey completion rate'],
    canCreate: ['System-wide surveys (no approval)', 'All announcements', 'Any tasks & issues'],
    roleKeys: ['SVP', 'SUPER_ADMIN'],
    quickLink: { label: 'View Dashboard', href: '/dashboard' },
  },
  {
    name: 'CNO (CNP)',
    icon: Building2,
    color: {
      bg: 'bg-blue-600',
      light: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
    },
    tagline: 'Hospital-level nurse engagement leader',
    responsibilities: [
      'Create hospital surveys (requires SVP approval)',
      'Track hospital engagement & response rates',
      'Respond to SVP revision requests',
      'Raise escalated issues to SVP',
      'Review follow-up insights from low scores',
    ],
    sees: [
      'Hospital engagement score & trend',
      'Survey approval status',
      'Response rates for active surveys',
      'Hospital-level issues',
      'Dimension insights',
    ],
    metrics: ['Hospital engagement', 'Survey response rate', 'Open issues', 'Approval turnaround'],
    canCreate: ['Hospital surveys (needs SVP approval)', 'Hospital announcements', 'Issues & tasks'],
    roleKeys: ['CNO'],
    quickLink: { label: 'New Survey', href: '/surveys/new' },
  },
  {
    name: 'Director',
    icon: LayoutGrid,
    color: {
      bg: 'bg-indigo-600',
      light: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
    },
    tagline: 'Department pulse & workload visibility',
    responsibilities: [
      'Create dept pulse surveys (max 5 questions)',
      'Track workload & scheduling trends',
      'Manage action items from survey insights',
      'Surface issues to CNO / SVP',
      'Drive department action plans',
    ],
    sees: [
      'Department pulse score',
      'Workload trend indicators',
      'Active & draft dept surveys',
      'Open tasks for team',
      'Department issues',
    ],
    metrics: ['Dept pulse score', 'Workload index', 'Overdue tasks', 'Response rate'],
    canCreate: ['Dept pulse surveys (max 5 Qs, needs approval)', 'Issues & tasks for their unit'],
    roleKeys: ['DIRECTOR'],
    quickLink: { label: 'New Survey', href: '/surveys/new' },
  },
  {
    name: 'Manager',
    icon: Users,
    color: {
      bg: 'bg-teal-600',
      light: 'bg-teal-50',
      border: 'border-teal-200',
      text: 'text-teal-700',
    },
    tagline: 'Team engagement action & follow-through',
    responsibilities: [
      'Review survey results & act on feedback',
      'Own and close action items',
      'Escalate issues to Director',
      'Encourage team survey participation',
      'Monitor speak-up from their unit',
    ],
    sees: [
      'Team surveys (active & recent)',
      'Action items for unit',
      'Open issues from team',
      'Task completion status',
      'Anonymous speak-up submissions',
    ],
    metrics: ['Team participation rate', 'Action item completion', 'Open escalations', 'Overdue tasks'],
    canCreate: ['Issues & tasks', 'Speak-up submissions'],
    roleKeys: ['MANAGER'],
    quickLink: { label: 'View Tasks', href: '/tasks' },
  },
  {
    name: 'Staff / Nurse',
    icon: UserCircle,
    color: {
      bg: 'bg-green-600',
      light: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
    },
    tagline: 'Voice of the frontline — anonymous & heard',
    responsibilities: [
      'Complete assigned surveys honestly',
      'Submit anonymous feedback via Speak Up',
      'Flag urgent safety/wellbeing concerns',
      'View hospital announcements',
    ],
    sees: [
      'Surveys waiting for response',
      'Anonymous submission confirmation',
      'Hospital announcements',
      'Speak Up form (always anonymous)',
    ],
    metrics: ['Surveys pending', 'Surveys completed', 'Announcements unread'],
    canCreate: ['Anonymous speak-up submissions'],
    roleKeys: ['STAFF'],
    quickLink: { label: 'Speak Up', href: '/speak-up' },
  },
];

export default function PersonaMapPage() {
  const { user, hasRole } = useAuth();

  const currentPersona = PERSONAS.find((p) =>
    p.roleKeys.some((key) => hasRole(key))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Persona Map</h1>
        <p className="mt-2 text-gray-500 text-base">
          Understand what each role sees, does, and is responsible for across the platform
        </p>
      </div>

      {/* "You are currently" banner */}
      {user && currentPersona && (
        <div className={`rounded-2xl border-2 ${currentPersona.color.border} ${currentPersona.color.light} px-5 py-4 flex items-center gap-4`}>
          <div className={`p-2.5 rounded-xl ${currentPersona.color.bg} flex-shrink-0`}>
            <currentPersona.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className={`font-semibold ${currentPersona.color.text}`}>
              You are currently: {currentPersona.name}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{currentPersona.tagline}</p>
          </div>
          <BadgeCheck className={`w-5 h-5 ml-auto flex-shrink-0 ${currentPersona.color.text}`} />
        </div>
      )}

      {/* Persona cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {PERSONAS.map((persona) => {
          const Icon = persona.icon;
          const isCurrentUser = persona.roleKeys.some((key) => hasRole(key));

          return (
            <div
              key={persona.name}
              className={`rounded-2xl border-2 ${persona.color.border} bg-white shadow-sm flex flex-col overflow-hidden`}
            >
              {/* Card header */}
              <div className={`${persona.color.light} px-5 py-4 border-b ${persona.color.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${persona.color.bg} flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-gray-900 text-base">{persona.name}</h2>
                      {isCurrentUser && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${persona.color.bg} text-white`}>
                          <BadgeCheck className="w-3 h-3" /> Your Persona
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${persona.color.text} font-medium`}>{persona.tagline}</p>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="flex-1 px-5 py-4 space-y-4">
                {/* Responsibilities */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Responsibilities</p>
                  <ul className="space-y-1.5">
                    {persona.responsibilities.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${persona.color.text}`} />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What they see */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What they see</p>
                  <ul className="space-y-1.5">
                    {persona.sees.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-sm text-gray-700">
                        <Eye className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Key Metrics */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Metrics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {persona.metrics.map((m) => (
                      <span
                        key={m}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${persona.color.light} ${persona.color.text} border ${persona.color.border}`}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Can create */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Can create</p>
                  <div className="flex flex-wrap gap-1.5">
                    {persona.canCreate.map((c) => (
                      <span
                        key={c}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card footer / quick link */}
              <div className={`px-5 py-3 border-t ${persona.color.border} ${persona.color.light}`}>
                <Link
                  href={persona.quickLink.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold ${persona.color.text} hover:underline`}
                >
                  {persona.quickLink.label} →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
