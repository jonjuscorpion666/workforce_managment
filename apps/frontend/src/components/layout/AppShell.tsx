'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ClipboardList, AlertTriangle, CheckSquare,
  BarChart2, ArrowUpCircle, Megaphone, MessageCircle,
  ShieldCheck, Settings, Users2, BookOpen, GitBranch, PieChart, Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import TopNav from './TopNav';
import OnboardingModal from '../OnboardingModal';

const allNavItems = [
  { label: 'Dashboard',     href: '/dashboard',    icon: LayoutDashboard, exact: true },
  { label: 'Surveys',       href: '/surveys',       icon: ClipboardList },
  { label: 'Issues',        href: '/issues',        icon: AlertTriangle },
  { label: 'Tasks',         href: '/tasks',         icon: CheckSquare },
  { label: 'Analytics',     href: '/analytics',     icon: BarChart2, exact: true },
  { label: 'SVP Dashboard', href: '/analytics/svp', icon: PieChart,       roles: ['SVP', 'SUPER_ADMIN'] },
  { label: 'CNO Analytics', href: '/analytics/cno', icon: BarChart2,      roles: ['CNP', 'SUPER_ADMIN'] },
  { label: 'Program Flow',  href: '/program-flow',  icon: GitBranch },
  { label: 'Escalations',   href: '/escalations',   icon: ArrowUpCircle },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Speak Up',      href: '/speak-up',      icon: MessageCircle },
  { label: 'Audit Log',     href: '/audit',         icon: ShieldCheck,    roles: ['SVP', 'SUPER_ADMIN'] },
  { label: 'Admin',         href: '/admin',         icon: Settings,       roles: ['SVP', 'SUPER_ADMIN', 'CNP', 'DIRECTOR', 'MANAGER'] },
  { label: 'Personas',      href: '/persona-map',   icon: Users2,         roles: ['SVP', 'SUPER_ADMIN'] },
  { label: 'Help',          href: '/help',          icon: BookOpen },
];

const NURSE_ROLES = ['NURSE', 'PCT', 'STAFF'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = useCallback(() => setMobileOpen(false), []);
  const pathname = usePathname();
  const router = useRouter();
  const { hasRole, isAuthenticated, user } = useAuth();

  // Central auth guard — covers every admin route wrapped by AppShell
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    // Nurses/staff who somehow reach admin app get sent back to their portal
    if (user?.roles?.some((r) => NURSE_ROLES.includes(r.name))) {
      router.replace('/portal');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated) return null;

  const filteredNav = allNavItems.filter(({ roles }: any) =>
    !roles || roles.some((r: string) => hasRole(r))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav
        onMobileMenuToggle={() => setMobileOpen((v) => !v)}
        mobileMenuOpen={mobileOpen}
      />

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={close}
          />
          <div className="fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl lg:hidden flex flex-col">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" fill="currentColor" />
              </div>
              <span className="font-bold text-gray-900">Workforce</span>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {filteredNav.map(({ label, href, icon: Icon, exact }: any) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <OnboardingModal />
        {children}
      </main>
    </div>
  );
}
