'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ClipboardList, AlertTriangle, CheckSquare,
  Megaphone, MessageCircle, ShieldCheck, ChevronDown, ChevronUp,
  CheckCircle2, Clock, BookOpen,
} from 'lucide-react';

interface GuideSection {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle: string;
  steps: { heading: string; body: string }[];
  tip?: string;
}

const SECTIONS: GuideSection[] = [
  {
    id: 'surveys',
    icon: ClipboardList,
    color: 'bg-blue-600',
    title: 'How to Complete a Survey',
    subtitle: 'Your honest answers drive real improvements at your hospital.',
    steps: [
      {
        heading: 'Find an active survey',
        body: 'On the portal home screen, scroll to "Available Surveys". Each card shows the survey title, number of questions, and closing date. Tap a survey card to open it.',
      },
      {
        heading: 'Answer each question',
        body: 'Questions may be Likert scale (1–5 or 1–10), Yes/No, multiple choice, or open text. Tap your answer — a blue highlight confirms your selection. Required questions are marked with a red asterisk (*).',
      },
      {
        heading: 'Follow-up prompts (low scores)',
        body: 'If you rate something very low, an orange text box may appear asking for more detail. This is optional and completely anonymous — it helps leadership understand the root cause.',
      },
      {
        heading: 'Submit your response',
        body: 'Once all required questions are answered, tap "Submit Anonymous Response" at the bottom. You\'ll see a green confirmation screen. Your name is never stored with your answers.',
      },
    ],
    tip: 'Your progress bar at the top tracks answered vs total questions. You can scroll back and change an answer before submitting.',
  },
  {
    id: 'announcements',
    icon: Megaphone,
    color: 'bg-indigo-600',
    title: 'How to Read & Acknowledge Announcements',
    subtitle: 'Stay informed about hospital updates, policy changes, and urgent notices.',
    steps: [
      {
        heading: 'Find announcements',
        body: 'Scroll to the "Announcements" section on the portal home. Unread announcements show a blue dot on the left. Critical announcements appear with a red border and are expanded automatically.',
      },
      {
        heading: 'Read a full announcement',
        body: 'Tap any announcement card to expand it and read the full message. The unread dot disappears as soon as you open it.',
      },
      {
        heading: 'Acknowledge when required',
        body: 'Some announcements require your acknowledgement (shown with an amber "Ack required" badge). After reading, tap the amber "I acknowledge this" button. This confirms to leadership that you have received the message.',
      },
      {
        heading: 'Check the due date',
        body: 'If an acknowledgement has a due date, it is shown in the expanded panel. Please acknowledge before the deadline — your manager is notified of pending acknowledgements.',
      },
    ],
    tip: 'The "Pending Ack" counter in your stats row shows how many announcements are waiting for your acknowledgement.',
  },
  {
    id: 'issues',
    icon: AlertTriangle,
    color: 'bg-orange-500',
    title: 'How to View Department Issues',
    subtitle: 'See what problems leadership is actively working on based on your feedback.',
    steps: [
      {
        heading: 'Find department issues',
        body: 'Scroll to the "Department Issues" section. Issues here were created from survey responses (including yours) or raised directly by your manager or director.',
      },
      {
        heading: 'Read the status',
        body: 'Each issue shows a severity badge (CRITICAL, HIGH, MEDIUM, LOW) and a status: OPEN means newly raised, IN PROGRESS means someone is actively working on it, ACTION PLANNED means a resolution plan is in place, BLOCKED means progress is stalled.',
      },
      {
        heading: 'What this means for you',
        body: 'Issues are read-only for nurses — you cannot edit them. Their purpose is transparency: you can see that your feedback was heard and that leadership is taking action. If a critical issue stays BLOCKED, consider raising a Speak Up submission.',
      },
      {
        heading: 'No issues shown?',
        body: 'If the section shows "No open issues," that\'s a positive sign — either there are no current problems or all raised issues have been resolved.',
      },
    ],
    tip: 'The orange "Open Issues" count in your stats row updates in real time as issues are resolved.',
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    color: 'bg-indigo-500',
    title: 'How to View Department Tasks',
    subtitle: 'Track the action items your department is working through.',
    steps: [
      {
        heading: 'Find department tasks',
        body: 'Scroll to "Department Tasks" on the portal home. Tasks are specific action items — for example, "Review ICU staffing ratios for March" — created by your director or manager as follow-through from survey insights.',
      },
      {
        heading: 'Read the status and due date',
        body: 'Each task card shows a status (TODO, IN PROGRESS, REVIEW) and a due date. Tasks marked "Overdue" in red have passed their due date — if you are concerned, raise it via Speak Up.',
      },
      {
        heading: 'Tasks are read-only',
        body: 'As a nurse, you can view tasks but not edit or assign them. They are here so you can see what concrete steps are being taken as a result of survey data.',
      },
    ],
    tip: 'If you feel an important task is missing or not being actioned, use the Speak Up feature to flag it confidentially.',
  },
  {
    id: 'speakup',
    icon: MessageCircle,
    color: 'bg-green-600',
    title: 'How to Use Speak Up',
    subtitle: 'Raise any concern — anonymously or confidentially — directly with the right person.',
    steps: [
      {
        heading: 'Open the Speak Up form',
        body: 'Scroll to the "Speak Up" section at the bottom of the portal. Tap the card to expand the form. You can also find it in the portal stats row.',
      },
      {
        heading: 'Choose a category',
        body: 'Select the category that best fits your concern: Staffing, Leadership, Scheduling, Culture, Safety, or Other. This helps route your concern to the right team.',
      },
      {
        heading: 'Write your concern',
        body: 'Describe what happened, when it occurred, and any relevant context. The more detail you provide, the faster leadership can act. Your name is never stored with ANONYMOUS submissions.',
      },
      {
        heading: 'Set urgency, privacy, and escalation level',
        body: 'Urgency: Normal (response within 72 hours) or Urgent (response within 24 hours). Privacy: Anonymous (identity never stored) or Confidential (identity stored securely, hidden from your manager). Escalate to: Director, CNO, or HR — your concern bypasses your direct manager.',
      },
      {
        heading: 'Submit and wait for follow-up',
        body: 'After tapping "Submit Concern," you\'ll see a confirmation with the expected response time. HR or leadership will review and respond through secure channels.',
      },
    ],
    tip: 'ANONYMOUS mode means your identity is never recorded. Use CONFIDENTIAL if you want leadership to be able to follow up with you directly.',
  },
  {
    id: 'privacy',
    icon: ShieldCheck,
    color: 'bg-purple-600',
    title: 'Your Privacy & Anonymity',
    subtitle: 'Understand exactly what is and is not stored about you.',
    steps: [
      {
        heading: 'Survey responses',
        body: 'When you submit a survey, your answers are stored as a set of scores without your name, employee ID, or any identifier. Leadership only sees aggregated trends — for example, "Average workload score: 2.4 across 47 responses."',
      },
      {
        heading: 'Follow-up text boxes',
        body: 'If you fill in an optional follow-up text box (the orange boxes that appear for low scores), that text is also stored without your identity. It feeds into root-cause analysis but cannot be traced back to you.',
      },
      {
        heading: 'Speak Up — Anonymous',
        body: 'In ANONYMOUS mode, absolutely no identifying information is stored with your submission. Even the system administrator cannot link it to your account.',
      },
      {
        heading: 'Speak Up — Confidential',
        body: 'In CONFIDENTIAL mode, your identity is stored in a secure, encrypted field that is hidden from your direct manager. Only HR and the escalation recipient can see who submitted the concern.',
      },
      {
        heading: 'Acknowledgements',
        body: 'When you acknowledge an announcement, your acknowledgement is recorded so your manager can confirm all team members have received important notices. This is the only action that records your identity by design.',
      },
    ],
    tip: 'If you have any concerns about privacy, raise them via an Anonymous Speak Up submission to HR.',
  },
];

