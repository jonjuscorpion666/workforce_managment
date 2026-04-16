'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ClipboardList, AlertTriangle, CheckSquare,
  BarChart2, ChevronDown, Bell, LogOut, Heart,
  ArrowUpCircle, Megaphone, MessageCircle, ShieldCheck,
  Settings, Users2, BookOpen, GitBranch, PieChart, Menu, X,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

const primaryNav = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard, exact: true },
  { label: 'Program Flow', href: '/program-flow', icon: GitBranch },
  { label: 'Surveys',      href: '/surveys',      icon: ClipboardList },
  { label: 'Issues',       href: '/issues',       icon: AlertTriangle },
  { label: 'Tasks',        href: '/tasks',        icon: CheckSquare },
  { label: 'Analytics',    href: '/analytics',    icon: BarChart2, exact: true },
];

const moreNav = [
  { label: 'SVP Dashboard', href: '/analytics/svp',  icon: PieChart,       roles: ['SVP', 'SUPER_ADMIN'] },
  { label: 'CNO Analytics', href: '/analytics/cno',  icon: BarChart2,      roles: ['CNO', 'SUPER_ADMIN'] },
  { label: 'Escalations',   href: '/escalations',    icon: ArrowUpCircle },
  { label: 'Announcements', href: '/announcements',  icon: Megaphone },
  { label: 'Speak Up',      href: '/speak-up',       icon: MessageCircle },
  { label: 'Audit Log',     href: '/audit',          icon: ShieldCheck,    roles: ['SVP', 'SUPER_ADMIN'] },
  { label: 'Admin',         href: '/admin',          icon: Settings,       roles: ['SVP', 'SUPER_ADMIN', 'CNO', 'DIRECTOR', 'MANAGER'] },
  { label: 'Personas',      href: '/persona-map',    icon: Users2,         roles: ['SVP', 'SUPER_ADMIN'] },
  { label: 'Help',          href: '/help',           icon: BookOpen },
];

export default function TopNav({ onMobileMenuToggle, mobileMenuOpen }: {
  onMobileMenuToggle: () => void;
  mobileMenuOpen: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasRole } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const showApprovalBadge = hasRole('SVP') || hasRole('SUPER_ADMIN');
  const { data: pendingApprovals = [] } = useQuery<any[]>({
    queryKey: ['surveys', 'pending'],
    queryFn: () => api.get('/surveys/pending-approvals').then((r) => r.data),
    enabled: showApprovalBadge,
    refetchInterval: 60_000,
  });
  const { data: overdueTasks = [] } = useQuery<any[]>({
    queryKey: ['tasks-overdue'],
    queryFn: () => api.get('/tasks/overdue').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const badges: Record<string, number> = {};
  if (showApprovalBadge && pendingApprovals.length > 0) badges['/surveys'] = pendingApprovals.length;
  if (overdueTasks.length > 0) badges['/tasks'] = overdueTasks.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const role = user?.roles?.[0]?.name ?? '';

  const filteredMore = moreNav.filter(({ roles }: any) =>
    !roles || roles.some((r: string) => hasRole(r))
  );
  const moreActive = filteredMore.some(({ href }) => pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center h-14 px-4 lg:px-6 gap-4">

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          onClick={onMobileMenuToggle}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <span className="font-bold text-gray-900 text-base hidden sm:block">Workforce</span>
        </Link>

        {/* Primary nav — desktop */}
        <nav className="hidden lg:flex items-center gap-1 ml-4 flex-1">
          {primaryNav.map(({ label, href, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            const badge = badges[href];
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-4 text-sm font-medium transition-colors border-b-2',
                  active
                    ? 'text-brand-600 border-brand-600'
                    : 'text-gray-500 border-transparent hover:text-gray-900 hover:border-gray-300',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
                {badge != null && (
                  <span className="ml-0.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* More dropdown */}
          {filteredMore.length > 0 && (
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={cn(
                  'flex items-center gap-1 px-3 py-4 text-sm font-medium transition-colors border-b-2',
                  moreActive
                    ? 'text-brand-600 border-brand-600'
                    : 'text-gray-500 border-transparent hover:text-gray-900 hover:border-gray-300',
                )}
              >
                More
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', moreOpen && 'rotate-180')} />
              </button>
              {moreOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 z-50">
                  {filteredMore.map(({ label, href, icon: Icon }) => {
                    const active = pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                          active ? 'text-brand-600 bg-brand-50' : 'text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Notification bell */}
          <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5" />
            {(badges['/surveys'] ?? 0) + (badges['/tasks'] ?? 0) > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {/* User info */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
            <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-sm font-semibold text-gray-900">{fullName}</p>
              <p className="text-xs text-gray-400">{role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-1"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
