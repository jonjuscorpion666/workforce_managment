'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// ── Layout constants ───────────────────────────────────────────────────────────
const W   = 640;           // SVG total width
const CX  = W / 2;        // centre x = 320

// Stage fill / stroke colours (hex for SVG)
const C = {
  setup:   { fill: '#f8fafc', stroke: '#94a3b8', title: '#475569', badge: '#64748b' },
  exec:    { fill: '#eff6ff', stroke: '#93c5fd', title: '#1d4ed8', badge: '#3b82f6' },
  rc:      { fill: '#fffbeb', stroke: '#fbbf24', title: '#92400e', badge: '#f59e0b' },
  rem:     { fill: '#fff7ed', stroke: '#fb923c', title: '#9a3412', badge: '#f97316' },
  comm:    { fill: '#faf5ff', stroke: '#c4b5fd', title: '#5b21b6', badge: '#8b5cf6' },
  val:     { fill: '#f0fdf4', stroke: '#4ade80', title: '#14532d', badge: '#22c55e' },
  gate:    { fill: '#fffbeb', stroke: '#f59e0b' },
  approve: { fill: '#fef3c7', stroke: '#d97706' },
  reject:  { fill: '#fef2f2', stroke: '#f87171' },
  cancel:  { fill: '#f9fafb', stroke: '#9ca3af' },
};

// ── Primitive components ───────────────────────────────────────────────────────

/** Downward arrow with optional label */
function Arrow({ x, y1, y2, label }: { x: number; y1: number; y2: number; label?: string }) {
  const mid = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2 - 6} stroke="#9ca3af" strokeWidth="1.5" />
      <polygon points={`${x},${y2} ${x - 5},${y2 - 9} ${x + 5},${y2 - 9}`} fill="#9ca3af" />
      {label && (
        <text x={x + 8} y={mid + 4} fontSize="10" fill="#6b7280" fontWeight="600">{label}</text>
      )}
    </g>
  );
}

/** Horizontal arrow going right */
function ArrowRight({ x1, x2, y, label }: { x1: number; x2: number; y: number; label?: string }) {
  const mid = (x1 + x2) / 2;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2 - 6} y2={y} stroke="#9ca3af" strokeWidth="1.5" />
      <polygon points={`${x2},${y} ${x2 - 9},${y - 5} ${x2 - 9},${y + 5}`} fill="#9ca3af" />
      {label && (
        <text x={mid} y={y - 6} fontSize="10" fill="#6b7280" fontWeight="600" textAnchor="middle">{label}</text>
      )}
    </g>
  );
}

/** Elbow: go right from (x1,y1), down to y2, then right to x2 (with arrowhead) */
function ElbowRight({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <polyline
        points={`${x1},${y1} ${x2},${y1} ${x2},${y2 - 6}`}
        fill="none" stroke="#9ca3af" strokeWidth="1.5"
      />
      <polygon points={`${x2},${y2} ${x2 - 5},${y2 - 9} ${x2 + 5},${y2 - 9}`} fill="#9ca3af" />
    </g>
  );
}

/** Elbow: go left from (x1,y1) to x2, then down to y2 with arrowhead */
function ElbowLeft({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <polyline
        points={`${x1},${y1} ${x2},${y1} ${x2},${y2 - 6}`}
        fill="none" stroke="#9ca3af" strokeWidth="1.5"
      />
      <polygon points={`${x2},${y2} ${x2 - 5},${y2 - 9} ${x2 + 5},${y2 - 9}`} fill="#9ca3af" />
    </g>
  );
}

/** Pill terminal (start / end) */
function Terminal({ y, label, fill, stroke, textFill }: {
  y: number; label: string; fill: string; stroke: string; textFill: string;
}) {
  const w = 200; const h = 40; const x = CX - w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={20} fill={fill} stroke={stroke} strokeWidth="2" />
      <text x={CX} y={y + h / 2 + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={textFill}>
        {label}
      </text>
    </g>
  );
}

