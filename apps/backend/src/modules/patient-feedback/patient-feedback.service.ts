import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as crypto from 'crypto';
import {
  FeedbackLocation, FeedbackLocationStatus, FeedbackLocationType,
} from './entities/feedback-location.entity';
import {
  PatientFeedback, FeedbackChannel, FeedbackSeverity,
} from './entities/patient-feedback.entity';
import { FeedbackTicket, FeedbackTicketStatus } from './entities/feedback-ticket.entity';
import { User } from '../auth/entities/user.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { EscalationsService } from '../escalations/escalations.service';
import { AuditService } from '../audit/audit.service';
import {
  FEEDBACK_QUESTIONS, FEEDBACK_FORM_META, classifyFeedback, SLA_HOURS,
} from './patient-feedback.constants';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'SVP', 'HR_ANALYST'];
const AUDIT_ENTITY = 'feedback_ticket';

interface RequestUser { id: string; email?: string; roles?: string[] }

interface TicketScope {
  all: boolean;
  hospitalId?: string | null;
  orgUnitId?: string | null;
}

// Unambiguous alphabet (no 0/O, 1/I) for human-printed tokens.
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class PatientFeedbackService {
  constructor(
    @InjectRepository(FeedbackLocation) private readonly locationRepo: Repository<FeedbackLocation>,
    @InjectRepository(PatientFeedback)  private readonly feedbackRepo: Repository<PatientFeedback>,
    @InjectRepository(FeedbackTicket)   private readonly ticketRepo:   Repository<FeedbackTicket>,
    @InjectRepository(User)             private readonly userRepo:     Repository<User>,
    @InjectRepository(OrgUnit)          private readonly orgRepo:      Repository<OrgUnit>,
    private readonly escalations: EscalationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Resolve what tickets/responses a requesting user may see (design §9/§11):
   *  - SUPER_ADMIN / SVP / HR_ANALYST → everything
   *  - CNO                            → their hospital
   *  - VP / DIRECTOR / MANAGER        → their own ward (org unit), else hospital
   */
  private async resolveScope(reqUser?: RequestUser): Promise<TicketScope> {
    if (!reqUser?.id) return { all: true };
    const roles = reqUser.roles ?? [];
    if (roles.some((r) => ELEVATED_ROLES.includes(r))) return { all: true };

    const user = await this.userRepo.findOne({
      where: { id: reqUser.id },
      relations: ['orgUnit', 'orgUnit.parent', 'orgUnit.parent.parent'],
    });
    if (!user?.orgUnit) return { all: true }; // no org context → don't over-restrict

    // Walk up to the hospital ancestor.
    let node: any = user.orgUnit;
    let hospitalId: string | null = null;
    while (node) {
      if (node.level === 'HOSPITAL') { hospitalId = node.id; break; }
      node = node.parent ?? null;
    }

    if (roles.includes('CNO')) return { all: false, hospitalId };
    // Ward-level leaders are scoped to their own unit.
    if (user.orgUnit.level === 'UNIT') {
      return { all: false, orgUnitId: user.orgUnit.id };
    }
    return { all: false, hospitalId };
  }

  /**
   * Resolve the owner for a location: the hospital's CNO is always assigned.
   * Falls back to the ward (UNIT) manager/director only when the hospital has
   * no CNO on record, so a ticket is never left unassigned.
   */
  private async resolveSupervisor(loc: FeedbackLocation): Promise<string | null> {
    const cno = await this.cnoForHospital(loc.hospitalId);
    if (cno) return cno;

    if (loc.orgUnitId) {
      const mgr = await this.userRepo
        .createQueryBuilder('u')
        .leftJoin('u.roles', 'r')
        .leftJoin('u.orgUnit', 'ou')
        .where('ou.id = :ou', { ou: loc.orgUnitId })
        .andWhere('r.name IN (:...roles)', { roles: ['MANAGER', 'DIRECTOR'] })
        .orderBy('u.firstName', 'ASC')
        .getOne();
      if (mgr) return mgr.id;
    }
    return null;
  }

  // ── Public form ────────────────────────────────────────────────────────────

  getFormDefinition() {
    return { ...FEEDBACK_FORM_META, questions: FEEDBACK_QUESTIONS };
  }

  /** Resolve a QR token → location display (no patient data). Public. */
  async resolveToken(token: string) {
    const loc = await this.locationRepo.findOne({ where: { token } });
    if (!loc || loc.status !== FeedbackLocationStatus.ACTIVE) {
      throw new NotFoundException('This feedback code is not active. Please ask staff for help.');
    }
    return {
      token: loc.token,
      locationType: loc.locationType,
      ward: loc.ward,
      room: loc.room,
      bed: loc.bed,
      department: loc.department,
      display:
        loc.locationType === FeedbackLocationType.BED
          ? `Ward ${loc.ward} | Room ${loc.room ?? '-'} | Bed ${loc.bed ?? '-'}`
          : `Ward ${loc.ward} | ${loc.department}`,
      form: this.getFormDefinition(),
    };
  }

  /** Submit feedback. Anonymous — classifies and opens a ticket if needed. */
  async submit(body: any, req: any) {
    const { token, answers, comment, rating, locationMismatch } = body ?? {};
    if (!token) throw new BadRequestException('Missing feedback code');
    if (!answers || typeof answers !== 'object') {
      throw new BadRequestException('Answers are required');
    }

    const loc = await this.locationRepo.findOne({ where: { token } });
    if (!loc || loc.status !== FeedbackLocationStatus.ACTIVE) {
      throw new NotFoundException('This feedback code is not active.');
    }

    const numericRating =
      rating === undefined || rating === null || rating === '' ? null : Number(rating);

    const { severity, reasons } = classifyFeedback(answers, numericRating);

    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown';
    const ipHash = crypto.createHash('sha256').update(String(ip) + token).digest('hex');

    const answerRows = FEEDBACK_QUESTIONS
      .filter((q) => q.type !== 'TEXT' && answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '')
      .map((q) => ({ questionId: q.id, label: q.text, answer: answers[q.id] }));

    const feedback = await this.feedbackRepo.save(
      this.feedbackRepo.create({
        token,
        locationId: loc.id,
        channel:
          loc.locationType === FeedbackLocationType.WARD
            ? FeedbackChannel.QR_WARD
            : FeedbackChannel.QR_BED,
        rating: numericRating ?? undefined,
        answers: answerRows,
        comment: comment || null,
        severity,
        locationMismatch: !!locationMismatch,
        hospitalId: loc.hospitalId ?? null,
        ipHash,
      }),
    );

    let ticket: FeedbackTicket | null = null;
    if (severity !== FeedbackSeverity.GREEN) {
      ticket = await this.createTicket(feedback, loc, reasons);
    }

    return {
      ok: true,
      severity,
      ticketNumber: ticket?.ticketNumber ?? null,
    };
  }

  private async createTicket(
    feedback: PatientFeedback,
    loc: FeedbackLocation,
    reasons: string[],
  ) {
    const count = await this.ticketRepo.count();
    const ticketNumber = `FB-${String(count + 1).padStart(6, '0')}`;
    const dueAt = new Date(Date.now() + SLA_HOURS[feedback.severity] * 3600_000);
    const assignedToId = await this.resolveSupervisor(loc);

    const ticket = await this.ticketRepo.save(
      this.ticketRepo.create({
        ticketNumber,
        feedbackId: feedback.id,
        locationId: loc.id,
        orgUnitId: loc.orgUnitId ?? null,
        severity: feedback.severity,
        status: FeedbackTicketStatus.OPEN,
        department: loc.department,
        hospitalId: loc.hospitalId ?? null,
        assignedToId: assignedToId ?? null,
        actionTaken: reasons.length ? `Auto-flagged: ${reasons.join('; ')}` : null,
        dueAt,
      }),
    );

    this.audit.log(
      AUDIT_ENTITY, ticket.id, 'CREATE', 'system', null, ticket,
      `${ticket.ticketNumber} (${ticket.severity})`, 'System', 'SYSTEM',
    );

    // RED / CRITICAL get an immediate escalation so a supervisor is alerted
    // even before the SLA clock runs out (design §6/§7/§14).
    if (
      (feedback.severity === FeedbackSeverity.RED ||
        feedback.severity === FeedbackSeverity.CRITICAL) &&
      assignedToId
    ) {
      await this.escalations.trigger({
        entityType: AUDIT_ENTITY,
        entityId: ticket.id,
        reason: `PATIENT_FEEDBACK_${feedback.severity}`,
        level: feedback.severity === FeedbackSeverity.CRITICAL ? 2 : 1,
        escalatedToId: assignedToId,
      });
      ticket.escalatedAt = new Date();
      await this.ticketRepo.save(ticket);
    }

    return ticket;
  }

  // ── Location master / QR ───────────────────────────────────────────────────

  private async genUniqueToken(prefix: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      let body = '';
      const bytes = crypto.randomBytes(6);
      for (let i = 0; i < 6; i++) body += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
      const token = `${prefix}${body}`;
      const exists = await this.locationRepo.findOne({ where: { token } });
      if (!exists) return token;
    }
    throw new BadRequestException('Could not generate a unique token, please retry');
  }

  listLocations(query: any = {}) {
    const qb = this.locationRepo.createQueryBuilder('l').orderBy('l.ward', 'ASC')
      .addOrderBy('l.room', 'ASC').addOrderBy('l.bed', 'ASC');
    if (query.ward)         qb.andWhere('l.ward = :ward', { ward: query.ward });
    if (query.status)       qb.andWhere('l.status = :status', { status: query.status });
    if (query.locationType) qb.andWhere('l.locationType = :lt', { lt: query.locationType });
    if (query.hospitalId)   qb.andWhere('l.hospitalId = :h', { h: query.hospitalId });
    return qb.getMany();
  }

  async createLocation(body: any) {
    const locationType: FeedbackLocationType =
      body.locationType === FeedbackLocationType.WARD
        ? FeedbackLocationType.WARD
        : FeedbackLocationType.BED;
    if (locationType === FeedbackLocationType.BED && (!body.room || !body.bed)) {
      throw new BadRequestException('room and bed are required for a bed location');
    }

    // Ward (UNIT) and hospital come from the shared org tree. The ward label is
    // derived from the selected UNIT's name unless one is explicitly provided.
    let ward: string | null = body.ward ?? null;
    let hospitalId: string | null = body.hospitalId ?? null;
    if (body.orgUnitId) {
      const unit = await this.orgRepo.findOne({
        where: { id: body.orgUnitId },
        relations: ['parent', 'parent.parent'],
      });
      if (!unit) throw new BadRequestException('Selected ward (org unit) not found');
      if (!ward) ward = unit.name;
      if (!hospitalId) {
        let node: any = unit;
        while (node && node.level !== 'HOSPITAL') node = node.parent ?? null;
        hospitalId = node?.id ?? null;
      }
    }
    if (!ward) throw new BadRequestException('A ward (org unit) or ward name is required');

    const token = await this.genUniqueToken(
      locationType === FeedbackLocationType.WARD ? 'W' : 'B',
    );
    return this.locationRepo.save(
      this.locationRepo.create({
        token,
        ward,
        room: locationType === FeedbackLocationType.BED ? body.room : null,
        bed: locationType === FeedbackLocationType.BED ? body.bed : null,
        locationType,
        department: body.department || 'Inpatient Nursing',
        hospitalId,
        orgUnitId: body.orgUnitId ?? null,
        status: FeedbackLocationStatus.ACTIVE,
      }),
    );
  }

  /** Bulk-create beds for a ward/room range. */
  async bulkCreateLocations(body: any) {
    const { ward, orgUnitId, rooms, bedsPerRoom, department, hospitalId } = body ?? {};
    if ((!ward && !orgUnitId) || !Array.isArray(rooms) || !bedsPerRoom) {
      throw new BadRequestException('a ward (org unit) or ward name, rooms[] and bedsPerRoom are required');
    }
    const created: FeedbackLocation[] = [];
    for (const room of rooms) {
      for (let b = 1; b <= Number(bedsPerRoom); b++) {
        created.push(
          await this.createLocation({
            ward, orgUnitId, room: String(room), bed: String(b),
            locationType: FeedbackLocationType.BED, department, hospitalId,
          }),
        );
      }
    }
    return { created: created.length, locations: created };
  }

  async updateLocation(id: string, body: any) {
    const loc = await this.locationRepo.findOne({ where: { id } });
    if (!loc) throw new NotFoundException('Location not found');
    Object.assign(loc, {
      ward: body.ward ?? loc.ward,
      room: body.room ?? loc.room,
      bed: body.bed ?? loc.bed,
      department: body.department ?? loc.department,
      hospitalId: body.hospitalId ?? loc.hospitalId,
      orgUnitId: body.orgUnitId ?? loc.orgUnitId,
      status: body.status ?? loc.status,
    });
    return this.locationRepo.save(loc);
  }

  async deleteLocation(id: string) {
    const loc = await this.locationRepo.findOne({ where: { id } });
    if (!loc) throw new NotFoundException('Location not found');
    // Soft-disable rather than hard-delete so historical feedback keeps context.
    loc.status = FeedbackLocationStatus.INACTIVE;
    await this.locationRepo.save(loc);
    return { ok: true };
  }

  // ── Tickets ────────────────────────────────────────────────────────────────

  async listTickets(query: any = {}, reqUser?: RequestUser) {
    const scope = await this.resolveScope(reqUser);
    const qb = this.ticketRepo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');
    if (query.status)     qb.andWhere('t.status = :status', { status: query.status });
    if (query.severity)   qb.andWhere('t.severity = :sev', { sev: query.severity });
    if (query.hospitalId) qb.andWhere('t.hospitalId = :h', { h: query.hospitalId });
    if (query.assignedToId) qb.andWhere('t.assignedToId = :a', { a: query.assignedToId });

    if (!scope.all) {
      if (scope.orgUnitId) qb.andWhere('t.orgUnitId = :sou', { sou: scope.orgUnitId });
      else if (scope.hospitalId) qb.andWhere('t.hospitalId = :sh', { sh: scope.hospitalId });
      else qb.andWhere('1 = 0'); // scoped user with no resolvable org → see nothing
    }

    const tickets = await qb.getMany();
    return this.enrichTickets(tickets);
  }

  async getTicketHistory(id: string) {
    const rows = await this.audit.getByEntity(id);
    return rows.filter((r: any) => r.entityType === AUDIT_ENTITY);
  }

  async getTicket(id: string) {
    const t = await this.ticketRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');
    const [enriched] = await this.enrichTickets([t]);
    return enriched;
  }

  async updateTicket(id: string, body: any, reqUser?: RequestUser) {
    const t = await this.ticketRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');
    const before = { ...t };

    if (body.status) t.status = body.status;
    if (body.assignedToId !== undefined) t.assignedToId = body.assignedToId || null;
    if (body.actionTaken !== undefined) t.actionTaken = body.actionTaken;

    // First human touch — used for "average response time" analytics.
    if (!t.firstRespondedAt && reqUser?.id) t.firstRespondedAt = new Date();

    if (
      (body.status === FeedbackTicketStatus.RESOLVED ||
        body.status === FeedbackTicketStatus.CLOSED) &&
      !t.closedAt
    ) {
      t.closedAt = new Date();
    }
    if (body.status && body.status !== FeedbackTicketStatus.CLOSED && body.status !== FeedbackTicketStatus.RESOLVED) {
      t.closedAt = null;
    }

    const saved = await this.ticketRepo.save(t);
    this.audit.log(
      AUDIT_ENTITY, saved.id, 'UPDATE', reqUser?.id ?? 'system', before, saved,
      `${saved.ticketNumber} (${saved.severity})`,
      reqUser?.email ?? 'System', (reqUser?.roles ?? [])[0] ?? 'SYSTEM',
    );
    return saved;
  }

  private async enrichTickets(tickets: FeedbackTicket[]) {
    if (!tickets.length) return [];
    const fbIds = tickets.map((t) => t.feedbackId);
    const locIds = tickets.map((t) => t.locationId).filter(Boolean) as string[];
    const userIds = tickets.map((t) => t.assignedToId).filter(Boolean) as string[];

    const [feedbacks, locations, users] = await Promise.all([
      fbIds.length ? this.feedbackRepo.find({ where: { id: In(fbIds) } }) : [],
      locIds.length ? this.locationRepo.find({ where: { id: In(locIds) } }) : [],
      userIds.length
        ? this.userRepo.find({ where: { id: In(userIds) }, select: ['id', 'firstName', 'lastName', 'jobTitle'] as any })
        : [],
    ]);
    const fbMap = new Map(feedbacks.map((f) => [f.id, f] as [string, typeof f]));
    const locMap = new Map(locations.map((l) => [l.id, l] as [string, typeof l]));
    const userMap = new Map(users.map((u) => [u.id, u] as [string, typeof u]));

    return tickets.map((t) => {
      const fb = fbMap.get(t.feedbackId);
      const loc = t.locationId ? locMap.get(t.locationId) : undefined;
      const u = t.assignedToId ? userMap.get(t.assignedToId) : undefined;
      return {
        ...t,
        locationDisplay: loc
          ? `Ward ${loc.ward} | Room ${loc.room ?? '-'} | Bed ${loc.bed ?? '-'}`
          : 'Unknown location',
        feedback: fb
          ? { rating: fb.rating, answers: fb.answers, comment: fb.comment, submittedAt: fb.submittedAt, locationMismatch: fb.locationMismatch }
          : null,
        assignedToName: u ? `${u.firstName} ${u.lastName}` : null,
      };
    });
  }

  // ── Dashboards ─────────────────────────────────────────────────────────────

  async dashboard(query: any = {}) {
    const fbQb = this.feedbackRepo.createQueryBuilder('f');
    const tkQb = this.ticketRepo.createQueryBuilder('t');
    if (query.hospitalId) {
      fbQb.andWhere('f.hospitalId = :h', { h: query.hospitalId });
      tkQb.andWhere('t.hospitalId = :h', { h: query.hospitalId });
    }
    const [feedbacks, tickets, locations] = await Promise.all([
      fbQb.getMany(),
      tkQb.getMany(),
      this.locationRepo.find(),
    ]);

    const total = feedbacks.length;
    const bySeverity = {
      GREEN: feedbacks.filter((f) => f.severity === FeedbackSeverity.GREEN).length,
      YELLOW: feedbacks.filter((f) => f.severity === FeedbackSeverity.YELLOW).length,
      RED: feedbacks.filter((f) => f.severity === FeedbackSeverity.RED).length,
      CRITICAL: feedbacks.filter((f) => f.severity === FeedbackSeverity.CRITICAL).length,
    };
    const positive = bySeverity.GREEN;
    const negative = bySeverity.YELLOW + bySeverity.RED + bySeverity.CRITICAL;

    const openTickets = tickets.filter(
      (t) => t.status === FeedbackTicketStatus.OPEN || t.status === FeedbackTicketStatus.IN_PROGRESS,
    );
    const closed = tickets.filter((t) => t.closedAt);
    const avg = (xs: number[]) =>
      xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
    const avgClosureHours = avg(
      closed.map((t) => (new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600_000),
    );
    const avgResponseHours = avg(
      tickets
        .filter((t) => t.firstRespondedAt)
        .map((t) => (new Date(t.firstRespondedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600_000),
    );

    const now = Date.now();
    const breached = openTickets.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < now).length;
    const pendingOver24h = openTickets.filter(
      (t) => now - new Date(t.createdAt).getTime() > 24 * 3600_000,
    ).length;

    // Most common negative issue (top "No"/flag answer across negative feedback)
    const issueCount: Record<string, number> = {};
    for (const f of feedbacks) {
      if (f.severity === FeedbackSeverity.GREEN) continue;
      for (const a of f.answers ?? []) {
        const q = FEEDBACK_QUESTIONS.find((x) => x.id === a.questionId);
        if (!q) continue;
        const isNeg =
          (q.negativeIf && a.answer === q.negativeIf) ||
          (q.escalateIf && a.answer === q.escalateIf);
        if (isNeg) issueCount[q.text] = (issueCount[q.text] ?? 0) + 1;
      }
    }
    const mostCommonIssue =
      Object.entries(issueCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Per-ward rollup
    const locMap = new Map(locations.map((l) => [l.id, l] as [string, typeof l]));
    const wardAgg: Record<string, { total: number; negative: number }> = {};
    for (const f of feedbacks) {
      const ward = (f.locationId && locMap.get(f.locationId)?.ward) || 'Unknown';
      wardAgg[ward] ??= { total: 0, negative: 0 };
      wardAgg[ward].total += 1;
      if (f.severity !== FeedbackSeverity.GREEN) wardAgg[ward].negative += 1;
    }
    const wards = Object.entries(wardAgg)
      .map(([ward, v]) => ({
        ward,
        total: v.total,
        negative: v.negative,
        positivePct: v.total ? Math.round(((v.total - v.negative) / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.negative - a.negative);

    // 8-week trend (oldest → newest)
    const WEEK = 7 * 24 * 3600_000;
    const trend: { week: string; total: number; negative: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = now - i * WEEK;
      const start = end - WEEK;
      const inWeek = feedbacks.filter((f) => {
        const ts = new Date(f.submittedAt).getTime();
        return ts >= start && ts < end;
      });
      trend.push({
        week: new Date(start).toISOString().slice(5, 10),
        total: inWeek.length,
        negative: inWeek.filter((f) => f.severity !== FeedbackSeverity.GREEN).length,
      });
    }

    return {
      total,
      bySeverity,
      positivePct: total ? Math.round((positive / total) * 100) : 0,
      negativePct: total ? Math.round((negative / total) * 100) : 0,
      openCritical: openTickets.filter((t) => t.severity === FeedbackSeverity.CRITICAL).length,
      openRed: openTickets.filter((t) => t.severity === FeedbackSeverity.RED).length,
      openYellow: openTickets.filter((t) => t.severity === FeedbackSeverity.YELLOW).length,
      openTotal: openTickets.length,
      slaBreached: breached,
      pendingOver24h,
      avgClosureHours,
      avgResponseHours,
      mostCommonIssue,
      wardWithMostComplaints: wards[0]?.ward ?? null,
      bestWard:
        [...wards].sort((a, b) => b.positivePct - a.positivePct)[0]?.ward ?? null,
      wards,
      trend,
    };
  }

  // ── Browse all feedback + CSV export ───────────────────────────────────────

  async listResponses(query: any = {}, reqUser?: RequestUser) {
    const scope = await this.resolveScope(reqUser);
    const qb = this.feedbackRepo.createQueryBuilder('f').orderBy('f.submittedAt', 'DESC');
    if (query.severity)   qb.andWhere('f.severity = :sev', { sev: query.severity });
    if (query.hospitalId) qb.andWhere('f.hospitalId = :h', { h: query.hospitalId });
    if (query.channel)    qb.andWhere('f.channel = :c', { c: query.channel });

    if (!scope.all) {
      if (scope.hospitalId) qb.andWhere('f.hospitalId = :sh', { sh: scope.hospitalId });
      else if (!scope.orgUnitId) qb.andWhere('1 = 0');
    }

    let feedbacks = await qb.limit(Number(query.limit ?? 500)).getMany();

    const locs = await this.locationRepo.find();
    const locMap = new Map(locs.map((l) => [l.id, l] as [string, typeof l]));

    // Unit-scoped users are filtered by their ward's locations.
    if (!scope.all && scope.orgUnitId) {
      const allowed = new Set(
        locs.filter((l) => l.orgUnitId === scope.orgUnitId).map((l) => l.id),
      );
      feedbacks = feedbacks.filter((f) => f.locationId && allowed.has(f.locationId));
    }

    return feedbacks.map((f) => {
      const loc = f.locationId ? locMap.get(f.locationId) : undefined;
      return {
        id: f.id,
        submittedAt: f.submittedAt,
        severity: f.severity,
        channel: f.channel,
        rating: f.rating ?? null,
        comment: f.comment ?? null,
        locationMismatch: f.locationMismatch,
        ward: loc?.ward ?? null,
        room: loc?.room ?? null,
        bed: loc?.bed ?? null,
        locationDisplay: loc
          ? loc.locationType === FeedbackLocationType.BED
            ? `Ward ${loc.ward} | Room ${loc.room ?? '-'} | Bed ${loc.bed ?? '-'}`
            : `Ward ${loc.ward} | ${loc.department}`
          : 'Unknown',
        answers: f.answers,
      };
    });
  }

  async responsesCsv(query: any = {}, reqUser?: RequestUser): Promise<string> {
    const rows = await this.listResponses({ ...query, limit: 5000 }, reqUser);
    const cols = ['submittedAt', 'severity', 'channel', 'rating', 'locationDisplay', 'locationMismatch', 'comment'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = cols.join(',');
    const lines = rows.map((r: any) =>
      cols.map((c) => esc(c === 'submittedAt' ? new Date(r[c]).toISOString() : r[c])).join(','),
    );
    return [header, ...lines].join('\n');
  }

  // ── Overdue auto-escalation (called by the scheduler) ──────────────────────

  async escalateOverdue(): Promise<number> {
    const now = new Date();
    const overdue = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.status IN (:...open)', {
        open: [FeedbackTicketStatus.OPEN, FeedbackTicketStatus.IN_PROGRESS],
      })
      .andWhere('t.dueAt < :now', { now })
      .andWhere('t.escalatedAt IS NULL')
      .getMany();

    let escalated = 0;
    for (const t of overdue) {
      const to = t.assignedToId || (await this.cnoForHospital(t.hospitalId));
      if (!to) continue;
      await this.escalations.trigger({
        entityType: AUDIT_ENTITY,
        entityId: t.id,
        reason: 'PATIENT_FEEDBACK_SLA_BREACH',
        level: t.severity === FeedbackSeverity.CRITICAL ? 3 : 2,
        escalatedToId: to,
      });
      t.escalatedAt = now;
      await this.ticketRepo.save(t);
      this.audit.log(
        AUDIT_ENTITY, t.id, 'ESCALATE', 'system', null, t,
        `${t.ticketNumber} (${t.severity})`, 'System', 'SYSTEM',
      );
      escalated++;
    }
    return escalated;
  }

  private async cnoForHospital(hospitalId?: string | null): Promise<string | null> {
    if (!hospitalId) return null;
    const cno = await this.userRepo
      .createQueryBuilder('u')
      .leftJoin('u.roles', 'r')
      .leftJoin('u.orgUnit', 'ou')
      .where('ou.id = :h', { h: hospitalId })
      .andWhere('r.name = :cno', { cno: 'CNO' })
      .getOne();
    return cno?.id ?? null;
  }
}
