import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Announcement, AnnouncementStatus, AnnouncementPriority, AudienceMode,
} from './entities/announcement.entity';
import { AnnouncementRecipient } from './entities/announcement-recipient.entity';
import { User } from '../auth/entities/user.entity';
import { AuditService } from '../audit/audit.service';

// Roles that can publish system-wide
const FULL_AUTHORITY_ROLES = ['SVP', 'SUPER_ADMIN'];
const CNO_ROLES            = ['CNP'];
const DIRECTOR_ROLES       = ['DIRECTOR'];

// ── Scope permission map ─────────────────────────────────────────────────────
function canTargetScope(role: string, mode: AudienceMode): boolean {
  if (FULL_AUTHORITY_ROLES.includes(role)) return true;
  if (CNO_ROLES.includes(role)) {
    return [AudienceMode.HOSPITAL, AudienceMode.DEPARTMENT, AudienceMode.UNIT, AudienceMode.ROLE, AudienceMode.COMBINATION].includes(mode);
  }
  if (DIRECTOR_ROLES.includes(role)) {
    return [AudienceMode.DEPARTMENT, AudienceMode.UNIT, AudienceMode.ROLE].includes(mode);
  }
  if (role === 'MANAGER') {
    return [AudienceMode.UNIT, AudienceMode.ROLE].includes(mode);
  }
  return false;
}

