'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, Ticket, LayoutDashboard, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Locations', href: '/patient-feedback',           icon: QrCode,          exact: true },
  { label: 'Tickets',   href: '/patient-feedback/tickets',   icon: Ticket },
  { label: 'Dashboard', href: '/patient-feedback/dashboard', icon: LayoutDashboard },
];

/**
 * Shared module header: clickable "home" title, a segmented tab nav for the
 * three sub-pages, and a slot for page-specific actions. Used by every
 * patient-feedback admin page so navigation is consistent everywhere.
 */
export default function PfHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const onHub = pathname === '/patient-feedback';

  return (
    <div className="mb-6">
      {/* Breadcrumb / back to module home */}
      <Link
        href="/patient-feedback"
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium transition-colors mb-3',
          onHub
            ? 'text-gray-400 pointer-events-none'
            : 'text-gray-500 hover:text-blue-600',
        )}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Patient Feedback
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {/* Segmented tab nav */}
      <nav className="mt-4 inline-flex rounded-xl bg-gray-100 p-1">
        {TABS.map(({ label, href, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                active
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
