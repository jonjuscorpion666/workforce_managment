'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ClipboardList, AlertTriangle, CheckSquare,
  TrendingUp, ArrowUpCircle, Users, Megaphone, MessageCircle,
  BarChart2, PieChart, Calendar, Settings, LogOut, ShieldCheck, GitBranch, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const navItems = [
  { label: 'Dashboard',      href: '/dashboard',      icon: LayoutDashboard, exact: true },
  { label: 'Surveys',        href: '/surveys',         icon: ClipboardList },
  { label: 'Issues',         href: '/issues',          icon: AlertTriangle },
  { label: 'Tasks',          href: '/tasks',           icon: CheckSquare },
  { label: 'Analytics',      href: '/analytics',       icon: BarChart2,  exact: true },
  { label: 'SVP Dashboard',  href: '/analytics/svp',   icon: PieChart,   indent: true },
  { label: 'Program Flow',   href: '/program-flow',    icon: GitBranch },
  { label: 'Escalations',    href: '/escalations',     icon: ArrowUpCircle },
  { label: 'Meetings',       href: '/meetings',        icon: Calendar },
  { label: 'Announcements',  href: '/announcements',   icon: Megaphone },
  { label: 'Speak Up',       href: '/speak-up',        icon: MessageCircle },
  { label: 'KPIs',           href: '/kpis',            icon: TrendingUp },
  { label: 'Audit Log',      href: '/audit',           icon: ShieldCheck },
  { label: 'Admin',          href: '/admin',           icon: Settings },
  { label: 'Help',           href: '/help',            icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <aside className="w-64 min-h-screen bg-brand-900 text-white flex flex-col">
      <div className="p-6 border-b border-brand-700">
        <h1 className="font-bold text-lg leading-tight">Workforce Platform</h1>
        <p className="text-brand-300 text-xs mt-1">Enterprise Engagement</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon, exact, indent }: any) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                indent ? 'px-3 py-2 ml-4 text-xs' : 'px-3 py-2.5',
                active
                  ? 'bg-brand-700 text-white'
                  : 'text-brand-200 hover:bg-brand-800 hover:text-white',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-brand-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-brand-300 truncate">{user?.roles?.[0]?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-brand-300 hover:text-white text-sm w-full">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