/** Simple process rectangle */
function Process({ y, label, sublabel, fill, stroke, textFill }: {
  y: number; label: string; sublabel?: string; fill: string; stroke: string; textFill: string;
}) {
  const w = 240; const h = sublabel ? 54 : 44; const x = CX - w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth="1.5" />
      <text x={CX} y={y + (sublabel ? 20 : h / 2 + 5)} textAnchor="middle" fontSize="12" fontWeight="600" fill={textFill}>
        {label}
      </text>
      {sublabel && (
        <text x={CX} y={y + 38} textAnchor="middle" fontSize="10" fill="#6b7280">{sublabel}</text>
      )}
    </g>
  );
}

/** Stage box with number badge + checklist items */
function Stage({ y, num, title, items, c }: {
  y: number;
  num: number;
  title: string;
  items: string[];
  c: { fill: string; stroke: string; title: string; badge: string };
}) {
  const w = 260; const h = 36 + items.length * 20 + 8;
  const x = CX - w / 2;
  return (
    <g>
      {/* Border box */}
      <rect x={x} y={y} width={w} height={h} rx={10} fill={c.fill} stroke={c.stroke} strokeWidth="2" />
      {/* Title bar */}
      <rect x={x} y={y} width={w} height={32} rx={10} fill={c.badge} />
      <rect x={x} y={y + 22} width={w} height={10} fill={c.badge} />
      {/* Number badge */}
      <circle cx={x + 18} cy={y + 16} r={11} fill="white" opacity="0.25" />
      <text x={x + 18} y={y + 21} textAnchor="middle" fontSize="11" fontWeight="800" fill="white">{num}</text>
      {/* Title */}
      <text x={x + 36} y={y + 21} fontSize="12" fontWeight="700" fill="white" letterSpacing="0.5">{title}</text>
      {/* Items */}
      {items.map((item, i) => (
        <g key={i}>
          <circle cx={x + 16} cy={y + 42 + i * 20} r={3} fill={c.stroke} />
          <text x={x + 26} y={y + 46 + i * 20} fontSize="10.5" fill="#374151">{item}</text>
        </g>
      ))}
    </g>
  );
}

