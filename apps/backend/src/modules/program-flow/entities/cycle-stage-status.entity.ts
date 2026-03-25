import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { ProgramCycle } from './program-cycle.entity';

export enum ProgramStage {
  SURVEY_SETUP      = 'SURVEY_SETUP',
  SURVEY_EXECUTION  = 'SURVEY_EXECUTION',
  ROOT_CAUSE        = 'ROOT_CAUSE',
  REMEDIATION       = 'REMEDIATION',
  COMMUNICATION     = 'COMMUNICATION',
  VALIDATION        = 'VALIDATION',
}

export enum StageState {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED   = 'COMPLETED',
  BLOCKED     = 'BLOCKED',
}

@Entity('cycle_stage_statuses')
export class CycleStageStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProgramCycle, (c) => c.stageStatuses, { onDelete: 'CASCADE' })
  cycle: ProgramCycle;

  @Index()
  @Column()
  cycleId: string;

  /** Org unit this status applies to (unit or hospital level) */
  @Index()
  @Column()
  orgUnitId: string;

  @Column({ type: 'enum', enum: ProgramStage })
  stage: ProgramStage;

  @Column({ type: 'enum', enum: StageState, default: StageState.NOT_STARTED })
  state: StageState;

  /** Who owns this stage for this org unit */
  @Column({ nullable: true })
  ownerId: string;

  @Column({ nullable: true })
  ownerName: string;

  @Column({ nullable: true })
  ownerRole: string;

  @Column({ nullable: true, type: 'text' })
  note: string;

  /** When this stage was moved to IN_PROGRESS */
  @Column({ nullable: true, type: 'timestamptz' })
  startedAt: Date;

  /** When this stage reached COMPLETED */
  @Column({ nullable: true, type: 'timestamptz' })
  completedAt: Date;

  /** Target completion date for this stage */
  @Column({ nullable: true, type: 'timestamptz' })
  dueDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
