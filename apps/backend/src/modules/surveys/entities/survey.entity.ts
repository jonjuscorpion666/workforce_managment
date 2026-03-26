import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Question } from './question.entity';
import { OrgUnit } from '../../org/entities/org-unit.entity';

export enum SurveyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum SurveyType {
  PULSE = 'PULSE',
  ANNUAL = 'ANNUAL',
  ONBOARDING = 'ONBOARDING',
  EXIT = 'EXIT',
  AD_HOC = 'AD_HOC',
  VALIDATION = 'VALIDATION',
}

export enum TargetScope {
  SYSTEM   = 'SYSTEM',   // all hospitals in the network
  HOSPITAL = 'HOSPITAL', // one or more specific hospitals
  UNIT     = 'UNIT',     // specific department / unit
}

export enum ApprovalStatus {
  NOT_REQUIRED = 'NOT_REQUIRED', // SVP / SUPER_ADMIN created — no approval needed
  PENDING      = 'PENDING',      // CNO submitted, awaiting SVP review
  APPROVED     = 'APPROVED',     // SVP approved — CNO may publish
  REJECTED     = 'REJECTED',     // SVP rejected — CNO must revise
}

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  /** Strategic objective — why this survey is being run */
  @Column({ nullable: true, type: 'text' })
  objective: string;

  @Column({ type: 'enum', enum: SurveyType, default: SurveyType.PULSE })
  type: SurveyType;

  @Column({ type: 'enum', enum: SurveyStatus, default: SurveyStatus.DRAFT })
  status: SurveyStatus;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  opensAt: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  closesAt: Date;

  @Column({ nullable: true })
  cycleNumber: number;

  @Column({ nullable: true })
  linkedIssueId: string;

  /** When true this survey is a reusable template — excluded from the main survey list */
  @Column({ default: false })
  isTemplate: boolean;

  // ── Targeting ─────────────────────────────────────────────────────────────────

  /** Breadth of this survey — SYSTEM (all), HOSPITAL (selected), or UNIT */
  @Column({ type: 'enum', enum: TargetScope, default: TargetScope.SYSTEM })
  targetScope: TargetScope;

  /**
   * Org-unit IDs this survey targets.
   * Empty / null = entire system (when targetScope = SYSTEM).
   * For HOSPITAL scope: list of hospital org-unit IDs.
   * For UNIT scope: list of unit org-unit IDs.
   */
  @Column({ type: 'jsonb', nullable: true })
  targetOrgUnitIds: string[];

  /** Legacy single-unit relation — kept for backwards compatibility */
  @ManyToOne(() => OrgUnit, { nullable: true })
  targetOrgUnit: OrgUnit;

  @Column({ type: 'jsonb', nullable: true })
  targetRoles: string[];

  @Column({ type: 'jsonb', nullable: true })
  targetShifts: string[];

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @OneToMany(() => Question, (q) => q.survey, { cascade: true })
  questions: Question[];

  @Column({ nullable: true })
  createdById: string;

  /** Role of the user who created this survey (e.g. SVP, CNP) */
  @Column({ nullable: true })
  createdByRole: string;

  // ── Approval workflow (CNO → SVP) ─────────────────────────────────────────

  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.NOT_REQUIRED })
  approvalStatus: ApprovalStatus;

  /** SVP user ID who approved or rejected */
  @Column({ nullable: true })
  reviewedById: string;

  @Column({ nullable: true, type: 'timestamptz' })
  reviewedAt: Date;

  /** Reason provided when SVP rejects the survey */
  @Column({ nullable: true, type: 'text' })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
