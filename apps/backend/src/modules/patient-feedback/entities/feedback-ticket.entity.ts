import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { PatientFeedback, FeedbackSeverity } from './patient-feedback.entity';

export enum FeedbackTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/**
 * Follow-up ticket auto-created for YELLOW / RED / CRITICAL feedback. GREEN
 * feedback never produces a ticket.
 */
@Entity('feedback_tickets')
export class FeedbackTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  ticketNumber: string; // e.g. FB-000123

  @ManyToOne(() => PatientFeedback, { onDelete: 'CASCADE' })
  feedback: PatientFeedback;

  @Index()
  @Column()
  feedbackId: string;

  @Column({ nullable: true })
  locationId: string;

  @Column({ type: 'enum', enum: FeedbackSeverity })
  severity: FeedbackSeverity;

  @Column({ type: 'enum', enum: FeedbackTicketStatus, default: FeedbackTicketStatus.OPEN })
  status: FeedbackTicketStatus;

  // Hospital scope (denormalised from the location at creation time) for RBAC.
  @Column({ nullable: true })
  hospitalId: string;

  @Column({ nullable: true })
  assignedToId: string;

  @Column({ type: 'text', nullable: true })
  actionTaken: string;

  // SLA target derived from severity at creation time.
  @Column({ nullable: true })
  dueAt: Date;

  // First time a human acted on the ticket (status change or action saved).
  @Column({ nullable: true })
  firstRespondedAt: Date;

  // Set when an overdue ticket has been auto-escalated (prevents re-escalation).
  @Column({ nullable: true })
  escalatedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
