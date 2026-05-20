import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum FeedbackLocationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Location Master — one row per room QR. The random `token` is what the QR
 * encodes (`https://host/feedback?t=<token>`); the hospital + room label are
 * resolved server-side and never embedded in the link.
 */
@Entity('feedback_locations')
export class FeedbackLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  token: string;

  // HOSPITAL-level OrgUnit id (same shared org tree as Surveys/Issues).
  @Column()
  hospitalId: string;

  // Free-text room label as the hospital actually signs it (e.g. "312", "ICU-12").
  @Column()
  room: string;

  @Column({ type: 'enum', enum: FeedbackLocationStatus, default: FeedbackLocationStatus.ACTIVE })
  status: FeedbackLocationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
