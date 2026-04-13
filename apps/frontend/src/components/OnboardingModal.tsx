'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import {
  Crown, Building2, LayoutGrid, Users, UserCircle,
  CheckCircle2, ArrowRight, X, Zap, ShieldCheck,
  ClipboardList, MessageCircle, BarChart2, Eye, CheckSquare,
} from 'lucide-react';
import Link from 'next/link';

interface OnboardingStep {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  items: { icon: React.ElementType; label: string; description: string }[];
  cta: { label: string; href: string };
}

const ONBOARDING: Record<string, OnboardingStep[]> = {
  SVP: [
    {
      title: 'Welcome, SVP 👋',
      subtitle: 'You have full authority across all Franciscan Health hospitals.',
      icon: Crown, iconBg: 'bg-purple-600',
      items: [
        { icon: ShieldCheck, label: 'Approval Queue', description: 'CNO-submitted surveys wait for your review before going live' },
        { icon: BarChart2,   label: 'SVP Analytics', description: 'Cross-hospital engagement heatmaps and dimension scores' },
        { icon: ClipboardList, label: 'Create Any Survey', description: 'Launch system-wide surveys with no approval needed' },
      ],
      cta: { label: 'Go to Approval Queue', href: '/surveys/approvals' },
    },
    {
      title: 'Your Governance Controls',
      subtitle: 'Configure who can create surveys and what requires approval.',
      icon: ShieldCheck, iconBg: 'bg-purple-600',
      items: [
        { icon: CheckCircle2, label: 'CNO Approval Rules', description: 'Toggle whether CNO surveys need SVP sign-off before launch' },
        { icon: CheckCircle2, label: 'Director Limits',    description: 'Set max question count and require approval for Director surveys' },
        { icon: CheckCircle2, label: 'Manager Access',     description: 'Enable or disable survey creation for Manager role' },
      ],
      cta: { label: 'Open Admin Settings', href: '/admin' },
    },
  ],
  SUPER_ADMIN: [
    {
      title: 'Welcome, Super Admin 👋',
      subtitle: 'You have full platform access including admin settings and audit log.',
      icon: Crown, iconBg: 'bg-purple-600',
      items: [
        { icon: ShieldCheck, label: 'Approval Queue', description: 'Review and approve CNO-submitted surveys' },
        { icon: BarChart2,   label: 'Analytics',      description: 'System-wide engagement and dimension dashboards' },
        { icon: CheckCircle2, label: 'Admin Panel',   description: 'Configure governance, user roles, and org units' },
      ],
      cta: { label: 'Open Admin Panel', href: '/admin' },
    },
  ],
  CNP: [
    {
      title: 'Welcome, CNO 👋',
      subtitle: 'You manage nurse engagement for your hospital.',
      icon: Building2, iconBg: 'bg-blue-600',
      items: [
        { icon: ClipboardList, label: 'Create Hospital Surveys', description: 'Build surveys scoped to your hospital — submitted to SVP for approval' },
        { icon: Eye,           label: 'Track Approval Status',  description: 'See real-time status: Draft → Pending → Approved → Active' },
        { icon: Zap,           label: 'Follow-up Insights',     description: 'Low-scoring responses trigger anonymous follow-up prompts' },
      ],
      cta: { label: 'Create Your First Survey', href: '/surveys/new' },
    },
    {
      title: 'The Approval Workflow',
      subtitle: 'Your surveys go through SVP review before reaching nurses.',
      icon: ShieldCheck, iconBg: 'bg-amber-500',
      items: [
        { icon: CheckCircle2, label: 'Step 1 — Build',    description: 'Create your survey with questions tagged by dimension' },
        { icon: CheckCircle2, label: 'Step 2 — Submit',   description: 'Preview & submit for SVP approval in one click' },
        { icon: CheckCircle2, label: 'Step 3 — Publish',  description: 'Once approved, publish to your nurses immediately' },
      ],
      cta: { label: 'View My Surveys', href: '/surveys' },
    },
  ],
  DIRECTOR: [
    {
      title: 'Welcome, Director 👋',
      subtitle: 'Run quick pulse surveys to surface team issues early.',
      icon: LayoutGrid, iconBg: 'bg-indigo-600',
      items: [
        { icon: ClipboardList, label: 'Dept Pulse Surveys', description: 'Create up to 5-question pulse surveys for your department' },
        { icon: CheckCircle2,  label: 'Governed Access',    description: 'Surveys require CNO/SVP approval — prevents survey fatigue' },
        { icon: BarChart2,     label: 'Workload Insights',  description: 'Track workload, scheduling, and team wellness trends' },
      ],
      cta: { label: 'Create a Pulse Survey', href: '/surveys/new' },
    },
  ],
  MANAGER: [
    {
      title: 'Welcome, Manager 👋',
      subtitle: 'Act on survey insights and drive team engagement.',
      icon: Users, iconBg: 'bg-teal-600',
      items: [
        { icon: CheckSquare,   label: 'Action Items',   description: 'Own and close action items surfaced from survey results' },
        { icon: MessageCircle, label: 'Speak Up',       description: 'Your team can submit anonymous concerns — visible to you in aggregate' },
        { icon: ClipboardList, label: 'Team Surveys',   description: 'View active surveys and encourage your team to participate' },
      ],
      cta: { label: 'View Your Tasks', href: '/tasks' },
    },
  ],
  STAFF: [
    {
      title: 'Welcome 👋',
      subtitle: 'Your honest feedback shapes how Franciscan Health supports its nurses.',
      icon: UserCircle, iconBg: 'bg-green-600',
      items: [
        { icon: ShieldCheck,   label: '100% Anonymous',    description: 'Your name is never stored alongside your answers — guaranteed' },
        { icon: ClipboardList, label: 'Complete Surveys',  description: 'Short pulse surveys help leadership understand your real experience' },
        { icon: MessageCircle, label: 'Speak Up Anytime',  description: 'Raise concerns privately and anonymously at any time' },
      ],
      cta: { label: 'Go to Survey Portal', href: '/portal' },
    },
  ],
};

