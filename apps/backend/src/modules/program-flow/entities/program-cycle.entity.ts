import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { CycleStageStatus } from './cycle-stage-status.entity';

export enum CycleStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

@Entity('program_cycles')
export class ProgramCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  /** The survey that kicked off this cycle */
  @Column({ nullable: true })
  surveyId: string;

  /** Scope: single hospital ID, or null = system-wide */
  @Column({ nullable: true })
  hospitalId: string;

  @Column({ type: 'enum', enum: CycleStatus, default: CycleStatus.ACTIVE })
  status: CycleStatus;

  @Column({ nullable: true, type: 'timestamptz' })
  startDate: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  targetEndDate: Date;

  @Column({ nullable: true })
  createdById: string;

  /**
   * Per-cycle SLA overrides in days. Falls back to system defaults if null.
   * e.g. { SURVEY_SETUP: 7, SURVEY_EXECUTION: 21, ROOT_CAUSE: 14,
   *         REMEDIATION: 45, COMMUNICATION: 7, VALIDATION: 14 }
   */
  @Column({ type: 'jsonb', nullable: true })
  stageSla: Record<string, number> | null;

  @OneToMany(() => CycleStageStatus, (s) => s.cycle, { cascade: true })
  stageStatuses: CycleStageStatus[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
