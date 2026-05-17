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
import {
  FEEDBACK_QUESTIONS, FEEDBACK_FORM_META, classifyFeedback, SLA_HOURS,
} from './patient-feedback.constants';

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
  ) {}

  /**
   * Resolve the nursing supervisor for a location: the ward (UNIT) manager or
   * director, falling back to the hospital's CNO. Returns a user id or null.
   */
  private async resolveSupervisor(loc: FeedbackLocation): Promise<string | null> {
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
    if (loc.hospitalId) {
      const cno = await this.userRepo
        .createQueryBuilder('u')
        .leftJoin('u.roles', 'r')
        .leftJoin('u.orgUnit', 'ou')
        .where('ou.id = :h', { h: loc.hospitalId })
        .andWhere('r.name = :cno', { cno: 'CNO' })
        .getOne();
      if (cno) return cno.id;
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

    return this.ticketRepo.save(
      this.ticketRepo.create({
        ticketNumber,
        feedbackId: feedback.id,
        locationId: loc.id,
        severity: feedback.severity,
        status: FeedbackTicketStatus.OPEN,
        department: loc.department,
        hospitalId: loc.hospitalId ?? null,
        assignedToId: assignedToId ?? null,
        actionTaken: reasons.length ? `Auto-flagged: ${reasons.join('; ')}` : null,
        dueAt,
      }),
    );
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

  async listTickets(query: any = {}) {
    const qb = this.ticketRepo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');
    if (query.status)     qb.andWhere('t.status = :status', { status: query.status });
    if (query.severity)   qb.andWhere('t.severity = :sev', { sev: query.severity });
    if (query.hospitalId) qb.andWhere('t.hospitalId = :h', { h: query.hospitalId });
    if (query.assignedToId) qb.andWhere('t.assignedToId = :a', { a: query.assignedToId });
    const tickets = await qb.getMany();
    return this.enrichTickets(tickets);
  }

  async getTicket(id: string) {
    const t = await this.ticketRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');
    const [enriched] = await this.enrichTickets([t]);
    return enriched;
  }

  async updateTicket(id: string, body: any) {
    const t = await this.ticketRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');
    if (body.status) t.status = body.status;
    if (body.assignedToId !== undefined) t.assignedToId = body.assignedToId || null;
    if (body.actionTaken !== undefined) t.actionTaken = body.actionTaken;
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
    return this.ticketRepo.save(t);
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
    };
    const positive = bySeverity.GREEN;
    const negative = bySeverity.YELLOW + bySeverity.RED;

    const openTickets = tickets.filter(
      (t) => t.status === FeedbackTicketStatus.OPEN || t.status === FeedbackTicketStatus.IN_PROGRESS,
    );
    const closed = tickets.filter((t) => t.closedAt);
    const avgClosureHours = closed.length
      ? Math.round(
          closed.reduce(
            (s, t) => s + (new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600_000,
            0,
          ) / closed.length,
        )
      : null;
    const now = Date.now();
    const breached = openTickets.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < now).length;

    // Per-ward rollup
    const locMap = new Map(locations.map((l) => [l.id, l]));
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

    return {
      total,
      bySeverity,
      positivePct: total ? Math.round((positive / total) * 100) : 0,
      negativePct: total ? Math.round((negative / total) * 100) : 0,
      openRed: openTickets.filter((t) => t.severity === FeedbackSeverity.RED).length,
      openYellow: openTickets.filter((t) => t.severity === FeedbackSeverity.YELLOW).length,
      openTotal: openTickets.length,
      slaBreached: breached,
      avgClosureHours,
      wardWithMostComplaints: wards[0]?.ward ?? null,
      bestWard:
        [...wards].sort((a, b) => b.positivePct - a.positivePct)[0]?.ward ?? null,
      wards,
    };
  }
}
