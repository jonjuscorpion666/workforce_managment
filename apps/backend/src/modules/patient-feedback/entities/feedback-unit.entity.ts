import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum FeedbackUnitStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * A nursing unit / ward within a hospital — the level between Hospital and Room
 * in the feedback location hierarchy (Hospital → Unit → Room). Kept lightweight
 * and self-contained (free-text name + hospital reference), mirroring the
 * simplified Hospital + Room model rather than the full org-unit tree.
 */
@Entity('feedback_units')
@Index(['hospitalId', 'name'], { unique: true })
export class FeedbackUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // HOSPITAL-level OrgUnit id (same shared org tree as the rest of feedback).
  @Index()
  @Column()
  hospitalId: string;

  // Free-text unit label as the hospital signs it (e.g. "3 West", "ICU").
  @Column()
  name: string;

  @Column({ type: 'enum', enum: FeedbackUnitStatus, default: FeedbackUnitStatus.ACTIVE })
  status: FeedbackUnitStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
