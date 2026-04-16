'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle2, AlertTriangle, BarChart2 } from 'lucide-react';

// ── Stage colours ─────────────────────────────────────────────────────────────
const STAGE_COLOR = {
  setup:         { bg: 'bg-slate-50',   border: 'border-slate-300',   text: 'text-slate-700',   dot: 'bg-slate-400',   num: 'bg-slate-500'   },
  execution:     { bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700',    dot: 'bg-blue-400',    num: 'bg-blue-500'    },
  rootcause:     { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   dot: 'bg-amber-400',   num: 'bg-amber-500'   },
  remediation:   { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700',  dot: 'bg-orange-400',  num: 'bg-orange-500'  },
  communication: { bg: 'bg-purple-50',  border: 'border-purple-300',  text: 'text-purple-700',  dot: 'bg-purple-400',  num: 'bg-purple-500'  },
  validation:    { bg: 'bg-green-50',   border: 'border-green-300',   text: 'text-green-700',   dot: 'bg-green-400',   num: 'bg-green-500'   },
};

// ── Checklist item ────────────────────────────────────────────────────────────
function Item({ label, auto, metric }: { label: string; auto?: boolean; metric?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1">
      {metric
        ? <BarChart2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
        : <div className="w-3.5 h-3.5 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
      }
      <span className="text-xs text-gray-700 leading-snug flex-1">{label}</span>
      {auto && <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1 py-0.5 rounded mt-0.5 flex-shrink-0">auto</span>}
    </div>
  );
}

// ── Gate bubble ───────────────────────────────────────────────────────────────
function Gate({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 my-1">
      <div className="w-0.5 h-4 bg-gray-300" />
      <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 rounded-full px-3 py-1">
        <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-amber-700">{label}</span>
      </div>
      <div className="w-0.5 h-4 bg-gray-300" />
      <div className="text-[10px] text-gray-400 font-medium">↓</div>
    </div>
  );
}

// ── Stage box ─────────────────────────────────────────────────────────────────
function Stage({ num, title, colorKey, items, gate }: {
  num: number;
  title: string;
  colorKey: keyof typeof STAGE_COLOR;
  items: { label: string; auto?: boolean; metric?: boolean }[];
  gate?: string;
}) {
  const c = STAGE_COLOR[colorKey];
  return (
    <div className="flex flex-col items-center">
      <div className={`w-full rounded-2xl border-2 ${c.border} ${c.bg} overflow-hidden shadow-sm`}>
        <div className={`flex items-center gap-2.5 px-4 py-3 ${c.bg}`}>
          <div className={`w-6 h-6 rounded-full ${c.num} text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0`}>
            {num}
          </div>
          <h3 className={`font-bold text-sm tracking-wide ${c.text}`}>{title}</h3>
        </div>
        <div className="border-t border-gray-100 bg-white px-4 py-3 space-y-0.5">
          {items.map((item, i) => <Item key={i} {...item} />)}
        </div>
      </div>
      {gate && <Gate label={gate} />}
    </div>
  );
}

// ── Connector ─────────────────────────────────────────────────────────────────
function Arrow() {
  return <div className="flex flex-col items-center gap-0 my-0.5"><div className="w-0.5 h-5 bg-gray-300" /><div className="text-gray-400 text-xs">↓</div></div>;
}

// ── Approval box ──────────────────────────────────────────────────────────────
function ApprovalBox() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
        <h3 className="font-bold text-sm text-amber-700 mb-2">Approval Required</h3>
        <div className="space-y-1.5 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Global program → <strong>SVP</strong> must approve</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Hospital program → <strong>CNO</strong> (or SVP) must approve</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span>Approved → Status becomes <strong>ACTIVE</strong>, enters Setup</span>
          </div>
        </div>
      </div>
      <Gate label="Survey linked + all 5 setup items done" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProgramFlowDiagramPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/program-flow')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium">
            <ChevronLeft className="w-4 h-4" /> All Programs
          </button>
          <span className="text-gray-300">·</span>
          <h1 className="text-lg font-bold text-gray-900">Program Flow Diagram</h1>
        </div>

        {/* Start node */}
        <div className="flex flex-col items-center mb-2">
          <div className="bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow">
            Create Program (DRAFT)
          </div>
          <Arrow />
        </div>

        {/* Approval */}
        <ApprovalBox />

        {/* Stage 1: Setup */}
        <Stage num={1} title="SETUP" colorKey="setup" items={[
          { label: 'Kickoff meeting scheduled',        auto: true  },
          { label: 'Survey linked → questions drafted', auto: true  },
          { label: 'Employee scope defined',           auto: true  },
          { label: 'Communication message drafted',    auto: true  },
          { label: 'Employees notified via announcement' },
        ]} gate="Survey closed" />

        {/* Stage 2: Execution */}
        <Stage num={2} title="EXECUTION" colorKey="execution" items={[
          { label: 'Survey is live',               auto: true   },
          { label: 'Responses collected',          metric: true },
          { label: 'Reminder sent to employees',   auto: true   },
          { label: 'Survey closed',                auto: true   },
        ]} gate="Issues created + team agreed on root causes" />

        {/* Stage 3: Root Cause */}
        <Stage num={3} title="ROOT CAUSE" colorKey="rootcause" items={[
          { label: 'Survey results reviewed'           },
          { label: 'Key findings documented',  auto: true },
          { label: 'Issues created from findings', auto: true },
          { label: 'Team agreed on root causes'    },
        ]} gate="Progress formally reviewed" />

        {/* Stage 4: Remediation */}
        <Stage num={4} title="REMEDIATION" colorKey="remediation" items={[
          { label: 'Action plan drafted',          auto: true   },
          { label: 'Issue resolution progress',    metric: true },
          { label: 'Tasks assigned with owners'                },
          { label: 'Progress formally reviewed'               },
        ]} gate="Employees updated with outcomes" />

        {/* Stage 5: Communication */}
        <Stage num={5} title="COMMUNICATION" colorKey="communication" items={[
          { label: 'Findings report prepared',          auto: true },
          { label: 'Leadership briefed'                           },
          { label: 'Employees informed via announcement', auto: true },
          { label: 'Documentation archived'                       },
        ]} gate="Success criteria evaluated" />

        {/* Stage 6: Validation */}
        <Stage num={6} title="VALIDATION" colorKey="validation" items={[
          { label: 'Follow-up plan in place'                      },
          { label: 'Improvement metrics reviewed'                 },
          { label: 'Success criteria evaluated'                   },
          { label: 'Program outcomes documented',  auto: true     },
        ]} />

        {/* End node */}
        <div className="flex flex-col items-center mt-1">
          <Arrow />
          <div className="bg-green-600 text-white text-sm font-bold px-6 py-3 rounded-full shadow flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            COMPLETED
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Legend</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-xs text-gray-600">
              <div className="w-3.5 h-3.5 rounded border-2 border-gray-300 flex-shrink-0" />
              Manual checkbox — user must tick
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-600">
              <BarChart2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              Live metric — updates automatically
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-600">
              <div className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1 py-0.5 rounded">auto</div>
              Auto-ticked — triggered by an action (saving text, linking, sending)
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-600">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              Gate — must be satisfied before stage can advance
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