function GuideCard({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-11 h-11 ${section.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{section.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{section.subtitle}</p>
        </div>
        {open
          ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          <p className="text-sm text-gray-600">{section.subtitle}</p>

          <ol className="space-y-3">
            {section.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className={`w-6 h-6 ${section.color} text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}>
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{step.heading}</p>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {section.tip && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700"><span className="font-semibold">Tip:</span> {section.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NurseGuidePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Nurse Guide</p>
              <p className="text-xs text-gray-500">How to use the portal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* Intro */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">Welcome to Your Portal</p>
              <p className="text-blue-200 text-sm">Everything you need, explained simply</p>
            </div>
          </div>
          <p className="text-sm text-blue-100 leading-relaxed">
            This guide walks you through every feature available to you as a nurse.
            Tap any section to expand the step-by-step instructions.
          </p>
        </div>

        {/* Quick nav pills */}
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm"
              >
                <Icon className="w-3.5 h-3.5" />
                {s.title.replace('How to ', '').replace('Your ', '')}
              </a>
            );
          })}
        </div>

        {/* Section cards */}
        {SECTIONS.map((section) => (
          <div key={section.id} id={section.id}>
            <GuideCard section={section} />
          </div>
        ))}

        <div className="text-center pt-4">
          <p className="text-xs text-gray-400">Workforce Transformation Platform · Nurse Guide</p>
          <button
            onClick={() => router.back()}
            className="mt-3 text-sm text-blue-600 hover:underline font-medium"
          >
            ← Back to Portal
          </button>
        </div>
      </div>
    </div>
  );
}
