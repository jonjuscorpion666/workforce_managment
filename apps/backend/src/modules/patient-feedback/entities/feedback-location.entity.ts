import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum FeedbackLocationType {
  BED = 'BED',
  WARD = 'WARD',
}

export enum FeedbackLocationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Location Master — one row per QR code. The random `token` is what the QR
 * encodes (https://host/feedback?t=<token>); ward/room/bed are never exposed
 * in the link itself, only resolved server-side.
 */
@Entity('feedback_locations')
export class FeedbackLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  token: string;

  @Column()
  ward: string;

  @Column({ nullable: true })
  room: string;

  @Column({ nullable: true })
  bed: string;

  @Column({ type: 'enum', enum: FeedbackLocationType, default: FeedbackLocationType.BED })
  locationType: FeedbackLocationType;

  @Column({ default: 'Inpatient Nursing' })
  department: string;

  // Links into the shared org hierarchy (same OrgUnit tree as Surveys/Issues).
  // hospitalId → HOSPITAL-level OrgUnit; orgUnitId → the ward (UNIT-level).
  @Column({ nullable: true })
  hospitalId: string;

  @Column({ nullable: true })
  orgUnitId: string;

  @Column({ type: 'enum', enum: FeedbackLocationStatus, default: FeedbackLocationStatus.ACTIVE })
  status: FeedbackLocationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
