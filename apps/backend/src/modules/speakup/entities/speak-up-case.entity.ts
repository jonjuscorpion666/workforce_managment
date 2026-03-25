import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { SpeakUpActivity } from './speak-up-activity.entity';

export enum CaseCategory {
  STAFFING     = 'STAFFING',
  LEADERSHIP   = 'LEADERSHIP',
  SCHEDULING   = 'SCHEDULING',
  CULTURE      = 'CULTURE',
  SAFETY       = 'SAFETY',
  OTHER        = 'OTHER',
}

export enum CasePrivacy {
  ANONYMOUS    = 'ANONYMOUS',
  CONFIDENTIAL = 'CONFIDENTIAL',
}

export enum CaseUrgency {
  URGENT = 'URGENT',
  NORMAL = 'NORMAL',
}

export enum CaseRoutedTo {
  DIRECTOR = 'DIRECTOR',
  CNO      = 'CNO',
  HR       = 'HR',
}

export enum CaseStatus {
  NEW          = 'NEW',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  SCHEDULED    = 'SCHEDULED',
  IN_PROGRESS  = 'IN_PROGRESS',
  RESOLVED     = 'RESOLVED',
  ESCALATED    = 'ESCALATED',
}

@Entity('speak_up_cases')
export class SpeakUpCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  caseNumber: string;

  @Column({ type: 'enum', enum: CaseCategory, default: CaseCategory.OTHER })
  category: CaseCategory;

  /** Primary description field */
  @Column({ type: 'text', nullable: true })
  description: string;

  /** Legacy — kept so existing rows don't break */
  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'boolean', default: true })
  isAnonymous: boolean;

  @Column({ type: 'enum', enum: CasePrivacy, default: CasePrivacy.ANONYMOUS })
  privacy: CasePrivacy;

  @Column({ type: 'enum', enum: CaseUrgency, default: CaseUrgency.NORMAL })
  urgency: CaseUrgency;

  @Column({ type: 'enum', enum: CaseRoutedTo, default: CaseRoutedTo.HR })
  preferredLevel: CaseRoutedTo;

  /** Auto-routed destination (may differ from preferred) */
  @Column({ type: 'enum', enum: CaseRoutedTo, default: CaseRoutedTo.HR })
  routedTo: CaseRoutedTo;

  @Column({ type: 'enum', enum: CaseStatus, default: CaseStatus.NEW })
  status: CaseStatus;

  // ── Identity (null when ANONYMOUS) ───────────────────────────────────────
  @Column({ nullable: true })
  submittedById: string;

  @Column({ nullable: true })
  submitterName: string;

  @Column({ nullable: true })
  orgUnitId: string;

  @Column({ nullable: true })
  hospitalId: string;

  @Column({ nullable: true })
  assignedToId: string;

  // ── SLA ──────────────────────────────────────────────────────────────────
  @Column({ nullable: true, type: 'timestamptz' })
  slaDeadline: Date;

  // ── Timeline ─────────────────────────────────────────────────────────────
  @Column({ nullable: true, type: 'timestamptz' })
  acknowledgedAt: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  meetingScheduledAt: Date;

  @Column({ nullable: true })
  meetingDate: string;

  @Column({ nullable: true, type: 'timestamptz' })
  resolvedAt: Date;

  /** Legacy resolution text */
  @Column({ type: 'text', nullable: true })
  resolution: string;

  // ── Outcome (all fields required before resolve) ──────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  outcome: {
    rootCause: string;
    summary: string;
    actionRequired: string;
    owner: string;
  } | null;

  // ── Issue linkage ─────────────────────────────────────────────────────────
  @Column({ nullable: true })
  convertedToIssueId: string;

  @OneToMany(() => SpeakUpActivity, (a) => a.speakUpCase, { cascade: true })
  activities: SpeakUpActivity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
