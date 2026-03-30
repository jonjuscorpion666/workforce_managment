'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ClipboardList, AlertTriangle, CheckSquare,
  Megaphone, MessageCircle, ShieldCheck, ChevronDown, ChevronUp,
  CheckCircle2, BookOpen, BarChart2, MessageSquare,
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
    id: 'navigation',
    icon: BookOpen,
    color: 'bg-slate-600',
    title: 'Getting Around the Portal',
    subtitle: 'Six tabs at the bottom give you instant access to every feature.',
    steps: [
      {
        heading: 'Home',
        body: 'Your starting point — shows a quick summary (surveys, updates, open issues), any critical announcements, available surveys to complete, and the Speak Up form.',
      },
      {
        heading: 'Updates',
        body: 'All hospital announcements in one place. Unread items show a blue dot. The tab badge shows how many unread or pending-acknowledgement notices you have.',
      },
      {
        heading: 'Issues',
        body: 'Department problems raised from survey feedback. Tap any issue card to read the full details and leave a comment for your team.',
      },
      {
        heading: 'Tasks',
        body: 'Action items your department is working through. Tap a task card to see due dates, who it\'s assigned to, and join the comment thread.',
      },
      {
        heading: 'Insights',
        body: 'Analytics showing how your department is performing — dimension scores, ranking against other departments, hospital comparisons, and your trend over time.',
      },
      {
        heading: 'Guide',
        body: 'This help page. Return here any time you need a reminder of how a feature works.',
      },
    ],
    tip: 'Red badge numbers on the tab icons tell you at a glance how many items need your attention.',
  },
  {
    id: 'surveys',
    icon: ClipboardList,
    color: 'bg-blue-600',
    title: 'How to Complete a Survey',
    subtitle: 'Your honest answers drive real improvements at your hospital.',
    steps: [
      {
        heading: 'Find an active survey',
        body: 'On the Home tab, scroll to "Available Surveys". Each card shows the survey title, number of questions, and closing date. Tap a survey card to open it.',
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
    tip: 'The progress bar at the top tracks answered vs total questions. You can scroll back and change an answer before submitting.',
  },
  {
    id: 'announcements',
    icon: Megaphone,
    color: 'bg-indigo-600',
    title: 'How to Read & Acknowledge Announcements',
    subtitle: 'Stay informed about hospital updates, policy changes, and urgent notices.',
    steps: [
      {
        heading: 'Open the Updates tab',
        body: 'Tap "Updates" in the bottom navigation. Unread announcements show a blue dot on the left. Critical announcements appear with a red border. The tab badge shows the total count of unread + pending acknowledgements.',
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
    tip: 'The Updates tab badge counts both unread messages and outstanding acknowledgements so you never miss anything important.',
  },
  {
    id: 'issues',
    icon: AlertTriangle,
    color: 'bg-orange-500',
    title: 'How to View & Comment on Issues',
    subtitle: 'See what problems leadership is working on — and add your voice.',
    steps: [
      {
        heading: 'Open the Issues tab',
        body: 'Tap "Issues" in the bottom navigation. Issues here were created from survey responses (including yours) or raised directly by your manager or director. The tab badge shows how many are currently open.',
      },
      {
        heading: 'Tap a card to expand it',
        body: 'Each issue card shows a severity badge (CRITICAL, HIGH, MEDIUM, LOW) and a status. Tap the card to expand it and see the full description, assigned owner, target date, and any resolution notes.',
      },
      {
        heading: 'Read the status',
        body: 'OPEN = newly raised. IN PROGRESS = someone is actively working on it. ACTION PLANNED = a resolution plan is in place. BLOCKED = progress is stalled (a red "Blocked reason" box will explain why).',
      },
      {
        heading: 'Add a comment',
        body: 'Inside any expanded issue you\'ll find a Comments section. Type your message in the text box and tap the blue send button (or press Enter). Your comment — with your name and timestamp — is visible to all team members and leadership.',
      },
      {
        heading: 'Read comments by others',
        body: 'All existing comments appear above the input box, oldest first. Comments show the author\'s name and when they were posted. Use this thread to share context, ask questions, or provide updates.',
      },
    ],
    tip: 'If a critical issue stays BLOCKED for a long time, consider also raising a Speak Up so it reaches HR or the CNO directly.',
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    color: 'bg-indigo-500',
    title: 'How to View & Comment on Tasks',
    subtitle: 'Track action items and keep the conversation going.',
    steps: [
      {
        heading: 'Open the Tasks tab',
        body: 'Tap "Tasks" in the bottom navigation. Tasks are specific action items — for example, "Review ICU staffing ratios for March" — created by your director or manager as follow-through from survey insights.',
      },
      {
        heading: 'Tap a card to expand it',
        body: 'Each task card shows its status (TODO, IN PROGRESS, REVIEW), priority, and due date. Tasks with a red "Overdue" badge have passed their due date. Tap the card to expand and see the full description, who it\'s assigned to, and any notes.',
      },
      {
        heading: 'Add a comment',
        body: 'Inside the expanded task you\'ll find a Comments section. Type your message and tap the blue send button. Your comment is visible to the assignee and leadership — useful for flagging blockers or providing context.',
      },
      {
        heading: 'Read comments by others',
        body: 'All comments appear oldest-first. The author name and timestamp are shown on each message. Use the thread to ask questions, share updates, or note if something is blocking progress.',
      },
    ],
    tip: 'If you feel an important task is missing or not being actioned, use Speak Up to flag it confidentially alongside your comment.',
  },
  {
    id: 'insights',
    icon: BarChart2,
    color: 'bg-teal-600',
    title: 'How to Use the Insights Tab',
    subtitle: 'See how your department performs and how your hospital compares.',
    steps: [
      {
        heading: 'Open the Insights tab',
        body: 'Tap "Insights" in the bottom navigation. Data loads the first time you open the tab. All scores are calculated from anonymous survey responses — no individual data is shown.',
      },
      {
        heading: 'Overall engagement score',
        body: 'The first card shows your department\'s overall engagement score as a percentage, colour-coded green (≥70%), amber (50–70%), or red (<50%). It also shows your department\'s rank among all departments — e.g. #3 of 12.',
      },
      {
        heading: 'Dimension breakdown',
        body: 'Below the summary, each of the 10 engagement dimensions (Advocacy, Workload & Wellbeing, Recognition, etc.) is shown as a horizontal bar. Your department\'s bar appears highlighted in blue; the grey bar below each shows the hospital average for comparison.',
      },
      {
        heading: 'Department rankings',
        body: 'A ranked list of all departments in the system shows where each sits. Your department is highlighted with a blue border. Green scores (≥70%) are healthy, amber needs attention, red needs urgent action.',
      },
      {
        heading: 'Hospital comparison',
        body: 'If your system includes more than one hospital, a ranked list shows each hospital\'s average engagement score. Your hospital is highlighted. This lets you see how your site compares system-wide.',
      },
      {
        heading: 'Your department trend',
        body: 'The bottom section shows your department\'s average engagement score for each of the last 6 months as a bar timeline. A rising bar means things are improving; a falling bar is a signal to act.',
      },
    ],
    tip: 'Insights data refreshes when you close and reopen the tab. If scores look unexpected, check that surveys are actively running in your department.',
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
        body: 'On the Home tab, scroll to the "Speak Up" card at the bottom and tap it to expand the form.',
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
    id: 'comments',
    icon: MessageSquare,
    color: 'bg-cyan-600',
    title: 'How Comments Work',
    subtitle: 'Comments on issues and tasks are visible to your whole department team.',
    steps: [
      {
        heading: 'Who can see your comments',
        body: 'Comments on issues and tasks are visible to all nurses in the department as well as the managers, directors, and leadership assigned to that item. They are not anonymous — your name appears on every comment you post.',
      },
      {
        heading: 'What to use comments for',
        body: 'Use comments to add context ("this also happened during night shifts"), ask questions ("has anyone spoken to the charge nurse?"), or flag blockers ("we can\'t move forward until the equipment arrives"). Keep comments professional and factual.',
      },
      {
        heading: 'Difference between comments and Speak Up',
        body: 'Comments are attached to a specific issue or task and are visible to everyone with access to that item. Speak Up is a private, routed submission that goes directly to Director, CNO, or HR and is not attached to any specific issue.',
      },
    ],
    tip: 'If your concern is sensitive or personal, use Speak Up instead of a comment — comments are not private.',
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
        heading: 'Comments',
        body: 'Comments you post on issues and tasks are always linked to your name. They are not anonymous. Do not share sensitive personal information in a comment — use Speak Up for that.',
      },
      {
        heading: 'Acknowledgements',
        body: 'When you acknowledge an announcement, your acknowledgement is recorded so your manager can confirm all team members have received important notices. This is the only survey-style action that records your identity by design.',
      },
    ],
    tip: 'If you have any concerns about how your data is handled, raise them via an Anonymous Speak Up submission to HR.',
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
              <p className="text-xs text-gray-500">How to use every feature</p>
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
            The portal has six tabs at the bottom: <span className="font-semibold text-white">Home, Updates, Issues, Tasks, Insights,</span> and <span className="font-semibold text-white">Guide</span>.
            Tap any section below to expand the step-by-step instructions.
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