/** Gate diamond */
function Gate({ y, label, sublabel }: { y: number; label: string; sublabel?: string }) {
  const w = 220; const h = 72;
  const cx_ = CX; const cy_ = y + h / 2;
  const pts = `${cx_},${y} ${cx_ + w / 2},${cy_} ${cx_},${y + h} ${cx_ - w / 2},${cy_}`;
  return (
    <g>
      <polygon points={pts} fill={C.gate.fill} stroke={C.gate.stroke} strokeWidth="1.5" />
      <text x={cx_} y={cy_ + (sublabel ? -6 : 5)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#92400e">
        {label}
      </text>
      {sublabel && (
        <text x={cx_} y={cy_ + 10} textAnchor="middle" fontSize="9.5" fill="#b45309">{sublabel}</text>
      )}
    </g>
  );
}

/** Small box for rejected / cancelled */
function SideBox({ x, y, w, h, label, sublabel, fill, stroke, textFill }: {
  x: number; y: number; w: number; h: number;
  label: string; sublabel?: string; fill: string; stroke: string; textFill: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth="1.5" />
      <text x={x + w / 2} y={y + (sublabel ? 18 : h / 2 + 5)} textAnchor="middle" fontSize="11" fontWeight="700" fill={textFill}>
        {label}
      </text>
      {sublabel && (
        <text x={x + w / 2} y={y + 33} textAnchor="middle" fontSize="9.5" fill={textFill} opacity="0.8">{sublabel}</text>
      )}
    </g>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ProgramFlowDiagramPage() {

  // ── Y positions (top of each node) ─────────────────────────────────────────
  const yStart       = 20;   // START pill
  const ySubmit      = 90;   // Submit process box
  const yApproval    = 172;  // Approval diamond
  const ySetup       = 290;  // SETUP stage (after "Approved" arrow)
  const ySetupGate   = 430;  // Gate: all setup done
  const yExec        = 530;  // EXECUTION
  const yExecGate    = 670;  // Gate: survey closed
  const yRC          = 770;  // ROOT CAUSE
  const yRCGate      = 910;  // Gate: issues + agreed
  const yRem         = 1010; // REMEDIATION
  const yRemGate     = 1150; // Gate: progress reviewed
  const yComm        = 1250; // COMMUNICATION
  const yCommGate    = 1390; // Gate: employees updated
  const yVal         = 1490; // VALIDATION
  const yValGate     = 1630; // Gate: success evaluated
  const yEnd         = 1730; // COMPLETED pill

  // Stage heights (items × 20 + 44)
  const hSetup = 36 + 5 * 20 + 8; // = 144
  const hExec  = 36 + 4 * 20 + 8; // = 124
  const hRC    = 36 + 4 * 20 + 8;
  const hRem   = 36 + 4 * 20 + 8;
  const hComm  = 36 + 4 * 20 + 8;
  const hVal   = 36 + 4 * 20 + 8;
  const hGate  = 72;
  const hProcess = 44;
  const hPill  = 40;

  // Side boxes
  const rejectedX = CX + 130; const rejectedY = yApproval + 5; const rejectedW = 120; const rejectedH = 44;
  const cancelledX = 20;       const cancelledY = ySetup + 60;  const cancelledW = 100; const cancelledH = 44;

  const svgH = yEnd + hPill + 30;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/program-flow"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium">
            <ChevronLeft className="w-4 h-4" /> All Programs
          </Link>
          <span className="text-gray-300">·</span>
          <h1 className="text-lg font-bold text-gray-900">Program Flow Diagram</h1>
        </div>

        {/* SVG Flowchart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto p-4">
          <svg
            viewBox={`0 0 ${W} ${svgH}`}
            width="100%"
            style={{ maxWidth: W, display: 'block', margin: '0 auto' }}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >

            {/* ── START ──────────────────────────────────────────────────────── */}
            <Terminal y={yStart} label="CREATE PROGRAM (DRAFT)"
              fill="#1f2937" stroke="#1f2937" textFill="white" />

            <Arrow x={CX} y1={yStart + hPill} y2={ySubmit} />

            {/* ── Submit for approval ─────────────────────────────────────────── */}
            <Process y={ySubmit} label="Submit for Approval"
              sublabel="Program creator submits to SVP / CNO"
              fill="#fffbeb" stroke="#fbbf24" textFill="#92400e" />

            <Arrow x={CX} y1={ySubmit + hProcess + 10} y2={yApproval} />

            {/* ── Approval decision ───────────────────────────────────────────── */}
            {(() => {
              const pts = `${CX},${yApproval} ${CX + 110},${yApproval + 36} ${CX},${yApproval + hGate} ${CX - 110},${yApproval + 36}`;
              return (
                <g>
                  <polygon points={pts} fill={C.approve.fill} stroke={C.approve.stroke} strokeWidth="1.5" />
                  <text x={CX} y={yApproval + 22} textAnchor="middle" fontSize="10" fontWeight="700" fill="#92400e">SVP / CNO</text>
                  <text x={CX} y={yApproval + 36} textAnchor="middle" fontSize="10" fontWeight="700" fill="#92400e">Approved?</text>
                  <text x={CX} y={yApproval + 50} textAnchor="middle" fontSize="9" fill="#b45309">Global → SVP · Hospital → CNO</text>
                </g>
              );
            })()}

            {/* REJECTED branch (right) */}
            <ArrowRight x1={CX + 110} x2={rejectedX} y={yApproval + 36} label="No" />
            <SideBox x={rejectedX} y={rejectedY} w={rejectedW} h={rejectedH}
              label="REJECTED" sublabel="Reason logged"
              fill={C.reject.fill} stroke={C.reject.stroke} textFill="#b91c1c" />

            {/* Approved → down */}
            <Arrow x={CX} y1={yApproval + hGate} y2={ySetup} label="Approved →" />

            {/* CANCELLED side note (left) — applies to any active stage */}
            <SideBox x={cancelledX} y={cancelledY} w={cancelledW} h={cancelledH}
              label="CANCELLED" sublabel="SVP only"
              fill={C.cancel.fill} stroke={C.cancel.stroke} textFill="#6b7280" />
            {/* Dashed line from setup left edge to cancelled box */}
            <line
              x1={CX - 130} y1={ySetup + 70}
              x2={cancelledX + cancelledW} y2={cancelledY + 22}
              stroke="#d1d5db" strokeWidth="1.2" strokeDasharray="4 3"
            />
            <text x={cancelledX + cancelledW / 2} y={cancelledY - 8} fontSize="8.5" fill="#9ca3af" textAnchor="middle">
              any stage
            </text>

            {/* ── SETUP ──────────────────────────────────────────────────────── */}
            <Stage y={ySetup} num={1} title="SETUP" c={C.setup} items={[
              'Kickoff meeting scheduled',
              'Survey linked + questions drafted',
              'Employee scope defined',
              'Communication message drafted',
              'Employees notified via announcement',
            ]} />
            <Arrow x={CX} y1={ySetup + hSetup} y2={ySetupGate} />

            <Gate y={ySetupGate} label="Survey linked +" sublabel="all 5 setup items done?" />
            <Arrow x={CX} y1={ySetupGate + hGate} y2={yExec} label="Gate passed" />

            {/* ── EXECUTION ──────────────────────────────────────────────────── */}
            <Stage y={yExec} num={2} title="EXECUTION" c={C.exec} items={[
              'Survey is live (auto)',
              'Responses collected (metric)',
              'Reminder sent to employees',
              'Survey closed',
            ]} />
            <Arrow x={CX} y1={yExec + hExec} y2={yExecGate} />

            <Gate y={yExecGate} label="Survey closed?" />
            <Arrow x={CX} y1={yExecGate + hGate} y2={yRC} />

            {/* ── ROOT CAUSE ─────────────────────────────────────────────────── */}
            <Stage y={yRC} num={3} title="ROOT CAUSE" c={C.rc} items={[
              'Survey results reviewed',
              'Key findings documented',
              'Issues created from findings',
              'Team agreed on root causes',
            ]} />
            <Arrow x={CX} y1={yRC + hRC} y2={yRCGate} />

            <Gate y={yRCGate} label="Issues created +" sublabel="team agreed on root causes?" />
            <Arrow x={CX} y1={yRCGate + hGate} y2={yRem} />

            {/* ── REMEDIATION ────────────────────────────────────────────────── */}
            <Stage y={yRem} num={4} title="REMEDIATION" c={C.rem} items={[
              'Action plan drafted',
              'Issue resolution in progress (metric)',
              'Tasks assigned with owners',
              'Progress formally reviewed',
            ]} />
            <Arrow x={CX} y1={yRem + hRem} y2={yRemGate} />

            <Gate y={yRemGate} label="Progress formally reviewed?" />
            <Arrow x={CX} y1={yRemGate + hGate} y2={yComm} />

            {/* ── COMMUNICATION ──────────────────────────────────────────────── */}
            <Stage y={yComm} num={5} title="COMMUNICATION" c={C.comm} items={[
              'Findings report prepared',
              'Leadership briefed',
              'Employees informed via announcement',
              'Documentation archived',
            ]} />
            <Arrow x={CX} y1={yComm + hComm} y2={yCommGate} />

            <Gate y={yCommGate} label="Employees updated with outcomes?" />
            <Arrow x={CX} y1={yCommGate + hGate} y2={yVal} />

            {/* ── VALIDATION ─────────────────────────────────────────────────── */}
            <Stage y={yVal} num={6} title="VALIDATION" c={C.val} items={[
              'Follow-up plan in place',
              'Improvement metrics reviewed',
              'Success criteria evaluated',
              'Program outcomes documented',
            ]} />
            <Arrow x={CX} y1={yVal + hVal} y2={yValGate} />

            <Gate y={yValGate} label="Success criteria evaluated?" />
            <Arrow x={CX} y1={yValGate + hGate} y2={yEnd} />

            {/* ── COMPLETED ──────────────────────────────────────────────────── */}
            <Terminal y={yEnd} label="PROGRAM COMPLETED"
              fill="#16a34a" stroke="#15803d" textFill="white" />

          </svg>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Legend</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex items-center gap-2.5 text-xs text-gray-600">
              <div className="w-8 h-5 rounded-full bg-gray-800 flex-shrink-0" />
              Start / End terminal
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-600">
              <div className="w-8 h-5 rounded bg-slate-100 border border-slate-300 flex-shrink-0" />
              Process / Stage
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-600">
              <svg width="32" height="20" viewBox="0 0 32 20">
                <polygon points="16,0 32,10 16,20 0,10" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1.5" />
              </svg>
              Gate (must pass to advance)
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-600">
              <div className="w-8 h-5 rounded bg-gray-50 border border-gray-300 border-dashed flex-shrink-0" />
              Cancelled (SVP only)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
