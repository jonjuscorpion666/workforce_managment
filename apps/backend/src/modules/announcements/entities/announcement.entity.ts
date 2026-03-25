import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum AnnouncementType {
  INFORMATIONAL            = 'INFORMATIONAL',
  ACTION_REQUIRED          = 'ACTION_REQUIRED',
  SURVEY_LAUNCH            = 'SURVEY_LAUNCH',
  DEADLINE_REMINDER        = 'DEADLINE_REMINDER',
  POLICY_UPDATE            = 'POLICY_UPDATE',
  CRITICAL_ALERT           = 'CRITICAL_ALERT',
  LEADERSHIP_COMMUNICATION = 'LEADERSHIP_COMMUNICATION',
  TRAINING_COMPLIANCE      = 'TRAINING_COMPLIANCE',
  // Legacy types (kept for backward compatibility)
  YOU_SAID_WE_DID = 'YOU_SAID_WE_DID',
  GENERAL         = 'GENERAL',
  SURVEY_RESULT   = 'SURVEY_RESULT',
  ACTION_UPDATE   = 'ACTION_UPDATE',
}

export enum AnnouncementPriority {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AnnouncementStatus {
  DRAFT     = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  EXPIRED   = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  ARCHIVED  = 'ARCHIVED',
}

export enum AudienceMode {
  SYSTEM      = 'SYSTEM',
  HOSPITAL    = 'HOSPITAL',
  DEPARTMENT  = 'DEPARTMENT',
  UNIT        = 'UNIT',
  ROLE        = 'ROLE',
  COMBINATION = 'COMBINATION',
}

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() title: string;
  @Column({ type: 'text' }) body: string;

  @Column({ type: 'enum', enum: AnnouncementType, default: AnnouncementType.INFORMATIONAL })
  type: AnnouncementType;

  @Column({ type: 'enum', enum: AnnouncementPriority, default: AnnouncementPriority.MEDIUM })
  priority: AnnouncementPriority;

  @Column({ type: 'enum', enum: AnnouncementStatus, default: AnnouncementStatus.DRAFT })
  status: AnnouncementStatus;

  @Column({ type: 'enum', enum: AudienceMode, default: AudienceMode.SYSTEM })
  audienceMode: AudienceMode;

  // Targeting
  @Column({ type: 'jsonb', nullable: true }) targetOrgUnitIds: string[] | null;
  @Column({ type: 'jsonb', nullable: true }) targetRoles: string[] | null;

  // Creator / publisher
  @Column() createdById: string;
  @Column({ nullable: true }) createdByRole: string;
  @Column({ nullable: true }) publishedById: string;

  // Scheduling
  @Column({ type: 'timestamptz', nullable: true }) publishAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) expireAt: Date | null;

  // Acknowledgement
  @Column({ default: false }) requiresAcknowledgement: boolean;
  @Column({ type: 'timestamptz', nullable: true }) acknowledgementDueAt: Date | null;

  // Delivery
  @Column({ type: 'jsonb', nullable: true }) deliveryChannels: string[] | null;

  // Metadata
  @Column({ type: 'jsonb', nullable: true }) tags: string[] | null;
  @Column({ default: false }) isPinned: boolean;

  // Legacy fields
  @Column({ nullable: true }) linkedSurveyId: string;
  @Column({ nullable: true }) linkedIssueId: string;

  // Lifecycle timestamps
  @Column({ type: 'timestamptz', nullable: true }) cancelledAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) archivedAt: Date | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
