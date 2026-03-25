'use client';

import { useState } from 'react';
import {
  BookOpen, ClipboardList, Megaphone, AlertTriangle,
  CheckSquare, ChevronRight, Milestone, GitBranch,
  Users, Lock, Info, Lightbulb, ArrowRight, Circle,
  BarChart2, TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
}

// ─── Sections index ───────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  { id: 'surveys',       label: 'Surveys',                 icon: ClipboardList  },
  { id: 'announcements', label: 'Announcements',           icon: Megaphone      },
  { id: 'issues',        label: 'Issues from Surveys',     icon: AlertTriangle  },
  { id: 'action-plans',  label: 'Action Plans & Milestones', icon: GitBranch    },
  { id: 'tasks',         label: 'Tasks & Milestones',      icon: CheckSquare    },
  { id: 'analytics',    label: 'Analytics',               icon: BarChart2      },
  { id: 'program-flow', label: 'Program Flow',            icon: GitBranch      },
];

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function SectionHeading({ id, icon: Icon, title, subtitle }: { id: string; icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div id={id} className="scroll-mt-6 flex items-start gap-4 mb-8">
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-900 mb-3 mt-6">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed mb-3">{children}</p>;
}

function Callout({ type, title, children }: { type: 'example' | 'tip' | 'note'; title: string; children: React.ReactNode }) {
  const styles = {
    example: { bg: 'bg-blue-50', border: 'border-blue-200', icon: <Lightbulb className="w-4 h-4 text-blue-600" />, titleColor: 'text-blue-800', textColor: 'text-blue-700' },
    tip:     { bg: 'bg-green-50', border: 'border-green-200', icon: <Info className="w-4 h-4 text-green-600" />, titleColor: 'text-green-800', textColor: 'text-green-700' },
    note:    { bg: 'bg-amber-50', border: 'border-amber-200', icon: <Info className="w-4 h-4 text-amber-600" />, titleColor: 'text-amber-800', textColor: 'text-amber-700' },
  }[type];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-4 mb-5`}>
      <div className={`flex items-center gap-2 font-semibold text-sm ${styles.titleColor} mb-2`}>
        {styles.icon} {title}
      </div>
      <div className={`text-sm ${styles.textColor} leading-relaxed space-y-1`}>{children}</div>
    </div>
  );
}

function Table({ heads, rows }: { heads: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto mb-6 rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {heads.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}

function Yes() { return <Badge label="Yes" color="bg-green-100 text-green-700" />; }
function No()  { return <Badge label="No"  color="bg-red-100 text-red-700"   />; }
function Cond({ label }: { label: string }) { return <Badge label={label} color="bg-amber-100 text-amber-700" />; }

function Flow({ steps }: { steps: { label: string; sub?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="text-center">
            <div className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 shadow-sm">{s.label}</div>
            {s.sub && <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>}
          </div>
          {i < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mx-0.5" />}
        </div>
      ))}
    </div>
  );
}

function Divider() {
  return <hr className="my-10 border-gray-200" />;
}

// ─── Content sections ─────────────────────────────────────────────────────────

function SurveysSection() {
  return (
    <section>
      <SectionHeading
        id="surveys"
        icon={ClipboardList}
        title="Surveys"
        subtitle="How to create, configure, and publish surveys — and who can do what."
      />

      <H3>What is a survey?</H3>
      <P>
        A survey is the primary way the platform gathers staff feedback. You create a set of questions,
        target it to a specific group (hospital, department, or unit), and staff respond. Results feed
        directly into the analytics dashboard and can automatically generate issues where scores are low.
      </P>

      <H3>Who can create surveys?</H3>
      <Table
        heads={['Role', 'Can Create', 'Needs Approval', 'Max Questions', 'Can Target']}
        rows={[
          ['SVP',        <Yes />, <No  />,              'Unlimited', 'System, Hospital, Department, Unit'],
          ['CNO / CNP',  <Yes />, <Cond label="Yes — SVP" />, 'Unlimited', 'Hospital, Unit'],
          ['VP',         <Yes />, <Cond label="Yes — SVP" />, 'Unlimited', 'Hospital, Department, Unit'],
          ['Director',   <Yes />, <Cond label="Yes — CNO/SVP" />, '5',   'Unit (own only)'],
          ['Manager',    <No  />, '—',                  '—',         '—'],
          ['Nurse/Staff',<No  />, '—',                  '—',         '—'],
        ]}
      />

      <Callout type="note" title="Approval rules are configured by your system admin">
        <p>The approval requirements shown above are defaults. Your SVP or Admin may have changed them under <strong>Admin → Platform Configuration</strong>. Check there if you are unsure whether your survey needs approval.</p>
      </Callout>

      <H3>Survey workflow (from creation to results)</H3>
      <Flow steps={[
        { label: 'Draft',    sub: 'Building questions' },
        { label: 'Pending',  sub: 'Awaiting approval' },
        { label: 'Active',   sub: 'Staff can respond' },
        { label: 'Paused',   sub: 'Temporarily stopped' },
        { label: 'Closed',   sub: 'No more responses' },
      ]} />

      <H3>Question types</H3>
      <Table
        heads={['Type', 'When to use', 'Example']}
        rows={[
          ['Scale (1–5)', 'Measuring sentiment or satisfaction', '"How satisfied are you with your workload?" → 1 (Very dissatisfied) to 5 (Very satisfied)'],
          ['Multiple choice', 'Selecting from fixed options', '"Which shift do you usually work?" → Days / Evenings / Nights'],
          ['Text', 'Open-ended qualitative feedback', '"What one thing would most improve your experience?"'],
        ]}
      />

      <H3>Configuring a survey — step by step</H3>
      <ol className="space-y-3 mb-5 text-sm text-gray-600 leading-relaxed list-none">
        {[
          ['Go to Surveys', 'Click Surveys in the left sidebar.'],
          ['Click "New Survey"', 'Give it a clear title (e.g. "Float Pool — Q2 Pulse") and an optional description.'],
          ['Set the close date', 'Choose a realistic window — 7–14 days is typical for pulse surveys. Staff cannot respond after this date.'],
          ['Toggle Anonymous', 'If ON, responses are never linked to a staff member\'s identity. Recommended for sensitive topics. If OFF, you can see who responded (but not their individual answers unless they choose to be identified).'],
          ['Add questions', 'Click "+ Add Question". Choose a type, write the question text, and (for multiple choice) add your options.'],
          ['Set audience', 'Under Audience, choose the target org unit — system-wide, a specific hospital, department, or unit.'],
          ['Submit for approval', 'If your role requires it, click "Submit for Approval". An SVP or CNO will receive a notification to review.'],
          ['Activate', 'Once approved (or immediately if no approval needed), click Activate. Staff can now respond.'],
        ].map(([step, detail], i) => (
          <li key={i} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <div><strong className="text-gray-800">{step}</strong> — {detail}</div>
          </li>
        ))}
      </ol>

      <Callout type="example" title="Example — Director creating a pulse survey">
        <p><strong>Maria Johnson (Director of Nursing)</strong> wants to check in on the Float Pool unit after recent complaints.</p>
        <p className="mt-1">She creates a survey titled <em>"Float Pool — March Pulse"</em> with 5 questions (the maximum allowed for Directors), targets it to the <strong>Float Pool — Inpatient</strong> unit, sets it to anonymous, and submits for approval. CNO Claire Nguyen approves it within 24 hours. Once Active, the 8 nurses in the unit receive it on their portal. Maria can see response counts and scores in Analytics once at least 3 responses are submitted.</p>
      </Callout>

      <H3>Limitations to be aware of</H3>
      <ul className="text-sm text-gray-600 space-y-2 mb-5 leading-relaxed">
        <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /> <span><strong>Directors are capped at 5 questions</strong> per survey by default (admin-configurable). This prevents survey fatigue at unit level.</span></li>
        <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /> <span><strong>Managers cannot create surveys</strong> by default. They should request one via Speak Up or ask their Director.</span></li>
        <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /> <span><strong>Anonymous surveys are irreversible</strong> — once a response is submitted anonymously, it cannot be traced back to the individual.</span></li>
        <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /> <span><strong>Survey scores below 70%</strong> on any engagement dimension trigger the auto-issue creation system (see Issues section).</span></li>
      </ul>
    </section>
  );
}

function AnnouncementsSection() {
  return (
    <section>
      <SectionHeading
        id="announcements"
        icon={Megaphone}
        title="Announcements"
        subtitle="Broadcast messages to staff with targeting, scheduling, and acknowledgement tracking."
      />

      <H3>What is an announcement?</H3>
      <P>
        Announcements are official messages pushed to staff. Unlike a chat message, they are tracked —
        you can see who has read them, who has acknowledged them, and who has not. They appear in the
        nurse/staff portal and in the leadership app.
      </P>

      <H3>Priority levels</H3>
      <Table
        heads={['Priority', 'What it means', 'How it appears']}
        rows={[
          [<Badge label="Critical" color="bg-red-100 text-red-700" />,  'Urgent — requires immediate attention', 'Red banner at the top of the portal. Staff cannot dismiss it until they acknowledge.'],
          [<Badge label="High"     color="bg-orange-100 text-orange-700" />, 'Important but not an emergency',  'Highlighted in orange in the feed. Appears above normal messages.'],
          [<Badge label="Medium"   color="bg-yellow-100 text-yellow-700" />, 'Standard update',                'Normal position in the feed.'],
          [<Badge label="Low"      color="bg-green-100 text-green-700" />,  'Informational only',              'Appears at the bottom of the feed.'],
        ]}
      />

      <H3>Audience targeting options</H3>
      <P>You can target an announcement to any combination of the following:</P>
      <Table
        heads={['Target', 'Who receives it', 'Example use']}
        rows={[
          ['System', 'Every user on the platform', 'Platform-wide downtime notice'],
          ['Hospital', 'All staff at a specific hospital', 'Franciscan Health Indianapolis policy update'],
          ['Department', 'All staff in a department', 'Float Pool scheduling change'],
          ['Unit', 'All staff on a specific unit', 'ICU equipment update'],
          ['Role', 'All users with a specific role', 'All Managers: new reporting deadline'],
          ['Combination', 'Mix of the above', 'All Nurses at FH-Indy AND all Managers system-wide'],
        ]}
      />

      <H3>Scheduling and lifecycle</H3>
      <Flow steps={[
        { label: 'Draft',     sub: 'Being written' },
        { label: 'Scheduled', sub: 'Set to publish later' },
        { label: 'Published', sub: 'Live — staff can see it' },
        { label: 'Expired',   sub: 'Past expiry date' },
        { label: 'Archived',  sub: 'Manually archived' },
      ]} />
      <P>
        You can set a <strong>publish date</strong> (to send later) and an <strong>expiry date</strong> (to automatically hide it after a certain date). Pinned announcements appear at the top of the feed regardless of age.
      </P>

      <H3>Acknowledgement requirement</H3>
      <P>
        When you turn on <strong>Requires Acknowledgement</strong>, staff must tap a button to confirm they have read and understood the announcement. You can set an acknowledgement due date. Leadership sees a live % acknowledged metric.
      </P>
      <P>
        <strong>Critical announcements</strong> always require acknowledgement — the staff portal will show a blocking banner until the nurse confirms.
      </P>

      <Callout type="example" title="Example — Critical announcement with acknowledgement">
        <p><strong>Scenario:</strong> A new infection control protocol is mandatory for all nurses at Franciscan Health Indianapolis, effective immediately.</p>
        <ul className="mt-2 space-y-1 list-none">
          <li>→ <strong>Priority:</strong> Critical</li>
          <li>→ <strong>Audience:</strong> Hospital = Franciscan Health Indianapolis + Role = Nurse</li>
          <li>→ <strong>Requires Acknowledgement:</strong> Yes, due within 48 hours</li>
          <li>→ <strong>Result:</strong> Every nurse on their portal sees a red banner. They cannot navigate away without tapping "I Acknowledge". Leadership can see 14/22 acknowledged in real time.</li>
        </ul>
      </Callout>

      <Callout type="example" title="Example — Scheduled informational announcement">
        <p><strong>Scenario:</strong> The manager wants to remind the Float Pool team about the new bi-weekly check-in starting next Monday.</p>
        <ul className="mt-2 space-y-1 list-none">
          <li>→ <strong>Priority:</strong> Medium</li>
          <li>→ <strong>Audience:</strong> Unit = Float Pool — Inpatient</li>
          <li>→ <strong>Publish date:</strong> Sunday evening (so it's there when they start Monday)</li>
          <li>→ <strong>Expiry date:</strong> 2 weeks after publish</li>
          <li>→ <strong>Requires Acknowledgement:</strong> No</li>
        </ul>
      </Callout>
    </section>
  );
}

function IssuesSection() {
  return (
    <section>
      <SectionHeading
        id="issues"
        icon={AlertTriangle}
        title="Issues from Surveys"
        subtitle="How problems are identified from survey results, tracked, and resolved."
      />

      <H3>What is an issue?</H3>
      <P>
        An issue represents a specific, named problem that needs to be investigated and fixed. Issues
        have an owner, a severity, a due date, and a full change history. They are the central object
        in the platform's improvement cycle.
      </P>

      <H3>Two ways to create an issue</H3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center">1</span>
            Manual creation
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">You spot a problem and create the issue yourself. Go to <strong>Issues → New Issue</strong>, fill in the title, severity, and details.</p>
          <p className="text-sm text-gray-500 mt-2">Best for: Escalations, Speak Up cases, things you observe on the floor that aren't captured in a survey.</p>
        </div>
        <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4">
          <div className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center">2</span>
            Auto-create from survey
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">The platform analyses survey responses and creates issues automatically for every unit that scores below 70% in any engagement dimension.</p>
          <p className="text-sm text-gray-500 mt-2">Best for: After a survey closes — run auto-create once and get a full issue list without manual work.</p>
        </div>
      </div>

      <H3>How auto-create works</H3>
      <P>
        When you click <strong>"Auto-Create from Survey"</strong> and select a survey, the platform runs the following logic automatically:
      </P>
      <ol className="space-y-3 mb-5 text-sm text-gray-600 leading-relaxed list-none">
        {[
          ['Calculates a score per dimension per unit', 'The 10 engagement dimensions (Advocacy, Workload, Recognition, etc.) are each scored as a % of favourable responses for every org unit that responded.'],
          ['Flags units below 70%', 'Any unit scoring below 70% on a dimension gets an issue created. Units above 70% are skipped.'],
          ['Sets severity automatically', 'Score below 40% → Critical (P1). Score below 55% → High (P2). Otherwise → Medium (P3).'],
          ['Determines the issue level', 'If the same dimension is low across all units at multiple hospitals → SYSTEM issue. If low across 3+ units at one hospital → HOSPITAL. If affecting 3+ units overall → DEPARTMENT. Otherwise → UNIT.'],
          ['Skips duplicates', 'If an issue for that unit + dimension already exists and is still open, it is not created again. You see a "skipped N duplicates" count.'],
        ].map(([step, detail], i) => (
          <li key={i} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <div><strong className="text-gray-800">{step}</strong> — {detail}</div>
          </li>
        ))}
      </ol>

      <Callout type="example" title="Example — Auto-create after the Float Pool survey closes">
        <p>After the <em>"Float Pool — March Pulse"</em> survey closes, the SVP runs Auto-Create.</p>
        <ul className="mt-2 space-y-1 list-none">
          <li>→ Float Pool — Inpatient scored <strong>48%</strong> on Overall Experience → Issue created: <em>"Low Overall Experience — Float Pool"</em>, severity HIGH, P2</li>
          <li>→ Float Pool — Inpatient scored <strong>61%</strong> on Leadership Comms → Issue created: <em>"Low Leadership Comms — Float Pool"</em>, severity MEDIUM, P3</li>
          <li>→ Float Pool — Inpatient scored <strong>72%</strong> on Recognition → No issue (above threshold)</li>
        </ul>
        <p className="mt-2">Result: <strong>2 issues created, 1 skipped</strong> (above threshold). Both appear immediately in the Issues list.</p>
      </Callout>

      <H3>Issue severity and priority</H3>
      <Table
        heads={['Severity', 'Score range', 'Priority', 'What it means']}
        rows={[
          [<Badge label="Critical" color="bg-red-100 text-red-700" />,  'Below 40%', 'P1', 'Requires immediate attention. Escalation likely.'],
          [<Badge label="High"     color="bg-orange-100 text-orange-700" />, '40–54%', 'P2', 'Serious problem. Action plan needed within days.'],
          [<Badge label="Medium"   color="bg-yellow-100 text-yellow-700" />, '55–69%', 'P3', 'Below threshold. Address within current cycle.'],
          [<Badge label="Low"      color="bg-green-100 text-green-700" />,  '70%+',   'P4', 'Monitoring only — no issue created.'],
        ]}
      />

      <H3>Issue status lifecycle</H3>
      <Flow steps={[
        { label: 'Open' },
        { label: 'Action Planned' },
        { label: 'In Progress' },
        { label: 'Awaiting Validation' },
        { label: 'Resolved' },
        { label: 'Closed' },
      ]} />
      <P>
        An issue can also become <strong>Blocked</strong> (stuck, reason required) or be <strong>Reopened</strong> if the score drops again after resolution. Every status change is logged in the issue history.
      </P>
    </section>
  );
}

function ActionPlansSection() {
  return (
    <section>
      <SectionHeading
        id="action-plans"
        icon={GitBranch}
        title="Action Plans & Milestones"
        subtitle="How you structure your response to an issue and track progress toward fixing it."
      />

      <H3>What does "Action Planned" mean?</H3>
      <P>
        When an issue moves to <strong>Action Planned</strong> status, it means: <em>we know what the problem is, and we have a structured plan to fix it</em>. The action plan exists, the milestones are defined, but the actual work hasn't started yet.
      </P>
      <P>
        It sits between <strong>Open</strong> (problem identified, no plan) and <strong>In Progress</strong> (plan is being executed). This separation is intentional — it helps leadership distinguish between issues that are being investigated versus ones where a concrete fix is underway.
      </P>

      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6 text-sm text-gray-700">
        <div className="font-semibold mb-3 text-gray-900">Think of it like a building project:</div>
        <div className="space-y-2">
          <div className="flex gap-3 items-start">
            <span className="w-24 text-gray-500 flex-shrink-0 font-medium">Open</span>
            <span>→ We know the roof is leaking. No plan yet.</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-24 text-blue-700 flex-shrink-0 font-semibold">Action Planned</span>
            <span>→ Architect has drawn up the repair plan. Milestones defined. Workers not started yet.</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-24 text-gray-500 flex-shrink-0 font-medium">In Progress</span>
            <span>→ Workers are on the roof. Fix is underway.</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-24 text-gray-500 flex-shrink-0 font-medium">Awaiting Validation</span>
            <span>→ Roof is repaired. Waiting for an inspector to confirm it's watertight.</span>
          </div>
        </div>
      </div>

      <H3>What is an action plan?</H3>
      <P>
        An action plan is the formal response to an issue. One issue can have one action plan. It contains:
      </P>
      <Table
        heads={['Field', 'What to put here']}
        rows={[
          ['Title', 'Short name for the plan, e.g. "Float Pool Experience Improvement Plan"'],
          ['Objective', 'What you are trying to achieve, in plain language'],
          ['Root Cause Summary', 'Why the problem exists — the underlying causes, not just the symptoms'],
          ['Planned Actions', 'A numbered list of the high-level steps you will take'],
          ['Success Criteria', 'How you will know the plan worked — ideally a measurable target like "score ≥ 70%"'],
          ['Owner', 'The person accountable for the plan being executed'],
          ['End Date', 'When the plan should be fully completed'],
        ]}
      />

      <H3>What is a milestone?</H3>
      <P>
        A milestone is a phase or checkpoint within the action plan. Each milestone has a title, a due date, and a status (Pending / Completed / Overdue).
      </P>
      <P>
        Milestones break the plan into manageable phases, each with its own deadline. As milestones are completed, the action plan's progress percentage updates automatically.
      </P>

      <Callout type="example" title="Example — Float Pool issue: Action Plan & Milestones">
        <p><strong>Issue:</strong> Low Overall Experience — Float Pool (score: 48%, target: 70%)</p>
        <p className="mt-2 font-semibold">Action Plan: "Float Pool Experience Improvement Plan"</p>
        <p className="mt-1"><strong>Root Cause:</strong> No standardised orientation when float nurses arrive at a new unit. Scheduling is reactive. No regular touchpoint with management.</p>
        <p className="mt-1"><strong>Success Criteria:</strong> Overall Experience ≥ 70% in the follow-up pulse survey.</p>
        <div className="mt-3 space-y-2">
          {[
            { phase: 'Phase 1', title: 'Root Cause Investigation', due: '2 weeks', tasks: 4 },
            { phase: 'Phase 2', title: 'Protocol Redesign',        due: '5 weeks', tasks: 4 },
            { phase: 'Phase 3', title: 'Implementation & Training', due: '8 weeks', tasks: 4 },
            { phase: 'Phase 4', title: 'Follow-up Survey & Validation', due: '11 weeks', tasks: 3 },
          ].map((m) => (
            <div key={m.phase} className="flex items-center gap-3">
              <Circle className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span className="font-medium text-blue-900">{m.phase} — {m.title}</span>
              <span className="text-blue-700 text-xs ml-auto">Due in {m.due} · {m.tasks} tasks</span>
            </div>
          ))}
        </div>
      </Callout>

      <H3>Progress tracking</H3>
      <P>
        The action plan's progress bar updates automatically as milestones are marked complete.
        For example, if there are 4 milestones and 1 is completed, the plan shows <strong>25% progress</strong>.
        You can also manually override the progress % if needed.
      </P>

      <Callout type="tip" title="When to move the issue from Action Planned → In Progress">
        <p>Move the issue to <strong>In Progress</strong> when the first task from Phase 1 has been started — not when the plan is just written. The status should reflect reality on the ground.</p>
      </Callout>
    </section>
  );
}

function TasksSection() {
  return (
    <section>
      <SectionHeading
        id="tasks"
        icon={CheckSquare}
        title="Tasks & Milestones"
        subtitle="The individual work items that make milestones happen."
      />

      <H3>The full hierarchy</H3>
      <div className="font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-xl mb-6 leading-loose">
        <div>Issue</div>
        <div className="ml-4">└── Action Plan</div>
        <div className="ml-10">└── Milestone (Phase 1, Phase 2, ...)</div>
        <div className="ml-16">└── Tasks (the actual work)</div>
      </div>
      <P>
        Tasks are the concrete, assignable work items. Each task has one owner, a due date, a status,
        and a priority. Tasks are linked to an issue — they represent the work being done to resolve it.
        Milestones group tasks into phases conceptually; when all tasks for a phase are done, you mark
        the milestone as complete.
      </P>

      <H3>Task statuses</H3>
      <Table
        heads={['Status', 'Meaning', 'What to do next']}
        rows={[
          [<Badge label="To Do"       color="bg-gray-100 text-gray-700"   />, 'Not started yet',                       'Assign to someone and set a due date if not done already'],
          [<Badge label="In Progress" color="bg-amber-100 text-amber-700" />, 'Currently being worked on',             'Update the task when done or if you hit a blocker'],
          [<Badge label="Blocked"     color="bg-red-100 text-red-700"     />, 'Cannot proceed — something is in the way', 'Add a note explaining the blocker. Escalate if needed.'],
          [<Badge label="Done"        color="bg-green-100 text-green-700" />, 'Completed',                              'If it was the last task in a milestone phase, mark the milestone complete'],
          [<Badge label="Cancelled"   color="bg-gray-100 text-gray-400"   />, 'No longer needed',                      'Add a reason in the description so the history is clear'],
        ]}
      />

      <H3>Task priority</H3>
      <Table
        heads={['Priority', 'When to use']}
        rows={[
          [<Badge label="High"   color="bg-red-100 text-red-700"      />, 'Must be done in this phase — blocking progress if missed'],
          [<Badge label="Medium" color="bg-yellow-100 text-yellow-700" />, 'Important but not blocking'],
          [<Badge label="Low"    color="bg-green-100 text-green-700"  />, 'Nice to have — will do if time allows'],
        ]}
      />

      <H3>How tasks relate to milestones — in practice</H3>
      <P>
        Milestones define <em>what phase</em> you are in. Tasks define <em>what work</em> needs to happen in that phase.
        The connection is conceptual, not technical — there is no system field that locks a task to a milestone.
        Instead, tasks and milestones share the same issue, and the convention is:
      </P>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800 leading-relaxed">
        <strong>Convention:</strong> Complete all tasks belonging to a phase, then mark the milestone as complete. The milestone's due date should align with the last task in its phase.
      </div>

      <Callout type="example" title="Example — Float Pool Phase 1 tasks driving the milestone">
        <p><strong>Milestone:</strong> Phase 1 — Root Cause Investigation · Due in 2 weeks</p>
        <div className="mt-3 space-y-2">
          {[
            { title: 'Conduct 1:1 interviews with float pool nurses', who: 'James Lee', priority: 'High', due: '10 days' },
            { title: 'Review float pool assignment history (90 days)', who: 'James Lee', priority: 'Medium', due: '8 days' },
            { title: 'Analyse Speak Up submissions related to float pool', who: 'Maria Johnson', priority: 'Medium', due: '10 days' },
            { title: 'Survey float pool coordinator on process gaps', who: 'James Lee', priority: 'Medium', due: '12 days' },
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <Circle className="w-3 h-3 text-blue-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <span className="font-medium text-blue-900">{t.title}</span>
                <span className="text-blue-600 text-xs ml-2">→ {t.who} · {t.priority} · due in {t.due}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3">Once all four tasks are <Badge label="Done" color="bg-green-100 text-green-700" />, James clicks ✓ on the Phase 1 milestone. The action plan progress moves to <strong>25%</strong>. The issue should then move to <strong>In Progress</strong> to begin Phase 2.</p>
      </Callout>

      <H3>Subtasks</H3>
      <P>
        A task can have subtasks — smaller steps under a parent task. For example, the task <em>"Conduct 1:1 interviews with float pool nurses"</em> could have subtasks for each individual nurse interview. Subtasks appear inside the parent task's detail panel.
      </P>

      <H3>Finding your tasks</H3>
      <P>
        Go to <strong>Tasks</strong> in the sidebar. Use the <strong>"My Tasks"</strong> toggle to filter to only tasks assigned to you. Use the <strong>Overdue</strong> filter to see what's late. Click any task row to open the detail panel, which shows the linked issue, subtasks, and lets you update the status in one click.
      </P>

      <Callout type="tip" title="Quick tip — status updates from the list">
        <p>You don't need to open the detail panel to update a task's status. On the task list, click the status badge directly to get a dropdown of valid next statuses. This is the fastest way to move tasks forward during a daily standup or check-in.</p>
      </Callout>
    </section>
  );
}

function ScoreBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>{label}</span>;
}

function AnalyticsSection() {
  return (
    <section>
      <SectionHeading
        id="analytics"
        icon={BarChart2}
        title="Analytics"
        subtitle="Understand participation, engagement scores, low-performing units, and root causes — in one place."
      />

      <H3>What is the Analytics page?</H3>
      <P>
        The Analytics page is the organisation's engagement command centre. Every time a survey closes, its
        results flow automatically into these charts. You don't need to import or calculate anything — the
        platform does it for you. Use it to spot which units are struggling, which dimensions are declining,
        and whether root causes are being addressed.
      </P>

      <H3>The four panels</H3>
      <Table
        heads={['Panel', 'What it shows', 'When to use it']}
        rows={[
          ['Participation',       'Response count and rate for the selected survey (bar chart)',        'First check — if participation is below 60% the scores may not be representative'],
          ['Score Trends',        'Line chart of all 10 engagement dimensions over time',               'Spot upward or downward trends. Compare before vs. after an action plan.'],
          ['Low-Performing Units','Table of org units where any dimension is below threshold',          'Triage. These units likely need an issue created or already have one open.'],
          ['Root Cause & Sentiment', 'Donut chart of root cause categories + top theme cards',         'Understand WHY scores are low, not just where.'],
        ]}
      />

      <H3>Score colour thresholds</H3>
      <P>
        Every score on the platform is coloured the same way, across every chart, table, and heatmap cell.
        Learn these colours once and they apply everywhere.
      </P>
      <Table
        heads={['Colour', 'Score range', 'Label', 'What it means']}
        rows={[
          [<span className="inline-block w-4 h-4 rounded bg-emerald-500 align-middle" />, '≥ 75 %', <ScoreBadge label="Strong" bg="bg-emerald-100" color="text-emerald-700" />,  'Healthy — no action required'],
          [<span className="inline-block w-4 h-4 rounded bg-blue-400 align-middle" />,    '60 – 74 %', <ScoreBadge label="Good" bg="bg-blue-100" color="text-blue-700" />,       'Acceptable — monitor quarterly'],
          [<span className="inline-block w-4 h-4 rounded bg-amber-400 align-middle" />,   '45 – 59 %', <ScoreBadge label="Fair" bg="bg-amber-100" color="text-amber-700" />,    'Below target — create an issue and action plan'],
          [<span className="inline-block w-4 h-4 rounded bg-orange-500 align-middle" />,  '30 – 44 %', <ScoreBadge label="Poor" bg="bg-orange-100" color="text-orange-700" />,  'Serious — escalate to Director / VP'],
          [<span className="inline-block w-4 h-4 rounded bg-red-600 align-middle" />,     '< 30 %',    <ScoreBadge label="Critical" bg="bg-red-100" color="text-red-700" />,    'Crisis — immediate SVP escalation required'],
        ]}
      />

      <H3>The 10 engagement dimensions</H3>
      <P>
        The platform tracks engagement across 10 dimensions. Each is measured independently so leadership can
        act on a specific pain point rather than a vague "low engagement" headline.
      </P>
      <Table
        heads={['Dimension', 'What it measures']}
        rows={[
          ['Advocacy',               'Would staff recommend this workplace to others?'],
          ['Organizational Pride',   'Do staff feel proud to work here?'],
          ['Workload & Wellbeing',   'Is the workload sustainable? Are staff burning out?'],
          ['Meaningful Work',        'Do staff feel their work matters and makes a difference?'],
          ['Recognition',            'Are staff acknowledged for good work?'],
          ['Leadership Communication','Does leadership share clear, honest, timely information?'],
          ['Psychological Safety',   'Can staff speak up without fear of retaliation?'],
          ['Manager Feedback',       'Does the direct manager give useful, regular feedback?'],
          ['Professional Growth',    'Are there learning and advancement opportunities?'],
          ['Overall Experience',     'Holistic satisfaction — a summary dimension'],
        ]}
      />

      <Callout type="example" title="Example — Float Pool analytics">
        <p>After closing the Q1 Float Pool survey the analytics page shows:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li><strong>Participation:</strong> 72 % (good — scores are reliable)</li>
          <li><strong>Overall Experience:</strong> 48 % <ScoreBadge label="Fair" bg="bg-amber-100" color="text-amber-700" /> — triggered auto-issue creation</li>
          <li><strong>Workload &amp; Wellbeing:</strong> 38 % <ScoreBadge label="Poor" bg="bg-orange-100" color="text-orange-700" /> — lowest dimension</li>
          <li><strong>Root cause:</strong> 61 % of open-text comments tagged <em>Scheduling Burden</em></li>
        </ul>
        <p className="mt-2">This tells the director: the Float Pool unit's main problem is scheduling, not recognition or leadership. The action plan should prioritise scheduling improvements first.</p>
      </Callout>

      <H3>What is eNPS?</H3>
      <P>
        eNPS (Employee Net Promoter Score) appears in the SVP Dashboard. It is calculated from the Advocacy
        dimension: staff answer "How likely are you to recommend this organisation as a place to work?" on a
        0–10 scale.
      </P>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 text-sm text-gray-700 leading-relaxed font-mono">
        eNPS = % Promoters (9–10) − % Detractors (0–6)
      </div>
      <P>
        A score above 0 means more promoters than detractors. Above +20 is considered good for healthcare.
        Below −20 is a red flag that requires executive attention.
      </P>

      <H3>The SVP Dashboard — 5 tabs explained</H3>
      <P>
        The SVP Dashboard is a senior leadership view accessible via <strong>Analytics → SVP Dashboard</strong>.
        It combines data from all hospitals into a single screen. There are five tabs:
      </P>

      <Table
        heads={['Tab', 'What it contains', 'Best used by']}
        rows={[
          ['Executive',  '6 KPI cards (Overall Engagement %, eNPS, Response Count, Low-performing Units, Open Issues, Overdue Tasks), risk alert banner, top 5 problem areas, and a list of the lowest-performing units',  'SVP / CNO — quick 60-second system health check'],
          ['Heatmap',    'Color-coded grid: each row is a hospital, each column is one of the 10 dimensions. Click any cell to drill down into that unit.',                                                                'VP / Director — identify which hospitals have which dimension problems'],
          ['Execution',  'Bar charts showing issues and tasks broken down by status, plus a severity breakdown and a "stuck items" table (issues that haven\'t moved in 14+ days)',                                      'Program managers — are action plans actually progressing?'],
          ['Leaders',    'Accountability scorecard per manager/director: task completion rate, milestone hit rate, and an execution grade (A–F)',                                                                       'SVP / VP — hold leaders accountable for follow-through'],
          ['Trends',     'Line chart of burnout/wellbeing scores over time, plus a list of units flagged as retention risks (low Advocacy scores)',                                                                     'CNO / HR — long-range wellbeing and retention monitoring'],
        ]}
      />

      <Callout type="tip" title="Use the survey selector to compare cycles">
        <p>At the top of the Analytics page there is a survey selector dropdown. Switch between surveys (Q1, Q2, annual) to compare results side by side or see how scores changed after an action plan closed. The SVP Dashboard always aggregates the <em>most recent closed survey</em> per hospital unless you select a specific cycle.</p>
      </Callout>

      <H3>Who can see analytics?</H3>
      <Table
        heads={['Role', 'Main Analytics page', 'SVP Dashboard']}
        rows={[
          ['SVP',           <Yes />, <Yes />],
          ['CNO / CNP',     <Yes />, <Yes />],
          ['VP',            <Yes />, <Cond label="Read only" />],
          ['Director',      <Cond label="Own units only" />, <No />],
          ['Manager',       <Cond label="Own unit only"  />, <No />],
          ['Nurse / Staff', <No />,  <No />],
        ]}
      />
    </section>
  );
}

function ProgramFlowSection() {
  return (
    <section>
      <SectionHeading
        id="program-flow"
        icon={GitBranch}
        title="Program Flow"
        subtitle="Track where every org unit is in the transformation cycle — from survey setup through to validated improvement."
      />

      <H3>What is Program Flow?</H3>
      <P>
        Program Flow is the operational backbone of the platform. It shows, at a glance, exactly which stage
        each org unit (hospital, department, or unit) is in for the current engagement cycle. Think of it as
        a Kanban board for the entire organisation's transformation journey — every unit moves through the
        same six stages, but at its own pace.
      </P>
      <P>
        Program Flow does not replace the Issues or Tasks pages. Instead it gives senior leadership a
        bird's-eye view: "Is 4W ICU still in root cause analysis? Has the Float Pool unit started
        communication yet?" — all without clicking into individual records.
      </P>

      <H3>The six stages</H3>
      <Flow steps={[
        { label: 'Survey Setup',    sub: 'SLA: 7 days'  },
        { label: 'Survey Execution',sub: 'SLA: 21 days' },
        { label: 'Root Cause',      sub: 'SLA: 14 days' },
        { label: 'Remediation',     sub: 'SLA: 45 days' },
        { label: 'Communication',   sub: 'SLA: 7 days'  },
        { label: 'Validation',      sub: 'SLA: 21 days' },
      ]} />

      <Table
        heads={['Stage', 'What should be happening', 'Done when...']}
        rows={[
          ['Survey Setup',     'Questions written, target audience configured, approval obtained',          'Survey is published and open for responses'],
          ['Survey Execution', 'Staff are responding; reminders sent; participation tracked daily',         'Survey closes with ≥ 60 % participation'],
          ['Root Cause',       'Results analysed; low-score dimensions investigated; issues being created', 'All issues for the cycle are created and assigned'],
          ['Remediation',      'Action plans running; tasks being completed; milestones hit',               'All action plan milestones are marked complete'],
          ['Communication',    'Leaders share outcomes and progress updates with staff',                    'Announcement published confirming actions taken'],
          ['Validation',       'Follow-up pulse survey sent; scores compared to baseline',                  'Pulse results show improvement (or issue is reopened)'],
        ]}
      />

      <H3>Stage states</H3>
      <P>
        Each unit's stage cell shows one of four states. These are colour-coded in the grid:
      </P>
      <Table
        heads={['State', 'Meaning', 'What to do']}
        rows={[
          [<Badge label="Not Started" color="text-gray-500" />,  'This stage hasn\'t begun yet',                                               'Normal — wait for the previous stage to complete'],
          [<Badge label="In Progress" color="text-blue-700" />,  'Stage is active and within its SLA window',                                  'Monitor — no action needed unless it goes stale'],
          [<Badge label="Completed"   color="text-green-700" />, 'Stage finished and signed off',                                              'Great — the unit advances to the next stage automatically'],
          [<Badge label="Blocked"     color="text-red-700" />,   'A blocker is preventing progress (missing owner, missing approval, etc.)',   'Assign an owner or escalate to the VP / SVP'],
        ]}
      />

      <H3>SLA warnings and staleness</H3>
      <P>
        Each stage has a default SLA (days allowed). If a unit has been in a stage longer than its SLA, the
        cell turns <strong>amber</strong> and shows an "Over SLA" chip. If no activity has been logged in the
        last 7 days, the cell shows a <strong>Stale</strong> indicator — meaning the unit is technically in
        progress but no one has touched it recently.
      </P>
      <Callout type="note" title="SLAs are default targets, not hard deadlines">
        <p>Exceeding an SLA triggers a visual warning and surfaces the unit in the "Stuck Items" table on the SVP Execution tab. It does <em>not</em> automatically block the unit or send external notifications. A director or VP should investigate when they see an over-SLA warning.</p>
      </Callout>

      <H3>Hospital-level aggregate view</H3>
      <P>
        The top rows of the Program Flow grid show <strong>hospital-level aggregates</strong>. An aggregate
        cell summarises all the departments or units underneath it:
      </P>
      <Table
        heads={['Aggregate shows', 'Meaning']}
        rows={[
          ['All Completed',                   'Every unit under this hospital has finished this stage'],
          ['X of Y complete',                 'Some units have finished, some haven\'t'],
          ['Blocked (any)',                    'At least one unit under this hospital is blocked — requires attention'],
          ['Over SLA (X units)',               'X units have exceeded the stage SLA — escalation recommended'],
        ]}
      />

      <Callout type="example" title="Example — reading a Program Flow row">
        <p>You see the following row for <strong>FH Indianapolis — Float Pool</strong>:</p>
        <div className="grid grid-cols-6 gap-1 mt-3 text-xs text-center">
          {[
            { stage: 'Survey Setup',     state: 'Completed',   color: 'bg-green-100 text-green-700'  },
            { stage: 'Survey Execution', state: 'Completed',   color: 'bg-green-100 text-green-700'  },
            { stage: 'Root Cause',       state: 'Completed',   color: 'bg-green-100 text-green-700'  },
            { stage: 'Remediation',      state: 'In Progress ⚠ Over SLA', color: 'bg-amber-100 text-amber-700' },
            { stage: 'Communication',    state: 'Not Started', color: 'bg-gray-100 text-gray-500'    },
            { stage: 'Validation',       state: 'Not Started', color: 'bg-gray-100 text-gray-500'    },
          ].map((c, i) => (
            <div key={i} className={`rounded p-2 ${c.color}`}>
              <div className="font-semibold text-gray-500 text-xs mb-1">{c.stage}</div>
              <div className="font-medium">{c.state}</div>
            </div>
          ))}
        </div>
        <p className="mt-3">This tells you: root cause is done, but remediation (action plans) is running over SLA. Float Pool's action plan milestones need to be checked — are tasks blocked? Is the milestone due date past? Click into the Remediation cell to see the linked issues.</p>
      </Callout>

      <H3>KPI cards and smart alerts</H3>
      <P>
        Above the Program Flow grid, a row of KPI cards gives you a system-wide snapshot: total units in
        each stage, overall cycle completion percentage, and how many units are blocked or over SLA.
        A smart alert banner appears when critical conditions exist, for example:
      </P>
      <div className="space-y-2 mb-6">
        {[
          { color: 'bg-red-50 border-red-200 text-red-800',    text: '3 units have been Blocked for more than 5 days — immediate action required.' },
          { color: 'bg-amber-50 border-amber-200 text-amber-800', text: '7 units are over SLA in the Remediation stage. Review action plan progress.' },
          { color: 'bg-blue-50 border-blue-200 text-blue-800',  text: '12 units have reached Validation — pulse surveys should be sent this week.' },
        ].map((a, i) => (
          <div key={i} className={`text-sm rounded-xl px-4 py-3 border ${a.color}`}>{a.text}</div>
        ))}
      </div>

      <H3>How to use Program Flow day-to-day</H3>
      <Table
        heads={['Who', 'What to look for', 'Typical action']}
        rows={[
          ['SVP',       'Any red (Blocked) or amber (Over SLA) cells across the whole grid; KPI cards',         'Call the relevant VP to unblock; check the Execution tab for stuck issues'],
          ['VP',        'Units in your hospitals that are stale or blocked',                                    'Reach out to the Director to investigate; reassign ownership if needed'],
          ['Director',  'Your unit\'s current stage and whether any SLA chip is showing',                      'Progress tasks, complete milestones, or log a blocker reason'],
          ['Manager',   'Usually does not use Program Flow directly — use the Tasks page instead',              'Mark tasks Done; Director will advance the stage'],
        ]}
      />

      <Callout type="tip" title="Program Flow is read-only for most roles">
        <p>Directors and above can see Program Flow. Managers and staff do not have access. Advancing a stage is done automatically by the platform when the completion criteria are met — you cannot manually tick a stage as "done" unless you are an Admin or SVP. If a stage appears stuck, check that all the underlying issues and milestones are actually complete.</p>
      </Callout>

      <H3>How Program Flow connects to the rest of the platform</H3>
      <div className="font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-xl mb-6 leading-loose">
        <div>Survey (Survey Setup + Execution stages)</div>
        <div className="ml-4">└── Issues auto-created (Root Cause stage)</div>
        <div className="ml-8">└── Action Plans + Milestones (Remediation stage)</div>
        <div className="ml-12">└── Tasks completed by managers (Remediation stage)</div>
        <div className="ml-4">└── Announcement published (Communication stage)</div>
        <div className="ml-4">└── Pulse survey validates improvement (Validation stage)</div>
      </div>
      <P>
        Program Flow is the thread that connects all the other features. When you are unsure where a unit
        is in its engagement cycle, start here — it will point you to the right page.
      </P>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('surveys');

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left nav ── */}
      <aside className="w-60 flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-gray-200 bg-white py-8 px-4">
        <div className="flex items-center gap-2 mb-6 px-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-gray-900 text-sm">Help Centre</span>
        </div>

        <nav className="space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                activeSection === id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-8 px-3 py-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            Need more help? Submit a concern via <strong>Speak Up</strong> or contact your system administrator.
          </p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 max-w-3xl px-10 py-10 overflow-y-auto">
        {/* Page title */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">Help Centre</h1>
          <p className="text-gray-500 text-sm mt-1">
            Everything you need to know about using the Workforce Transformation Platform.
          </p>
        </div>

        <SurveysSection />
        <Divider />
        <AnnouncementsSection />
        <Divider />
        <IssuesSection />
        <Divider />
        <ActionPlansSection />
        <Divider />
        <TasksSection />
        <Divider />
        <AnalyticsSection />
        <Divider />
        <ProgramFlowSection />

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
          Workforce Transformation Platform · Help Centre
        </div>
      </div>
    </div>
  );
}
