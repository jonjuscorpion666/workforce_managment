'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ClipboardList, AlertTriangle, CheckSquare,
  ArrowUpCircle, Megaphone, MessageCircle,
  BarChart2, PieChart, Settings, LogOut, ShieldCheck, GitBranch, BookOpen, Users2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard, exact: true },
  { label: 'Surveys',       href: '/surveys',        icon: ClipboardList },
  { label: 'Issues',        href: '/issues',         icon: AlertTriangle },
  { label: 'Tasks',         href: '/tasks',          icon: CheckSquare },
  { label: 'Analytics',     href: '/analytics',      icon: BarChart2, exact: true },
  { label: 'SVP Dashboard', href: '/analytics/svp',  icon: PieChart, indent: true },
  { label: 'Program Flow',  href: '/program-flow',   icon: GitBranch },
  { label: 'Escalations',   href: '/escalations',    icon: ArrowUpCircle },
  { label: 'Announcements', href: '/announcements',  icon: Megaphone },
  { label: 'Speak Up',      href: '/speak-up',       icon: MessageCircle },
  { label: 'Audit Log',     href: '/audit',          icon: ShieldCheck },
  { label: 'Admin',         href: '/admin',          icon: Settings },
  { label: 'Personas',      href: '/persona-map',    icon: Users2 },
  { label: 'Help',          href: '/help',           icon: BookOpen },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasRole } = useAuth();

  // Notification badge: pending survey approvals (SVP / SUPER_ADMIN only)
  const showApprovalBadge = hasRole('SVP') || hasRole('SUPER_ADMIN');
  const { data: pendingApprovals = [] } = useQuery<any[]>({
    queryKey: ['surveys', 'pending'],
    queryFn: () => api.get('/surveys/pending-approvals').then((r) => r.data),
    enabled: showApprovalBadge,
    refetchInterval: 60_000,
  });

  // Notification badge: overdue tasks
  const { data: overdueTasks = [] } = useQuery<any[]>({
    queryKey: ['tasks-overdue'],
    queryFn: () => api.get('/tasks/overdue').then((r) => r.data),
    refetchInterval: 60_000,
  });

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const badges: Record<string, number> = {};
  if (showApprovalBadge && pendingApprovals.length > 0) badges['/surveys'] = pendingApprovals.length;
  if (overdueTasks.length > 0) badges['/tasks'] = overdueTasks.length;

  return (
    <aside className="w-64 h-full min-h-screen bg-brand-900 text-white flex flex-col">
      <div className="p-5 border-b border-brand-700 flex-shrink-0">
        <h1 className="font-bold text-base leading-tight">Workforce Platform</h1>
        <p className="text-brand-300 text-xs mt-0.5">Enterprise Engagement</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon, exact, indent }: any) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const badge = badges[href];
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                indent ? 'px-3 py-2 ml-4 text-xs' : 'px-3 py-2.5',
                active
                  ? 'bg-brand-700 text-white'
                  : 'text-brand-200 hover:bg-brand-800 hover:text-white',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {badge != null && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-brand-700 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-brand-300 truncate">{user?.roles?.[0]?.name}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-brand-300 hover:text-white text-sm w-full transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