// Priority sort weight (lower = higher priority in feed)
const PRIORITY_WEIGHT: Record<string, number> = {
  [AnnouncementPriority.CRITICAL]: 1,
  [AnnouncementPriority.HIGH]:     2,
  [AnnouncementPriority.MEDIUM]:   3,
  [AnnouncementPriority.LOW]:      4,
};

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)          private readonly repo:      Repository<Announcement>,
    @InjectRepository(AnnouncementRecipient) private readonly rcptRepo:  Repository<AnnouncementRecipient>,
    @InjectRepository(User)                  private readonly userRepo:  Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(data: any, createdById: string, createdByRole?: string) {
    const role = createdByRole ?? '';

    if (!canTargetScope(role, data.audienceMode ?? AudienceMode.SYSTEM)) {
      throw new ForbiddenException(`Your role (${role}) cannot create announcements with scope: ${data.audienceMode}`);
    }

    // STAFF cannot create at all
    if (role === 'NURSE' || role === 'STAFF') {
      throw new ForbiddenException('Staff cannot create announcements.');
    }

    // Determine initial status
    const status = data.publishAt ? AnnouncementStatus.SCHEDULED : AnnouncementStatus.DRAFT;

    const announcement = this.repo.create({
      ...data,
      createdById,
      createdByRole: role,
      status,
    });

    const saved = await this.repo.save(announcement) as unknown as Announcement;

    await this.auditService.log(
      'Announcement', saved.id, 'CREATED', createdById,
      null,
      { title: saved.title, status: saved.status, audienceMode: saved.audienceMode },
      saved.title,
    );

    return saved;
  }

  async findAll(query: any = {}) {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const ann = await this.repo.findOne({ where: { id } });
    if (!ann) throw new NotFoundException(`Announcement ${id} not found`);
    return ann;
  }

  async update(id: string, data: any, userId: string) {
    const ann = await this.findOne(id);
    if (ann.status === AnnouncementStatus.PUBLISHED || ann.status === AnnouncementStatus.CANCELLED) {
      throw new BadRequestException(`Cannot edit a ${ann.status} announcement.`);
    }

    const before = { title: ann.title, status: ann.status };
    Object.assign(ann, data);
    const saved = await this.repo.save(ann);

    await this.auditService.log(
      'Announcement', id, 'UPDATED', userId,
      before,
      { title: saved.title, status: saved.status },
      saved.title,
    );

    return saved;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async publish(id: string, userId: string) {
    const ann = await this.findOne(id);
    if (ann.status === AnnouncementStatus.PUBLISHED) {
      throw new BadRequestException('Announcement is already published.');
    }
    if ([AnnouncementStatus.CANCELLED, AnnouncementStatus.ARCHIVED].includes(ann.status)) {
      throw new BadRequestException(`Cannot publish a ${ann.status} announcement.`);
    }

    ann.status      = AnnouncementStatus.PUBLISHED;
    ann.publishedAt = new Date();
    ann.publishedById = userId;
    const saved = await this.repo.save(ann);

    await this.auditService.log(
      'Announcement', id, 'PUBLISHED', userId,
      { status: 'DRAFT' },
      { status: 'PUBLISHED', publishedAt: saved.publishedAt },
      saved.title,
    );

    return saved;
  }

  async cancel(id: string, userId: string) {
    const ann = await this.findOne(id);
    if ([AnnouncementStatus.CANCELLED, AnnouncementStatus.ARCHIVED].includes(ann.status)) {
      throw new BadRequestException(`Announcement is already ${ann.status}.`);
    }

    ann.status      = AnnouncementStatus.CANCELLED;
    ann.cancelledAt = new Date();
    const saved = await this.repo.save(ann);

    await this.auditService.log(
      'Announcement', id, 'CANCELLED', userId,
      { status: ann.status },
      { status: 'CANCELLED' },
      saved.title,
    );

    return saved;
  }

  async archive(id: string, userId: string) {
    const ann = await this.findOne(id);
    ann.status     = AnnouncementStatus.ARCHIVED;
    ann.archivedAt = new Date();
    const saved = await this.repo.save(ann);

    await this.auditService.log(
      'Announcement', id, 'ARCHIVED', userId,
      { status: ann.status },
      { status: 'ARCHIVED' },
      saved.title,
    );

    return saved;
  }

  // ── Scheduled jobs ─────────────────────────────────────────────────────────

  /** Auto-publish scheduled announcements whose publishAt has passed */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledPublish() {
    const now = new Date();
    const due = await this.repo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: AnnouncementStatus.SCHEDULED })
      .andWhere('a.publishAt <= :now', { now })
      .getMany();

    for (const ann of due) {
      ann.status      = AnnouncementStatus.PUBLISHED;
      ann.publishedAt = now;
      await this.repo.save(ann);
    }
  }

  /** Auto-expire published announcements whose expireAt has passed */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processExpiry() {
    const now = new Date();
    await this.repo
      .createQueryBuilder()
      .update(Announcement)
      .set({ status: AnnouncementStatus.EXPIRED })
      .where('status = :status', { status: AnnouncementStatus.PUBLISHED })
      .andWhere('expireAt IS NOT NULL')
      .andWhere('expireAt < :now', { now })
      .execute();
  }

  // ── Personalized feed ──────────────────────────────────────────────────────

  async getFeed(userId: string, userRoles: string[]) {
    // Load the full 3-level org hierarchy: UNIT → DEPARTMENT → HOSPITAL
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['orgUnit', 'orgUnit.parent', 'orgUnit.parent.parent'],
    });

    const orgUnit      = user?.orgUnit ?? null;
    const orgUnitId    = orgUnit?.id   ?? null;
    const hospitalId   = this.resolveAncestorId(orgUnit, 'HOSPITAL');
    const departmentId = this.resolveAncestorId(orgUnit, 'DEPARTMENT');

    const isSVP = userRoles.some((r) => FULL_AUTHORITY_ROLES.includes(r));

    // Base query: only PUBLISHED, not expired
    const qb = this.repo.createQueryBuilder('a')
      .where('a.status = :status', { status: AnnouncementStatus.PUBLISHED })
      .andWhere('(a.expireAt IS NULL OR a.expireAt > NOW())');

    if (!isSVP) {
      // NOTE: camelCase column names must be double-quoted in raw SQL — PostgreSQL
      // lowercases unquoted identifiers, and TypeORM's property mapper breaks when
      // a column reference is followed by ::jsonb casts.
      const q = (col: string) => `a."${col}"`;   // e.g.  a."targetRoles"

      // SYSTEM: everyone always sees these
      const conditions: string[] = [`${q('audienceMode')} = :systemMode`];
      const params: Record<string, any> = { systemMode: AudienceMode.SYSTEM };

      // HOSPITAL scope: user belongs to that hospital at any depth
      if (hospitalId) {
        conditions.push(`(${q('audienceMode')} = :hospitalMode AND ${q('targetOrgUnitIds')}::jsonb @> :hospitalId::jsonb)`);
        params.hospitalMode = AudienceMode.HOSPITAL;
        params.hospitalId   = JSON.stringify([hospitalId]);
      }

      // DEPARTMENT scope: match by department ancestor
      if (departmentId) {
        conditions.push(`(${q('audienceMode')} = :deptMode AND ${q('targetOrgUnitIds')}::jsonb @> :deptId::jsonb)`);
        params.deptMode = AudienceMode.DEPARTMENT;
        params.deptId   = JSON.stringify([departmentId]);
      }

      // UNIT scope: match by user's direct org unit
      if (orgUnitId) {
        conditions.push(`(${q('audienceMode')} = :unitMode AND ${q('targetOrgUnitIds')}::jsonb @> :unitId::jsonb)`);
        params.unitMode = AudienceMode.UNIT;
        params.unitId   = JSON.stringify([orgUnitId]);
      }

      // ROLE scope: match by any of the user's roles
      userRoles.forEach((role, i) => {
        conditions.push(`(${q('audienceMode')} = 'ROLE' AND ${q('targetRoles')}::jsonb @> :role${i}::jsonb)`);
        params[`role${i}`] = JSON.stringify([role]);
      });

      // COMBINATION scope: match if any org ancestor ID OR any role matches
      const orgIds = [orgUnitId, departmentId, hospitalId].filter(Boolean) as string[];
      orgIds.forEach((oid, i) => {
        conditions.push(`(${q('audienceMode')} = 'COMBINATION' AND ${q('targetOrgUnitIds')}::jsonb @> :cOrgId${i}::jsonb)`);
        params[`cOrgId${i}`] = JSON.stringify([oid]);
      });
      userRoles.forEach((role, i) => {
        conditions.push(`(${q('audienceMode')} = 'COMBINATION' AND ${q('targetRoles')}::jsonb @> :cRole${i}::jsonb)`);
        params[`cRole${i}`] = JSON.stringify([role]);
      });

      qb.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    const announcements = await qb.orderBy('a."isPinned"', 'DESC').getMany();

    // Sort by priority weight then publishedAt desc
    announcements.sort((a, b) => {
      const pw = (PRIORITY_WEIGHT[a.priority] ?? 5) - (PRIORITY_WEIGHT[b.priority] ?? 5);
      if (pw !== 0) return pw;
      return new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime();
    });

    // Attach read/ack status per user
    const recipients = await this.rcptRepo.find({
      where: { userId, announcementId: In(announcements.map((a) => a.id)) },
    });
    const rcptMap = new Map(recipients.map((r) => [r.announcementId, r]));

    return announcements.map((ann) => {
      const r = rcptMap.get(ann.id);
      return {
        ...ann,
        isRead:         r?.isRead         ?? false,
        isAcknowledged: r?.isAcknowledged ?? false,
        acknowledgedAt: r?.acknowledgedAt ?? null,
        firstViewedAt:  r?.firstViewedAt  ?? null,
      };
    });
  }

  // ── Read & Acknowledge ─────────────────────────────────────────────────────

  async markRead(announcementId: string, userId: string) {
    const now = new Date();
    let rcpt = await this.rcptRepo.findOne({ where: { announcementId, userId } });

    if (!rcpt) {
      rcpt = this.rcptRepo.create({
        announcementId,
        userId,
        isRead:       true,
        firstViewedAt: now,
        lastViewedAt:  now,
      });
    } else {
      rcpt.isRead        = true;
      rcpt.lastViewedAt  = now;
      if (!rcpt.firstViewedAt) rcpt.firstViewedAt = now;
    }

    return this.rcptRepo.save(rcpt);
  }

  async acknowledge(announcementId: string, userId: string) {
    const ann = await this.findOne(announcementId);
    if (!ann.requiresAcknowledgement) {
      throw new BadRequestException('This announcement does not require acknowledgement.');
    }

    const now = new Date();
    let rcpt = await this.rcptRepo.findOne({ where: { announcementId, userId } });

    if (!rcpt) {
      rcpt = this.rcptRepo.create({
        announcementId,
        userId,
        isRead:           true,
        firstViewedAt:    now,
        lastViewedAt:     now,
        isAcknowledged:   true,
        acknowledgedAt:   now,
      });
    } else {
      if (rcpt.isAcknowledged) return rcpt; // idempotent
      rcpt.isAcknowledged = true;
      rcpt.acknowledgedAt = now;
      rcpt.isRead         = true;
      rcpt.lastViewedAt   = now;
    }

    const saved = await this.rcptRepo.save(rcpt);

    await this.auditService.log(
      'Announcement', announcementId, 'ACKNOWLEDGED', userId,
      { isAcknowledged: false },
      { isAcknowledged: true, acknowledgedAt: now },
    );

    return saved;
  }

  // ── Metrics (for leadership) ───────────────────────────────────────────────

  async getMetrics(id: string) {
    await this.findOne(id); // ensure exists

    const total        = await this.rcptRepo.count({ where: { announcementId: id } });
    const readCount    = await this.rcptRepo.count({ where: { announcementId: id, isRead: true } });
    const ackCount     = await this.rcptRepo.count({ where: { announcementId: id, isAcknowledged: true } });
    const pendingAck   = await this.rcptRepo.count({ where: { announcementId: id, isRead: true, isAcknowledged: false } });

    return {
      totalRecipients:    total,
      readCount,
      readRate:           total ? Math.round((readCount / total) * 100) : 0,
      acknowledgedCount:  ackCount,
      ackRate:            total ? Math.round((ackCount / total) * 100) : 0,
      pendingAcknowledgements: pendingAck,
    };
  }

  /** Summary metrics across all published announcements (leadership dashboard) */
  async getDashboardMetrics() {
    const published = await this.repo.find({ where: { status: AnnouncementStatus.PUBLISHED } });
    const total     = published.length;

    const totalRecipients  = await this.rcptRepo.count();
    const totalRead        = await this.rcptRepo.count({ where: { isRead: true } });
    const totalAcked       = await this.rcptRepo.count({ where: { isAcknowledged: true } });

    const requiresAck = await this.repo.count({
      where: { status: AnnouncementStatus.PUBLISHED, requiresAcknowledgement: true },
    });

    // Breakdown by priority
    const byPriority: Record<string, number> = {};
    for (const ann of published) {
      byPriority[ann.priority] = (byPriority[ann.priority] ?? 0) + 1;
    }

    return {
      totalPublished:      total,
      requiresAcknowledgement: requiresAck,
      totalRecipientEvents: totalRecipients,
      totalRead,
      totalAcknowledged:   totalAcked,
      overallReadRate:     totalRecipients ? Math.round((totalRead / totalRecipients) * 100) : 0,
      overallAckRate:      totalRecipients ? Math.round((totalAcked / totalRecipients) * 100) : 0,
      byPriority,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Walk up the orgUnit chain (up to 3 levels) to find the ancestor with the
   * given level (HOSPITAL or DEPARTMENT).
   * Handles:  UNIT → DEPARTMENT → HOSPITAL
   *           DEPARTMENT → HOSPITAL
   *           HOSPITAL (already at top)
   */
  async bulkSoftDelete(ids: string[]) {
    if (!ids?.length) return { deleted: 0 };
    await this.repo.softDelete(ids);
    return { deleted: ids.length };
  }

  private resolveAncestorId(orgUnit: any, level: 'HOSPITAL' | 'DEPARTMENT'): string | null {
    if (!orgUnit) return null;
    let current = orgUnit;
    while (current) {
      if (current.level === level) return current.id;
      current = current.parent ?? null;
    }
    return null;
  }
}
