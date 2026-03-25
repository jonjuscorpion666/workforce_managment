import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { SpeakUpCase } from './speak-up-case.entity';

export enum ActivityType {
  CREATED           = 'CREATED',
  STATUS_CHANGED    = 'STATUS_CHANGED',
  NOTE_ADDED        = 'NOTE_ADDED',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  OUTCOME_RECORDED  = 'OUTCOME_RECORDED',
  ISSUE_LINKED      = 'ISSUE_LINKED',
  ESCALATED         = 'ESCALATED',
}

@Entity('speak_up_activities')
export class SpeakUpActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  caseId: string;

  @ManyToOne(() => SpeakUpCase, (c) => c.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caseId' })
  speakUpCase: SpeakUpCase;

  @Column({ type: 'enum', enum: ActivityType })
  type: ActivityType;

  @Column({ type: 'text', nullable: true })
  content: string;

  /** Null for system-generated events or when case is anonymous */
  @Column({ nullable: true })
  actorId: string;

  /** Display name stored at write time (de-normalized for audit durability) */
  @Column({ nullable: true })
  actorName: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
