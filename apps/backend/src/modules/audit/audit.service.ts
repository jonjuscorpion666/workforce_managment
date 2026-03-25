import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

// Fields worth surfacing in the activity feed (skip noisy metadata)
const TRACKED_FIELDS: Record<string, string> = {
  status:          'Status',
  severity:        'Severity',
  priority:        'Priority',
  title:           'Title',
  ownerId:         'Owner',
  assignedToId:    'Assigned To',
  dueDate:         'Due Date',
  category:        'Category',
  description:     'Description',
  issueLevel:      'Level',
  ownerRole:       'Owner Role',
  stage:           'Stage',
  audienceMode:    'Audience',
  approvalStatus:  'Approval Status',
  escalationLevel: 'Escalation Level',
};

// Tables we can look up entity titles from
const ENTITY_TABLE: Record<string, string> = {
  issues:       'issues',
  tasks:        'tasks',
  surveys:      'surveys',
  Announcement: 'announcements',
  announcement: 'announcements',
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ─── Write ────────────────────────────────────────────────────────────────

  log(
    entityType: string,
    entityId: string,
    action: string,
    performedById: string,
    before: any,
    after: any,
    entityTitle?: string,
    performedByName?: string,
    performedByRole?: string,
  ) {
    const changeLog = this.computeChanges(before, after);
    const entry = this.repo.create({
      entityType,
      entityId,
      action,
      performedById,
      before,
      after,
      changeLog: changeLog.length ? changeLog : null,
      entityTitle: entityTitle ?? null,
      performedByName: performedByName ?? null,
      performedByRole: performedByRole ?? null,
    });
    return this.repo.save(entry);
  }

  // ─── Compute field-level diffs ────────────────────────────────────────────

  private computeChanges(
    before: any,
    after: any,
  ): Array<{ field: string; oldValue: string; newValue: string }> {
    if (!before || !after) return [];
    return Object.entries(TRACKED_FIELDS)
      .filter(([key]) => {
        const oldVal = before[key];
        const newVal = after[key];
        if (oldVal === newVal) return false;
        if (!oldVal && !newVal) return false;
        return true;
      })
      .map(([key, label]) => ({
        field: label,
        oldValue: this.formatValue(before[key]),
        newValue: this.formatValue(after[key]),
      }));
  }

  private formatValue(val: any): string {
    if (val === null || val === undefined || val === '') return '—';
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) return val.split('T')[0];
    return String(val);
  }

  // ─── Read: raw audit table ─────────────────────────────────────────────────

  getByEntity(entityId: string) {
    return this.repo.find({
      where: { entityId },
      order: { timestamp: 'DESC' },
    });
  }

  getAll(query: any) {
    const qb = this.repo.createQueryBuilder('a').orderBy('a.timestamp', 'DESC');
    if (query.entityType)    qb.andWhere('a.entityType = :et',  { et: query.entityType });
    if (query.performedById) qb.andWhere('a.performedById = :uid', { uid: query.performedById });
    if (query.action)        qb.andWhere('a.action = :action',  { action: query.action });
    return qb.limit(200).getMany();
  }

  // ─── Read: enriched activity feed ────────────────────────────────────────
  //
  // Uses raw SQL so it works against the current DB schema regardless of whether
  // the new entity columns (entity_title, change_log, etc.) exist yet.
  // Name and title resolution is always done live via JOIN / subquery.

  async getActivityFeed(query: {
    entityType?: string;
    action?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit  = Math.min(Number(query.limit  ?? 100), 500);
    const offset = Number(query.offset ?? 0);

    const conditions: string[] = [];
    const params: any[]        = [];
    let   p                    = 1;

    if (query.entityType) { conditions.push(`al.entity_type = $${p++}`); params.push(query.entityType); }
    if (query.action)     { conditions.push(`al.action = $${p++}`);      params.push(query.action);     }
    if (query.userId)     { conditions.push(`al.performed_by_id = $${p++}`); params.push(query.userId); }
    if (query.dateFrom)   { conditions.push(`al.timestamp >= $${p++}`);  params.push(query.dateFrom);   }
    if (query.dateTo)     { conditions.push(`al.timestamp <= $${p++}`);  params.push(query.dateTo);     }

    params.push(limit, offset);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows: any[] = await this.dataSource.query(
      `SELECT
         al.id,
         al.entity_type   AS "entityType",
         al.entity_id     AS "entityId",
         al.action,
         al.performed_by_id AS "performedById",
         al.before,
         al.after,
         al.timestamp,
         CONCAT(u.first_name, ' ', u.last_name)  AS "performedByName",
         CASE al.entity_type
           WHEN 'issues'       THEN (SELECT title FROM issues       WHERE id::text = al.entity_id LIMIT 1)
           WHEN 'tasks'        THEN (SELECT title FROM tasks        WHERE id::text = al.entity_id LIMIT 1)
           WHEN 'surveys'      THEN (SELECT title FROM surveys      WHERE id::text = al.entity_id LIMIT 1)
           WHEN 'Announcement' THEN (SELECT title FROM announcements WHERE id::text = al.entity_id LIMIT 1)
           WHEN 'announcement' THEN (SELECT title FROM announcements WHERE id::text = al.entity_id LIMIT 1)
           ELSE NULL
         END AS "entityTitle"
       FROM audit_logs al
       LEFT JOIN users u ON u.id::text = al.performed_by_id
       ${where}
       ORDER BY al.timestamp DESC
       LIMIT $${p++} OFFSET $${p++}`,
      params,
    );

    return rows.map((row) => ({
      ...row,
      performedByName: row.performedByName?.trim() || null,
      changes:         this.computeChanges(row.before, row.after),
    }));
  }
}
