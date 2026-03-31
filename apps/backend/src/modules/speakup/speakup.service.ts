import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as dayjs from 'dayjs';
import {
  SpeakUpCase,
  CaseStatus,
  CaseCategory,
  CaseUrgency,
  CasePrivacy,
  CaseRoutedTo,
} from './entities/speak-up-case.entity';
import { SpeakUpActivity, ActivityType } from './entities/speak-up-activity.entity';
import { Issue, IssueSource, IssueSeverity } from '../issues/entities/issue.entity';

// ── Auto-routing rules ────────────────────────────────────────────────────────
// Safety always goes to CNO; leadership/culture concerns → HR;
// urgent cases escalate beyond preferred; everything else → preferred level
function computeRouting(
  category: CaseCategory,
  urgency: CaseUrgency,
  preferred: CaseRoutedTo,
): CaseRoutedTo {
  if (category === CaseCategory.SAFETY) return CaseRoutedTo.CNO;
  if (category === CaseCategory.LEADERSHIP || category === CaseCategory.CULTURE) return CaseRoutedTo.HR;
  if (urgency === CaseUrgency.URGENT && preferred === CaseRoutedTo.DIRECTOR) return CaseRoutedTo.CNO;
  return preferred;
}

const OPEN_STATUSES = [
  CaseStatus.NEW,
  CaseStatus.ACKNOWLEDGED,
  CaseStatus.SCHEDULED,
  CaseStatus.IN_PROGRESS,
];

