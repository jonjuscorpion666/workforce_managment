'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, BarChart2, Users, Star, ChevronDown, ChevronUp,
  MessageSquare, TrendingDown, ExternalLink, Hash,
} from 'lucide-react';
import api from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number | null) {
  if (score === null) return 'text-gray-400';
  if (score < 40) return 'text-red-600';
  if (score < 65) return 'text-amber-600';
  return 'text-green-600';
}

function scoreBg(score: number | null) {
  if (score === null) return 'bg-gray-100 text-gray-500';
  if (score < 40) return 'bg-red-100 text-red-700';
  if (score < 65) return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function typeLabel(type: string) {
  const MAP: Record<string, string> = {
    LIKERT_5: 'Likert 1–5', LIKERT_10: 'Likert 1–10', NPS: 'NPS 0–10',
    YES_NO: 'Yes / No', MULTIPLE_CHOICE: 'Multiple choice',
    OPEN_TEXT: 'Open text', RATING: 'Rating 1–5',
  };
  return MAP[type] ?? type;
}

// ── Distribution bar ──────────────────────────────────────────────────────────

function DistributionBar({ distribution, type, options }: { distribution: Record<string, number>; type: string; options: string[] }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-xs text-gray-400 italic">No responses</p>;

  // Build ordered keys
  let keys: string[];
  if (type === 'LIKERT_5' || type === 'RATING') keys = ['1','2','3','4','5'];
  else if (type === 'LIKERT_10') keys = ['1','2','3','4','5','6','7','8','9','10'];
  else if (type === 'NPS') keys = ['0','1','2','3','4','5','6','7','8','9','10'];
  else if (type === 'YES_NO') keys = ['true','false','1','0'];
  else if (type === 'MULTIPLE_CHOICE' && options?.length) keys = options;
  else keys = Object.keys(distribution).sort();

  const relevant = keys.filter((k) => distribution[k]);

  return (
    <div className="space-y-1.5">
      {relevant.map((key) => {
        const count = distribution[key] ?? 0;
        const pct = Math.round((count / total) * 100);
        const label = type === 'YES_NO'
          ? (key === 'true' || key === '1' ? 'Yes' : 'No')
          : key;
        const isLow = (type === 'LIKERT_5' || type === 'RATING') && Number(key) <= 2;
        const isHigh = (type === 'LIKERT_5' || type === 'RATING') && Number(key) >= 4;
        const barColor = isLow ? 'bg-red-400' : isHigh ? 'bg-green-400' : 'bg-blue-400';

        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16 flex-shrink-0 text-right">{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-500 w-12 flex-shrink-0">{count} <span className="text-gray-400">({pct}%)</span></span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'questions' | 'responses' | 'opentext';

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function SurveyResultsPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('from') || `/surveys/${id}/edit`;
  const [tab, setTab]                   = useState<Tab>('questions');
  const [expanded, setExpanded]         = useState<Set<number>>(new Set());
  const [page, setPage]                 = useState(0);
  const [filterRole, setFilterRole]     = useState('');
  const [filterUnit, setFilterUnit]     = useState('');

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['survey-results', id],
    queryFn: () => api.get(`/surveys/${id}/results`).then((r) => r.data),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Failed to load results.</p>
    </div>
  );

  const { survey, summary, questionAnalysis, responses, openTextAnswers } = data;

  // Filtered + paginated responses
  const filtered = responses.filter((r: any) => {
    if (filterRole && r.role !== filterRole) return false;
    if (filterUnit && r.orgUnitName !== filterUnit) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageSlice  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const allRoles = Array.from(new Set(responses.map((r: any) => r.role).filter(Boolean))) as string[];
  const allUnits = Array.from(new Set(responses.map((r: any) => r.orgUnitName).filter(Boolean))) as string[];

  function toggleExpand(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <Link href={fromUrl} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
            <ArrowLeft className="w-4 h-4" /> {fromUrl.startsWith('/program-flow') ? 'Back to Program' : 'Back to survey'}
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{survey.title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{survey.type} · {survey.status}</p>
            </div>
            <Link href={`/analytics?surveyId=${id}`}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex-shrink-0">
              <ExternalLink className="w-4 h-4" /> More analytics
            </Link>
          </div>

          {/* Summary strip */}
          <div className="flex items-center gap-6 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">{summary.responseCount} responses</span>
            </div>
            {summary.avgScore !== null && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-gray-700">
                  Avg score: <span className={scoreColor(summary.avgScore)}>{summary.avgScore}/100</span>
                </span>
              </div>
            )}
            {summary.dateRange && (
              <span className="text-sm text-gray-400">
                {formatDate(summary.dateRange.first)} – {formatDate(summary.dateRange.last)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-5xl mx-auto flex gap-0">
          {([
            { key: 'questions', label: 'Question Analysis',      icon: BarChart2 },
            { key: 'responses', label: 'Individual Responses',   icon: Users },
            { key: 'opentext',  label: `Open Text (${openTextAnswers.length})`, icon: MessageSquare },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* ── Tab 1: Question Analysis ───────────────────────────────────────── */}
        {tab === 'questions' && (
          <div className="space-y-4">
            {questionAnalysis.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">No questions found.</p>
            )}
            {questionAnalysis.map((q: any, i: number) => (
              <div key={q.questionId} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0 mt-0.5">Q{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{q.text}</p>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{typeLabel(q.type)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">{q.responseCount} responses</span>
                    {q.avgScore !== null && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreBg(q.avgScore)}`}>
                        {q.avgScore}/100
                      </span>
                    )}
                  </div>
                </div>

                {q.type === 'OPEN_TEXT' ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 italic">
                    <MessageSquare className="w-4 h-4" />
                    Open text — {q.responseCount} answer{q.responseCount !== 1 ? 's' : ''}.
                    <button onClick={() => setTab('opentext')} className="text-blue-500 hover:text-blue-700 not-italic font-medium">View in Open Text tab →</button>
                  </div>
                ) : (
                  <DistributionBar distribution={q.distribution} type={q.type} options={q.options} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Tab 2: Individual Responses ────────────────────────────────────── */}
        {tab === 'responses' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(0); }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">All roles</option>
                {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={filterUnit} onChange={(e) => { setFilterUnit(e.target.value); setPage(0); }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">All units</option>
                {allUnits.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              {(filterRole || filterUnit) && (
                <button onClick={() => { setFilterRole(''); setFilterUnit(''); setPage(0); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline">Clear filters</button>
              )}
              <span className="text-sm text-gray-400 ml-auto">{filtered.length} of {responses.length} shown</span>
            </div>

            {filtered.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">No responses match the selected filters.</p>
            )}

            {/* Response rows */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {pageSlice.map((r: any) => {
                const isOpen = expanded.has(r.index);
                return (
                  <div key={r.index} className="border-b border-gray-100 last:border-0">
                    {/* Row header */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(r.index)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 text-left transition-colors">
                      <Hash className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      <span className="text-xs font-bold text-gray-500 w-8 flex-shrink-0">#{r.index}</span>
                      <span className="text-xs text-gray-500 w-28 flex-shrink-0">{formatDate(r.submittedAt)}</span>
                      <span className="text-xs text-gray-600 w-24 flex-shrink-0">{r.role ?? '—'}</span>
                      <span className="text-xs text-gray-600 w-24 flex-shrink-0">{r.shift ?? '—'}</span>
                      <span className="text-xs text-gray-600 flex-1 truncate">{r.orgUnitName ?? '—'}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{r.answers.length} answers</span>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>

                    {/* Expanded answers */}
                    {isOpen && (
                      <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 space-y-2">
                        {r.answers.map((ans: any, ai: number) => (
                          <div key={ai} className="flex items-start gap-3 py-1.5 border-b border-gray-100 last:border-0">
                            <span className="text-[10px] font-bold text-gray-400 w-6 flex-shrink-0 mt-0.5">Q{ai + 1}</span>
                            <p className="text-xs text-gray-500 w-72 flex-shrink-0">{ans.questionText}</p>
                            <div className="flex-1">
                              {ans.questionType === 'OPEN_TEXT' ? (
                                <p className="text-xs text-gray-700 italic">"{ans.value}"</p>
                              ) : ans.questionType === 'YES_NO' ? (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ans.value === true || ans.value === 'true' || ans.value === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {ans.value === true || ans.value === 'true' || ans.value === 1 ? 'Yes' : 'No'}
                                </span>
                              ) : Array.isArray(ans.value) ? (
                                <div className="flex flex-wrap gap-1">
                                  {ans.value.map((v: string, vi: number) => (
                                    <span key={vi} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{v}</span>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold ${scoreColor(
                                    ans.questionType === 'LIKERT_5' || ans.questionType === 'RATING'
                                      ? ((Number(ans.value) - 1) / 4) * 100
                                      : ans.questionType === 'LIKERT_10'
                                        ? ((Number(ans.value) - 1) / 9) * 100
                                        : ans.questionType === 'NPS'
                                          ? (Number(ans.value) / 10) * 100
                                          : null
                                  )}`}>{ans.value}</span>
                                  {(ans.questionType === 'LIKERT_5' || ans.questionType === 'RATING') && (
                                    <span className="text-xs text-gray-400">/ 5</span>
                                  )}
                                  {ans.questionType === 'LIKERT_10' && (
                                    <span className="text-xs text-gray-400">/ 10</span>
                                  )}
                                  {ans.questionType === 'NPS' && (
                                    <span className="text-xs text-gray-400">/ 10</span>
                                  )}
                                </div>
                              )}
                              {ans.text && (
                                <p className="text-xs text-gray-500 italic mt-1">Follow-up: "{ans.text}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Open Text ───────────────────────────────────────────────── */}
        {tab === 'opentext' && (
          <div className="space-y-8">
            {openTextAnswers.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">No open-text questions in this survey.</p>
            )}
            {openTextAnswers.map((q: any) => (
              <div key={q.questionId}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-800">{q.questionText}</h3>
                  <span className="text-xs text-gray-400">({q.answers.length} answer{q.answers.length !== 1 ? 's' : ''})</span>
                </div>
                <div className="space-y-2">
                  {q.answers.map((ans: any) => (
                    <div key={ans.responseIndex} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                      <p className="text-sm text-gray-700 leading-relaxed">"{ans.value}"</p>
                      <p className="text-[10px] text-gray-400 mt-2">Response #{ans.responseIndex} · {formatDate(ans.submittedAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
