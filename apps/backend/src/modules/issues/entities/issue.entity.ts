import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';
import { OrgUnit } from '../../org/entities/org-unit.entity';

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ACTION_PLANNED = 'ACTION_PLANNED',
  AWAITING_VALIDATION = 'AWAITING_VALIDATION',
  REOPENED = 'REOPENED',
}

export enum IssueSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum IssuePriority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

export enum IssueSource {
  SURVEY_AUTO = 'SURVEY_AUTO',
  MANUAL = 'MANUAL',
  SPEAK_UP = 'SPEAK_UP',
  ESCALATION = 'ESCALATION',
}

@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: IssueStatus, default: IssueStatus.OPEN })
  status: IssueStatus;

  @Column({ type: 'enum', enum: IssueSeverity, default: IssueSeverity.MEDIUM })
  severity: IssueSeverity;

  @Column({ type: 'enum', enum: IssuePriority, default: IssuePriority.P2 })
  priority: IssuePriority;

  @Column({ type: 'enum', enum: IssueSource, default: IssueSource.MANUAL })
  source: IssueSource;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @ManyToOne(() => OrgUnit, { nullable: true })
  orgUnit: OrgUnit;

  @Column({ nullable: true })
  orgUnitId: string;

  @Column({ nullable: true })
  linkedSurveyId: string;

  @Column({ nullable: true })
  linkedQuestionId: string;

  @Column({ nullable: true })
  baselineScore: number;

  @Column({ nullable: true })
  targetScore: number;

  @Column({ nullable: true })
  closureThreshold: number;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ nullable: true })
  assignedToId: string;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  @Column({ default: 1 })
  cycleNumber: number;

  @Column({ nullable: true })
  createdById: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column({ nullable: true })
  hospitalId: string;

  // Issue level classification
  @Column({ nullable: true, default: 'UNIT' })
  issueLevel: string;  // UNIT | DEPARTMENT | HOSPITAL | SYSTEM

  @Column({ nullable: true })
  ownerRole: string;   // free text: Manager / Director / CNO / SVP

  @Column({ type: 'jsonb', nullable: true })
  linkedSurveyQuestionIds: string[];  // multiple question links

  @Column({ default: 0 })
  reopenCount: number;

  @Column({ nullable: true, type: 'text' })
  statusNote: string;   // note from most recent status change

  @Column({ nullable: true })
  lastStatusChangeAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