@Injectable()
export class SpeakUpService {
  constructor(
    @InjectRepository(SpeakUpCase) private readonly repo: Repository<SpeakUpCase>,
    @InjectRepository(SpeakUpActivity) private readonly actRepo: Repository<SpeakUpActivity>,
    @InjectRepository(Issue) private readonly issueRepo: Repository<Issue>,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async nextCaseNumber(): Promise<string> {
    const prefix = `SU-${dayjs().format('YYYYMM')}-`;
    const count = await this.repo.count();
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private async logActivity(
    caseId: string,
    type: ActivityType,
    content: string,
    actorId?: string,
    actorName?: string,
    metadata?: any,
  ) {
    return this.actRepo.save(
      this.actRepo.create({ caseId, type, content, actorId, actorName, metadata }),
    );
  }

  // ── Submission ────────────────────────────────────────────────────────────

  async submit(data: any, userId?: string) {
    const privacy: CasePrivacy = data.privacy ?? CasePrivacy.ANONYMOUS;
    const urgency: CaseUrgency = data.urgency ?? CaseUrgency.NORMAL;
    const category: CaseCategory = data.category ?? CaseCategory.OTHER;
    const preferred: CaseRoutedTo = data.preferredLevel ?? CaseRoutedTo.HR;

    if (!data.description) throw new BadRequestException('description is required');

    const slaHours = urgency === CaseUrgency.URGENT ? 24 : 72;
    const slaDeadline = dayjs().add(slaHours, 'hour').toDate();
    const caseNumber = await this.nextCaseNumber();
    const routedTo = computeRouting(category, urgency, preferred);

    const entry = this.repo.create({
      caseNumber,
      category,
      description: data.description,
      message: data.description, // backward compat
      privacy,
      urgency,
      preferredLevel: preferred,
      routedTo,
      status: CaseStatus.NEW,
      slaDeadline,
      isAnonymous: privacy === CasePrivacy.ANONYMOUS,
      submittedById: privacy === CasePrivacy.ANONYMOUS ? null : userId,
      submitterName: privacy === CasePrivacy.ANONYMOUS ? null : (data.submitterName ?? null),
      orgUnitId: data.orgUnitId ?? null,
      hospitalId: data.hospitalId ?? null,
    });

    const saved = await this.repo.save(entry) as unknown as SpeakUpCase;
    await this.logActivity(
      saved.id,
      ActivityType.CREATED,
      `Case ${caseNumber} submitted`,
      undefined,
      undefined,
      { privacy, routedTo, urgency, category },
    );
    return saved;
  }

  // ── Case management ───────────────────────────────────────────────────────

  findAll(query: any = {}) {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.createdAt', 'DESC');
    if (query.status)     qb.andWhere('c.status = :status',         { status: query.status });
    if (query.urgency)    qb.andWhere('c.urgency = :urgency',       { urgency: query.urgency });
    if (query.category)   qb.andWhere('c.category = :category',     { category: query.category });
    if (query.routedTo)   qb.andWhere('c.routedTo = :routedTo',     { routedTo: query.routedTo });
    if (query.orgUnitId)  qb.andWhere('c.orgUnitId = :orgUnitId',   { orgUnitId: query.orgUnitId });
    if (query.hospitalId) qb.andWhere('c.hospitalId = :hospitalId', { hospitalId: query.hospitalId });
    return qb.getMany();
  }

  async findOne(id: string): Promise<SpeakUpCase> {
    const c = await this.repo.findOne({ where: { id }, relations: ['activities'] });
    if (!c) throw new NotFoundException(`Case ${id} not found`);
    if (c.activities) {
      c.activities.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    return c;
  }

  async acknowledge(id: string, userId: string) {
    const c = await this.findOne(id);
    if (c.status !== CaseStatus.NEW) {
      throw new BadRequestException(`Case is not NEW (current: ${c.status})`);
    }
    await this.repo.update(id, { status: CaseStatus.ACKNOWLEDGED, acknowledgedAt: new Date() });
    await this.logActivity(id, ActivityType.STATUS_CHANGED, 'Case acknowledged', userId, undefined, {
      from: CaseStatus.NEW, to: CaseStatus.ACKNOWLEDGED,
    });
    return this.findOne(id);
  }

  async addNote(id: string, content: string, userId: string, actorName?: string) {
    if (!content?.trim()) throw new BadRequestException('Note content is required');
    await this.findOne(id); // verify exists
    await this.logActivity(id, ActivityType.NOTE_ADDED, content, userId, actorName);
    return this.findOne(id);
  }

  async scheduleMeeting(id: string, data: { meetingDate: string; notes?: string }, userId: string) {
    const c = await this.findOne(id);
    const canSchedule: CaseStatus[] = [CaseStatus.ACKNOWLEDGED, CaseStatus.IN_PROGRESS, CaseStatus.NEW];
    if (!canSchedule.includes(c.status)) {
      throw new BadRequestException(`Cannot schedule meeting when status is ${c.status}`);
    }
    if (!data.meetingDate) throw new BadRequestException('meetingDate is required');

    await this.repo.update(id, {
      status: CaseStatus.SCHEDULED,
      meetingScheduledAt: new Date(),
      meetingDate: data.meetingDate,
    });
    const note = `Meeting scheduled for ${data.meetingDate}${data.notes ? ': ' + data.notes : ''}`;
    await this.logActivity(id, ActivityType.MEETING_SCHEDULED, note, userId, undefined, {
      meetingDate: data.meetingDate, notes: data.notes,
    });
    return this.findOne(id);
  }

  async recordOutcome(
    id: string,
    outcome: { rootCause: string; summary: string; actionRequired: string; owner: string },
    userId: string,
  ) {
    if (!outcome.rootCause || !outcome.summary || !outcome.actionRequired || !outcome.owner) {
      throw new BadRequestException('All outcome fields are required: rootCause, summary, actionRequired, owner');
    }
    const c = await this.findOne(id);
    // Move to IN_PROGRESS once outcome is recorded (meeting happened)
    const nextStatus = c.status === CaseStatus.SCHEDULED ? CaseStatus.IN_PROGRESS : c.status;
    await this.repo.update(id, { outcome, status: nextStatus });
    await this.logActivity(
      id,
      ActivityType.OUTCOME_RECORDED,
      `Outcome recorded: ${outcome.summary}`,
      userId,
      undefined,
      { outcome },
    );
    return this.findOne(id);
  }

  async resolve(id: string, userId: string) {
    const c = await this.findOne(id);
    if (!c.outcome) {
      throw new BadRequestException('Cannot resolve case without recording a meeting outcome first');
    }
    if (c.status === CaseStatus.RESOLVED) {
      throw new BadRequestException('Case is already resolved');
    }
    await this.repo.update(id, { status: CaseStatus.RESOLVED, resolvedAt: new Date() });
    await this.logActivity(id, ActivityType.STATUS_CHANGED, 'Case resolved', userId, undefined, {
      from: c.status, to: CaseStatus.RESOLVED,
    });
    return this.findOne(id);
  }

  async escalate(id: string, userId: string) {
    const c = await this.findOne(id);
    if (c.status === CaseStatus.RESOLVED) {
      throw new BadRequestException('Cannot escalate a resolved case');
    }
    await this.repo.update(id, { status: CaseStatus.ESCALATED });
    await this.logActivity(id, ActivityType.ESCALATED, 'Case escalated to senior leadership', userId, undefined, {
      from: c.status,
    });
    return this.findOne(id);
  }

  // ── Convert to Issue ──────────────────────────────────────────────────────

  async convertToIssue(id: string, userId: string) {
    const c = await this.findOne(id);
    if (c.convertedToIssueId) {
      throw new BadRequestException('Case has already been converted to an issue');
    }

    const desc = c.description ?? c.message ?? '';
    const issue = this.issueRepo.create({
      title: `Speak Up: ${desc.slice(0, 80)}`,
      description: desc,
      source: IssueSource.SPEAK_UP,
      severity: c.urgency === CaseUrgency.URGENT ? IssueSeverity.HIGH : IssueSeverity.MEDIUM,
      category: c.category,
      orgUnitId: c.orgUnitId ?? undefined,
      hospitalId: c.hospitalId ?? undefined,
      createdById: userId,
    });

    const savedIssue = await this.issueRepo.save(issue) as unknown as Issue;
    await this.repo.update(id, { convertedToIssueId: savedIssue.id });
    await this.logActivity(
      id,
      ActivityType.ISSUE_LINKED,
      `Linked to issue: ${savedIssue.title}`,
      userId,
      undefined,
      { issueId: savedIssue.id },
    );
    return { case: await this.findOne(id), issue: savedIssue };
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  async getMetrics() {
    const [total, open, acknowledged, scheduled, inProgress, resolved, escalated] =
      await Promise.all([
        this.repo.count(),
        this.repo.count({ where: { status: CaseStatus.NEW } }),
        this.repo.count({ where: { status: CaseStatus.ACKNOWLEDGED } }),
        this.repo.count({ where: { status: CaseStatus.SCHEDULED } }),
        this.repo.count({ where: { status: CaseStatus.IN_PROGRESS } }),
        this.repo.count({ where: { status: CaseStatus.RESOLVED } }),
        this.repo.count({ where: { status: CaseStatus.ESCALATED } }),
      ]);

    const openCases = await this.repo.find({ where: { status: In(OPEN_STATUSES) } });
    const now = new Date();
    const overdue = openCases.filter(
      (c) => c.slaDeadline && new Date(c.slaDeadline) < now,
    ).length;

    const urgent = await this.repo.count({ where: { urgency: CaseUrgency.URGENT } });
    const anonymous = await this.repo.count({ where: { privacy: CasePrivacy.ANONYMOUS } });

    return {
      total,
      open,
      acknowledged,
      scheduled,
      inProgress,
      resolved,
      escalated,
      overdue,
      urgent,
      anonymous,
    };
  }
}
