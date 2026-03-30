import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from '../responses/entities/response.entity';
import { Issue } from '../issues/entities/issue.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../auth/entities/user.entity';

// ── Dimension → question ID mapping ─────────────────────────────────────────
// Each dimension maps to one multiple-choice question in the survey.
// "Favorable" = respondent selected 0 or 1 option (minimal concerns).
// "Unfavorable" = respondent selected 2+ options (multiple pain points).
const DIMENSIONS: Record<string, string> = {
  'Advocacy':              '495e268f-0c96-4806-a0b0-d112f46140fd',
  'Organizational Pride':  'b08d970b-a15b-4509-a7b8-84d0e3dea07a',
  'Workload & Wellbeing':  '0691315c-d67e-463e-a7a0-0efb90c89485',
  'Meaningful Work':       '7a183bfe-fc02-45ea-b940-d6fad40e6918',
  'Recognition':           'a85e330e-2fa5-4d7b-a03b-44d01cb5a980',
  'Leadership Comms':      '0d9702ae-3368-4b8d-99b4-28775a1353e8',
  'Psychological Safety':  '27d98147-2dc1-422d-a2a8-69d84129e12f',
  'Manager Feedback':      '3e68409f-e841-46bb-8c8d-6ffd7f41a520',
  'Professional Growth':   '3ba99fad-5025-4cb9-b0c6-3bc1d5fe8663',
  'Overall Experience':    '37f73d3f-cc15-44a1-b6ba-4a8360b9df09',
};

