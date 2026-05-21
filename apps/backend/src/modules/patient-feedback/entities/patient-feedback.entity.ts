import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn,
} from 'typeorm';
import { FeedbackLocation } from './feedback-location.entity';

export enum FeedbackChannel {
  QR_BED = 'QR_BED',
  QR_WARD = 'QR_WARD',
  LINK = 'LINK', // WhatsApp / SMS link (future)
}

export enum FeedbackSeverity {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
  CRITICAL = 'CRITICAL',
}

/**
 * One submitted inpatient nursing-care feedback. No patient-identifying fields
 * are collected — location is derived from the scanned QR token.
 */
@Entity('patient_feedback')
export class PatientFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  token: string;

  @ManyToOne(() => FeedbackLocation, { nullable: true, onDelete: 'SET NULL' })
  location: FeedbackLocation;

  @Index()
  @Column({ nullable: true })
  locationId: string;

  // Denormalised from the location at submit time so feedback can be scoped to
  // a unit (Director/Manager access) without joining through the location.
  @Index()
  @Column({ nullable: true })
  unitId: string;

  @Column({ type: 'enum', enum: FeedbackChannel, default: FeedbackChannel.QR_BED })
  channel: FeedbackChannel;

  // Optional 1–5 overall rating.
  @Column({ type: 'int', nullable: true })
  rating: number;

  // [{ questionId, label, answer }]
  @Column({ type: 'jsonb' })
  answers: { questionId: string; label: string; answer: string | number }[];

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'enum', enum: FeedbackSeverity, default: FeedbackSeverity.GREEN })
  severity: FeedbackSeverity;

  // Patient said the pre-filled location was wrong.
  @Column({ default: false })
  locationMismatch: boolean;

  @Column({ nullable: true })
  hospitalId: string;

  @Column({ nullable: true })
  ipHash: string;

  // Set when the free-text / pseudo-identifiers (comment, ipHash) have been
  // cleared by the retention job. Structured answers are kept for aggregates.
  @Column({ nullable: true })
  deidentifiedAt: Date;

  @CreateDateColumn()
  submittedAt: Date;
}