const ROLE_GRADIENT: Record<string, string> = {
  SVP: 'from-purple-700 to-purple-500',
  SUPER_ADMIN: 'from-purple-700 to-purple-500',
  CNP: 'from-blue-700 to-blue-500',
  DIRECTOR: 'from-indigo-700 to-indigo-500',
  MANAGER: 'from-teal-700 to-teal-500',
  STAFF: 'from-green-700 to-green-500',
};

export default function OnboardingModal() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const storageKey = `workforce_onboarded_v1_${user?.id}`;

  useEffect(() => {
    if (!user?.id) return;
    const done = localStorage.getItem(storageKey);
    if (!done) {
      setVisible(true);
    }
  }, [user?.id, storageKey]);

  if (!visible || !user) return null;

  // Determine primary role
  const roleNames = user?.roles?.map((r: any) => r.name) ?? [];
  const ROLE_PRIORITY = ['SVP', 'SUPER_ADMIN', 'CNO', 'DIRECTOR', 'MANAGER', 'STAFF'];
  const role = ROLE_PRIORITY.find((r) => roleNames.includes(r)) ?? 'STAFF';

  const steps = ONBOARDING[role] ?? ONBOARDING.STAFF;
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const gradient = ROLE_GRADIENT[role] ?? 'from-green-700 to-green-500';

  const { icon: StepIcon, iconBg } = current;

  function markDone() {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  }

  function handleNext() {
    if (isLast) {
      markDone();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 rounded-2xl shadow-2xl overflow-hidden bg-white">
        {/* Header */}
        <div className={`bg-gradient-to-br ${gradient} px-6 pt-6 pb-8 text-white relative`}>
          <button
            onClick={markDone}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className={`w-12 h-12 ${iconBg} bg-opacity-80 rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
            <StepIcon className="w-6 h-6 text-white" />
          </div>

          <h2 className="text-xl font-bold leading-snug">{current.title}</h2>
          <p className="mt-1 text-sm text-white/80">{current.subtitle}</p>

          {/* Step indicator dots */}
          {steps.length > 1 && (
            <div className="flex gap-1.5 mt-4">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {current.items.map(({ icon: ItemIcon, label, description }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <ItemIcon className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={markDone}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>

          {isLast ? (
            <Link
              href={current.cta.href}
              onClick={markDone}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {current.cta.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