function favorableScore(answers: any[], questionId: string): number | null {
  const answer = answers.find((a: any) => a.questionId === questionId);
  if (!answer) return null;
  const val = answer.value;
  // Multiple-choice: array of selected options
  if (Array.isArray(val)) {
    // Favorable = 0 or 1 selection (few pain points)
    return val.length <= 1 ? 100 : 0;
  }
  return null;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Response) private readonly responseRepo: Repository<Response>,
    @InjectRepository(Issue)    private readonly issueRepo:    Repository<Issue>,
    @InjectRepository(OrgUnit)  private readonly orgRepo:      Repository<OrgUnit>,
    @InjectRepository(Task)     private readonly taskRepo:     Repository<Task>,
    @InjectRepository(User)     private readonly userRepo:     Repository<User>,
  ) {}

  // ── Low-Performing Units ──────────────────────────────────────────────────

  async getLowPerformingUnits(query: any) {
    const threshold = parseInt(query.threshold ?? '70', 10);
    const surveyId  = query.surveyId ?? null;

    // Fetch all responses that have an orgUnitId
    const qb = this.responseRepo.createQueryBuilder('r')
      .where('r."orgUnitId" IS NOT NULL');
    if (surveyId) qb.andWhere('r."surveyId" = :surveyId', { surveyId });
    const responses = await qb.getMany();

    if (responses.length === 0) return { threshold, units: [] };

    // Group by orgUnitId
    const grouped = new Map<string, any[]>();
    for (const r of responses) {
      const uid = r.orgUnitId;
      if (!grouped.has(uid)) grouped.set(uid, []);
      grouped.get(uid)!.push(r);
    }

    // Fetch org unit names + hospital names
    const orgUnitIds  = [...grouped.keys()];
    const hospitalIds = [...new Set(responses.map((r) => r.hospitalId).filter(Boolean))];
    const allOrgIds   = [...new Set([...orgUnitIds, ...hospitalIds])];
    const orgUnits    = await this.orgRepo.findByIds(allOrgIds);
    const orgMap      = new Map(orgUnits.map((u) => [u.id, u]));

    const result = [];

    for (const [orgUnitId, unitResponses] of grouped) {
      const orgUnit  = orgMap.get(orgUnitId);
      const dimScores: Record<string, number> = {};
      let   totalFavorable = 0;
      let   totalScored    = 0;

      for (const [dimension, questionId] of Object.entries(DIMENSIONS)) {
        const scores = unitResponses
          .map((r) => favorableScore(r.answers, questionId))
          .filter((s): s is number => s !== null);

        if (scores.length > 0) {
          const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          dimScores[dimension] = avg;
          totalFavorable += avg;
          totalScored    += 1;
        }
      }

      const overallFavorable = totalScored > 0
        ? Math.round(totalFavorable / totalScored)
        : 0;

      if (overallFavorable < threshold) {
        const hospitalId = unitResponses[0]?.hospitalId ?? null;
        result.push({
          orgUnitId,
          orgUnitName:       orgUnit?.name ?? orgUnitId,
          hospitalId,
          hospitalName:      hospitalId ? (orgMap.get(hospitalId)?.name ?? hospitalId) : null,
          level:             orgUnit?.level ?? 'UNKNOWN',
          responseCount:     unitResponses.length,
          overallFavorable,
          dimensions:        dimScores,
          lowestDimension:   Object.entries(dimScores).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null,
          lowestScore:       Object.values(dimScores).sort((a, b) => a - b)[0] ?? null,
        });
      }
    }

    // Sort by overallFavorable ascending (worst first)
    result.sort((a, b) => a.overallFavorable - b.overallFavorable);

    return { threshold, units: result };
  }

  // ── Heatmap ───────────────────────────────────────────────────────────────

  async getHeatmap(query: any) {
    const surveyId = query.surveyId ?? null;
    const dimNames = Object.keys(DIMENSIONS);

    const qb = this.responseRepo.createQueryBuilder('r')
      .where('r."orgUnitId" IS NOT NULL');
    if (surveyId) qb.andWhere('r."surveyId" = :surveyId', { surveyId });
    const responses = await qb.getMany();

    if (responses.length === 0) return { dimensions: dimNames, units: [] };

    const grouped = new Map<string, any[]>();
    for (const r of responses) {
      if (!grouped.has(r.orgUnitId)) grouped.set(r.orgUnitId, []);
      grouped.get(r.orgUnitId)!.push(r);
    }

    const orgUnitIds = [...grouped.keys()];
    const orgUnits   = await this.orgRepo.findByIds(orgUnitIds);
    const orgMap     = new Map(orgUnits.map((u) => [u.id, u]));

    const units = [];
    for (const [orgUnitId, unitResponses] of grouped) {
      const scores: Record<string, number | null> = {};
      for (const [dimension, questionId] of Object.entries(DIMENSIONS)) {
        const vals = unitResponses
          .map((r) => favorableScore(r.answers, questionId))
          .filter((s): s is number => s !== null);
        scores[dimension] = vals.length > 0
          ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          : null;
      }
      units.push({
        orgUnitId,
        orgUnitName:   orgMap.get(orgUnitId)?.name ?? orgUnitId,
        hospitalId:    unitResponses[0]?.hospitalId ?? null,
        responseCount: unitResponses.length,
        scores,
      });
    }

    units.sort((a, b) => {
      const sum = (scores: Record<string, number | null>) =>
        Object.values(scores).filter((v): v is number => v !== null).reduce((s, v) => s + v, 0);
      return sum(a.scores) - sum(b.scores);
    });

    return { dimensions: dimNames, units };
  }

  // ── Trends ────────────────────────────────────────────────────────────────

  async getTrends(query: any) {
    const { orgUnitId, surveyId, hospitalId } = query;
    const qb = this.responseRepo.createQueryBuilder('r').orderBy('r."submittedAt"', 'ASC');
    if (orgUnitId)  qb.andWhere('r."orgUnitId" = :orgUnitId',   { orgUnitId });
    if (hospitalId) qb.andWhere('r."hospitalId" = :hospitalId', { hospitalId });
    if (surveyId)   qb.andWhere('r."surveyId" = :surveyId',     { surveyId });
    const responses = await qb.getMany();

    // Group into monthly buckets
    const buckets = new Map<string, any[]>();
    for (const r of responses) {
      const d     = new Date(r.submittedAt);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(r);
    }

    const cycles = [];
    for (const [period, periodResponses] of buckets) {
      const dimScores: Record<string, number> = {};
      for (const [dimension, questionId] of Object.entries(DIMENSIONS)) {
        const vals = periodResponses
          .map((r) => favorableScore(r.answers, questionId))
          .filter((s): s is number => s !== null);
        if (vals.length > 0) {
          dimScores[dimension] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      }
      cycles.push({ period, responseCount: periodResponses.length, dimensions: dimScores });
    }

    return { orgUnitId, cycles };
  }

  // ── Sentiment (open-text themes) ─────────────────────────────────────────

  async getSentiment(query: { surveyId?: string; orgUnitId?: string }) {
    const { surveyId, orgUnitId } = query;

    const openTextQIds = [
      '34bb1570-0731-4279-a58d-ae602e1e35ef',
      'bdbd694a-92e6-4114-9399-51125cef9f33',
      '1e8d86e4-cfdf-413e-b16b-093253c10a79',
      '1b26f838-5b8b-4d33-8d92-bdd555aae7b4',
      '0dc416eb-77db-4e8a-8994-5199fdb763b0',
      '3f4d9a5b-dfaa-4e0d-9895-2bcf2b247946',
      'a15ca59f-61ec-4422-a7da-d96f9c1bbb08',
      '0bf66b37-335b-463c-aa54-4e6307d76fd9',
      'da5b0288-8647-43b5-ba28-1d38179f885a',
      '2e30c69f-60db-4249-be01-c7d6511dd6c3',
    ];

    const where: any = {};
    if (surveyId)  where.surveyId  = surveyId;
    if (orgUnitId) where.orgUnitId = orgUnitId;
    const responses = await this.responseRepo.find({ where });

    // Extract (text, sentiment-classified) pairs per response so we can
    // classify sentiment at the response level (not fragment level)
    const NEG = ['not', "don't", "never", "lack", "poor", "no ", "without", "absent", "fail", "dismiss", "unsustain", "ignor", "exhaust", "burnout", "overw"];
    const POS = ['great', 'excellent', 'proud', 'love', 'improve', 'better', 'appreciate', 'thank', 'amazing', 'wonderful', 'positive', 'strong', 'passion'];

    const THEME_KEYWORDS: Record<string, string[]> = {
      'Staffing':            ['staffing', 'ratio', 'shortage', 'float', 'overtime', 'beds', 'nurse-patient', 'understaffed'],
      'Recognition':         ['recogni', 'appreciat', 'invisible', 'valued', 'seen', 'acknowledge', 'reward'],
      'Leadership':          ['leadership', 'leader', 'manager', 'supervisor', 'cno', 'svp', 'director', 'charge'],
      'Communication':       ['communicat', 'messag', 'transparent', 'inform', 'announc', 'update', 'notif'],
      'Career Growth':       ['career', 'growth', 'promot', 'develop', 'advance', 'certif', 'residency', 'mentor', 'ceu'],
      'Burnout / Wellbeing': ['burnout', 'exhaust', 'stress', 'overwhelm', 'fatigue', 'decompres', 'wellbeing', 'mental health'],
      'Safety':              ['safety', 'safe', 'incident', 'retaliat', 'speak up', 'error', 'near-miss', 'protocol'],
      'Feedback':            ['feedback', 'review', 'one-on-one', 'check-in', 'preceptor', 'performance', 'evaluation'],
      'Teamwork':            ['team', 'collaborat', 'cowork', 'interpersonal', 'huddle', 'morale', 'culture'],
      'Mission & Meaning':   ['mission', 'meaning', 'purpose', 'impact', 'patient', 'care', 'outcome', 'why i'],
    };

    const themeCounts: Record<string, number> = {};
    // Store up to 5 unique quotes per theme with their sentiment
    const themeQuotes: Record<string, Array<{ text: string; sentiment: 'positive' | 'negative' | 'neutral' }>> = {};

    let positive = 0, negative = 0, neutral = 0;
    const textFragments: string[] = [];

    for (const r of responses) {
      for (const a of (r.answers ?? [])) {
        if (!openTextQIds.includes(a.questionId)) continue;
        if (typeof a.value !== 'string' || !a.value.trim()) continue;

        const text  = a.value.trim();
        const lower = text.toLowerCase();
        textFragments.push(text);

        // Classify sentiment
        const negHits = NEG.filter((w) => lower.includes(w)).length;
        const posHits = POS.filter((w) => lower.includes(w)).length;
        const sentiment: 'positive' | 'negative' | 'neutral' =
          posHits > negHits ? 'positive' : negHits > posHits ? 'negative' : 'neutral';
        if (sentiment === 'positive') positive++;
        else if (sentiment === 'negative') negative++;
        else neutral++;

        // Tag themes
        for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
          if (keywords.some((kw) => lower.includes(kw))) {
            themeCounts[theme] = (themeCounts[theme] ?? 0) + 1;
            if (!themeQuotes[theme]) themeQuotes[theme] = [];
            // Prefer showing both positive and negative quotes; cap at 5 unique texts
            const existing = themeQuotes[theme];
            if (existing.length < 5 && !existing.find((q) => q.text === text)) {
              existing.push({ text, sentiment });
            }
          }
        }
      }
    }

    // Sort quotes within each theme: negatives first (root cause focus)
    for (const theme of Object.keys(themeQuotes)) {
      themeQuotes[theme].sort((a, b) => {
        const order = { negative: 0, neutral: 1, positive: 2 };
        return order[a.sentiment] - order[b.sentiment];
      });
    }

    const themes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => ({
        theme,
        count,
        negativeCount: themeQuotes[theme]?.filter((q) => q.sentiment === 'negative').length ?? 0,
        quotes: themeQuotes[theme] ?? [],
      }));

    // Resolve org unit name if filtered
    let orgUnitName: string | null = null;
    if (orgUnitId) {
      const unit = await this.orgRepo.findOne({ where: { id: orgUnitId } });
      orgUnitName = unit?.name ?? null;
    }

    return {
      surveyId:           surveyId ?? null,
      orgUnitId:          orgUnitId ?? null,
      orgUnitName,
      totalTextResponses: textFragments.length,
      sentimentDistribution: { positive, neutral, negative },
      themes,
    };
  }

  // ── SVP Executive Dashboard ───────────────────────────────────────────────

  async getSvpDashboard(query: any) {
    const surveyId = query.surveyId ?? null;

    // ── Responses ──────────────────────────────────────────────────────────
    const rQb = this.responseRepo.createQueryBuilder('r')
      .where('r."orgUnitId" IS NOT NULL');
    if (surveyId) rQb.andWhere('r."surveyId" = :surveyId', { surveyId });
    const responses = await rQb.getMany();

    // Group by orgUnitId
    const byUnit = new Map<string, any[]>();
    for (const r of responses) {
      if (!byUnit.has(r.orgUnitId)) byUnit.set(r.orgUnitId, []);
      byUnit.get(r.orgUnitId)!.push(r);
    }

    // Group by hospitalId for hospital-level heatmap
    const byHospital = new Map<string, any[]>();
    for (const r of responses) {
      const hid = r.hospitalId ?? r.orgUnitId;
      if (!byHospital.has(hid)) byHospital.set(hid, []);
      byHospital.get(hid)!.push(r);
    }

    // Fetch all org unit names needed
    const allOrgIds = [...new Set([
      ...byUnit.keys(),
      ...byHospital.keys(),
      ...responses.map(r => r.hospitalId).filter(Boolean),
    ])];
    const orgUnits = allOrgIds.length ? await this.orgRepo.findByIds(allOrgIds) : [];
    const orgMap = new Map(orgUnits.map(u => [u.id, u]));

    // ── Compute per-unit dimension scores ──────────────────────────────────
    const unitScores: Record<string, { dims: Record<string, number>; overall: number; count: number; hospitalId: string }> = {};

    for (const [uid, unitResps] of byUnit) {
      const dims: Record<string, number> = {};
      let total = 0, scored = 0;
      for (const [dim, qid] of Object.entries(DIMENSIONS)) {
        const vals = unitResps.map(r => favorableScore(r.answers, qid)).filter((s): s is number => s !== null);
        if (vals.length) {
          const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
          dims[dim] = avg;
          total += avg;
          scored++;
        }
      }
      unitScores[uid] = {
        dims,
        overall: scored ? Math.round(total / scored) : 0,
        count: unitResps.length,
        hospitalId: unitResps[0]?.hospitalId ?? '',
      };
    }

    // ── Overall engagement score ────────────────────────────────────────────
    const allOveralls = Object.values(unitScores).map(u => u.overall);
    const overallEngagement = allOveralls.length
      ? Math.round(allOveralls.reduce((a, b) => a + b, 0) / allOveralls.length)
      : 0;

    // ── Hospital heatmap ────────────────────────────────────────────────────
    const hospitalHeatmap = [];
    for (const [hid, hospResps] of byHospital) {
      const dims: Record<string, number | null> = {};
      let total = 0, scored = 0;
      for (const [dim, qid] of Object.entries(DIMENSIONS)) {
        const vals = hospResps.map(r => favorableScore(r.answers, qid)).filter((s): s is number => s !== null);
        if (vals.length) {
          const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
          dims[dim] = avg;
          total += avg;
          scored++;
        } else {
          dims[dim] = null;
        }
      }
      hospitalHeatmap.push({
        hospitalId: hid,
        hospitalName: orgMap.get(hid)?.name ?? hid,
        overallScore: scored ? Math.round(total / scored) : 0,
        responseCount: hospResps.length,
        dimensions: dims,
      });
    }
    hospitalHeatmap.sort((a, b) => a.overallScore - b.overallScore);

    // ── Top 5 problem dimensions ────────────────────────────────────────────
    const dimAgg: Record<string, number[]> = {};
    for (const { dims } of Object.values(unitScores)) {
      for (const [d, s] of Object.entries(dims)) {
        if (!dimAgg[d]) dimAgg[d] = [];
        dimAgg[d].push(s);
      }
    }
    const topProblems = Object.entries(dimAgg)
      .map(([dimension, scores]) => ({
        dimension,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        unitCount: scores.length,
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    // ── Low-performing units ────────────────────────────────────────────────
    const THRESHOLD = 70;
    const lowUnits = Object.entries(unitScores)
      .filter(([, u]) => u.overall < THRESHOLD)
      .map(([uid, u]) => ({
        orgUnitId: uid,
        orgUnitName: orgMap.get(uid)?.name ?? uid,
        hospitalName: u.hospitalId ? (orgMap.get(u.hospitalId)?.name ?? u.hospitalId) : null,
        overallScore: u.overall,
        responseCount: u.count,
      }))
      .sort((a, b) => a.overallScore - b.overallScore);

    // ── Burnout trend (Workload & Wellbeing dimension by month) ────────────
    const burnoutQid = DIMENSIONS['Workload & Wellbeing'];
    const burnoutBuckets = new Map<string, number[]>();
    for (const r of responses) {
      const score = favorableScore(r.answers, burnoutQid);
      if (score === null) continue;
      const d = new Date(r.submittedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!burnoutBuckets.has(key)) burnoutBuckets.set(key, []);
      burnoutBuckets.get(key)!.push(score);
    }
    const burnoutTrend = [...burnoutBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, scores]) => ({
        period,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }));

    // ── Retention risk (Advocacy dimension proxy) ──────────────────────────
    const retentionRiskUnits = Object.entries(unitScores)
      .filter(([uid]) => {
        const score = unitScores[uid].dims['Advocacy'];
        return score !== undefined && score < 50;
      })
      .map(([uid]) => ({
        orgUnitName: orgMap.get(uid)?.name ?? uid,
        hospitalName: unitScores[uid].hospitalId
          ? (orgMap.get(unitScores[uid].hospitalId)?.name ?? unitScores[uid].hospitalId)
          : null,
        advocacyScore: unitScores[uid].dims['Advocacy'],
      }))
      .sort((a, b) => (a.advocacyScore ?? 0) - (b.advocacyScore ?? 0));

    // ── eNPS proxy ─────────────────────────────────────────────────────────
    const advocacyQid = DIMENSIONS['Advocacy'];
    let promoters = 0, passives = 0, detractors = 0;
    for (const r of responses) {
      const ans = (r.answers ?? []).find((a: any) => a.questionId === advocacyQid);
      if (!ans || !Array.isArray(ans.value)) continue;
      const n = ans.value.length;
      if (n === 0) promoters++;
      else if (n === 1) passives++;
      else detractors++;
    }
    const eNpsTotal = promoters + passives + detractors;
    const eNps = eNpsTotal
      ? Math.round(((promoters - detractors) / eNpsTotal) * 100)
      : null;

    // ── Issues ─────────────────────────────────────────────────────────────
    const issues = await this.issueRepo.find();
    const issueStats = {
      total: issues.length,
      open: issues.filter(i => i.status === 'OPEN').length,
      inProgress: issues.filter(i => i.status === 'IN_PROGRESS').length,
      blocked: issues.filter(i => i.status === 'BLOCKED').length,
      resolved: issues.filter(i => i.status === 'RESOLVED').length,
      closed: issues.filter(i => i.status === 'CLOSED').length,
      withNoOwner: issues.filter(i => !i.ownerId).length,
      overdue: issues.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && !['RESOLVED','CLOSED'].includes(i.status)).length,
      bySeverity: {
        CRITICAL: issues.filter(i => i.severity === 'CRITICAL').length,
        HIGH:     issues.filter(i => i.severity === 'HIGH').length,
        MEDIUM:   issues.filter(i => i.severity === 'MEDIUM').length,
        LOW:      issues.filter(i => i.severity === 'LOW').length,
      },
    };

    // ── Tasks ──────────────────────────────────────────────────────────────
    const tasks = await this.taskRepo.find();
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && !['DONE','CANCELLED'].includes(t.status));
    const doneTasks = tasks.filter(t => t.status === 'DONE' && t.completedAt && t.createdAt);
    const avgDaysToComplete = doneTasks.length
      ? Math.round(doneTasks.reduce((sum, t) => sum + (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 86400000, 0) / doneTasks.length)
      : null;

    const taskStats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'TODO').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      blocked: tasks.filter(t => t.status === 'BLOCKED').length,
      done: tasks.filter(t => t.status === 'DONE').length,
      cancelled: tasks.filter(t => t.status === 'CANCELLED').length,
      overdue: overdueTasks.length,
      over7Days: overdueTasks.filter(t => (now.getTime() - new Date(t.dueDate!).getTime()) / 86400000 >= 7).length,
      over30Days: overdueTasks.filter(t => (now.getTime() - new Date(t.dueDate!).getTime()) / 86400000 >= 30).length,
      avgDaysToComplete,
    };

    // ── Stuck items (overdue tasks, most delayed first) ────────────────────
    const ownerIds = [...new Set(overdueTasks.map(t => t.ownerId ?? t.assignedToId).filter(Boolean))];
    const owners = ownerIds.length ? await this.userRepo.findByIds(ownerIds) : [];
    const ownerMap = new Map(owners.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    const stuckItems = overdueTasks
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 20)
      .map(t => {
        const oid = t.ownerId ?? t.assignedToId ?? null;
        const daysOverdue = Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / 86400000);
        return {
          id: t.id,
          title: t.title,
          status: t.status,
          ownerId: oid,
          ownerName: oid ? (ownerMap.get(oid) ?? oid) : null,
          orgUnitId: t.orgUnitId,
          orgUnitName: t.orgUnitId ? (orgMap.get(t.orgUnitId)?.name ?? t.orgUnitId) : null,
          daysOverdue,
          dueDate: t.dueDate,
          updatedAt: t.updatedAt,
        };
      });

    // ── Leader scorecard ────────────────────────────────────────────────────
    const leaderTasks = new Map<string, { name: string; total: number; done: number; overdue: number }>();
    for (const t of tasks) {
      const lid = t.ownerId ?? t.assignedToId;
      if (!lid) continue;
      if (!leaderTasks.has(lid)) {
        leaderTasks.set(lid, { name: ownerMap.get(lid) ?? lid, total: 0, done: 0, overdue: 0 });
      }
      const entry = leaderTasks.get(lid)!;
      entry.total++;
      if (t.status === 'DONE') entry.done++;
      if (t.dueDate && new Date(t.dueDate) < now && !['DONE','CANCELLED'].includes(t.status)) entry.overdue++;
    }
    const leaderScorecard = [...leaderTasks.entries()]
      .map(([id, s]) => ({
        ownerId: id,
        ownerName: s.name,
        totalTasks: s.total,
        completed: s.done,
        overdue: s.overdue,
        completionRate: s.total ? Math.round((s.done / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.totalTasks - a.totalTasks);

    // ── Risk alerts ─────────────────────────────────────────────────────────
    const riskAlerts: Array<{ type: string; severity: string; label: string; detail: string }> = [];

    const criticalUnits = Object.entries(unitScores).filter(([, u]) => u.overall < 40);
    if (criticalUnits.length) riskAlerts.push({
      type: 'critical_units',
      severity: 'critical',
      label: `${criticalUnits.length} critical unit(s) below 40% engagement`,
      detail: criticalUnits.map(([uid]) => orgMap.get(uid)?.name ?? uid).join(', '),
    });

    const burnoutScore = burnoutTrend.length
      ? burnoutTrend[burnoutTrend.length - 1].score
      : null;
    if (burnoutScore !== null && burnoutScore < 50) riskAlerts.push({
      type: 'high_burnout',
      severity: burnoutScore < 30 ? 'critical' : 'warning',
      label: `Burnout risk elevated — Workload & Wellbeing at ${burnoutScore}%`,
      detail: 'Latest cycle score below 50% favorable threshold',
    });

    if (retentionRiskUnits.length >= 3) riskAlerts.push({
      type: 'attrition_risk',
      severity: 'warning',
      label: `${retentionRiskUnits.length} unit(s) at high attrition risk`,
      detail: `Low advocacy scores: ${retentionRiskUnits.slice(0, 3).map(u => u.orgUnitName).join(', ')}`,
    });

    if (issueStats.withNoOwner > 0) riskAlerts.push({
      type: 'no_owner',
      severity: 'warning',
      label: `${issueStats.withNoOwner} issue(s) have no assigned owner`,
      detail: 'Unowned issues are at risk of no action',
    });

    if (stuckItems.length > 0) riskAlerts.push({
      type: 'stuck_tasks',
      severity: stuckItems.some(t => t.daysOverdue > 30) ? 'critical' : 'warning',
      label: `${taskStats.overdue} overdue task(s)`,
      detail: `${taskStats.over30Days} tasks overdue by >30 days`,
    });

    return {
      surveyId,
      responseCount: responses.length,
      totalUnitsTracked: byUnit.size,
      overallEngagement,
      eNps,
      lowPerformingUnitsCount: lowUnits.length,
      topProblems,
      lowUnits,
      hospitalHeatmap,
      dimensions: Object.keys(DIMENSIONS),
      burnoutTrend,
      retentionRiskUnits,
      issueStats,
      taskStats,
      stuckItems,
      leaderScorecard,
      riskAlerts,
    };
  }

  // ── Participation ─────────────────────────────────────────────────────────

  async getParticipation(query: any) {
    const qb = this.responseRepo.createQueryBuilder('r')
      .select('r."orgUnitId"', 'orgUnitId')
      .addSelect('r."hospitalId"', 'hospitalId')
      .addSelect('COUNT(*)', 'count')
      .where('r."orgUnitId" IS NOT NULL')
      .groupBy('r."orgUnitId"')
      .addGroupBy('r."hospitalId"');
    if (query.surveyId)   qb.andWhere('r."surveyId" = :surveyId',     { surveyId: query.surveyId });
    if (query.hospitalId) qb.andWhere('r."hospitalId" = :hospitalId', { hospitalId: query.hospitalId });

    const rows = await qb.getRawMany();

    // Resolve org unit names AND hospital names
    const allIds = [
      ...rows.map((r) => r.orgUnitId),
      ...rows.map((r) => r.hospitalId),
    ].filter(Boolean);
    const uniqueIds = [...new Set(allIds)];
    const orgUnits  = uniqueIds.length ? await this.orgRepo.findByIds(uniqueIds) : [];
    const orgMap    = new Map(orgUnits.map((u) => [u.id, u.name]));

    return rows.map((r) => ({
      orgUnitId:    r.orgUnitId,
      orgUnitName:  orgMap.get(r.orgUnitId) ?? r.orgUnitId,
      hospitalId:   r.hospitalId,
      hospitalName: r.hospitalId ? (orgMap.get(r.hospitalId) ?? r.hospitalId) : null,
      count:        parseInt(r.count, 10),
    }));
  }
}
