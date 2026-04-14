import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';

export enum ProgramScope {
  GLOBAL            = 'GLOBAL',
  HOSPITAL_SPECIFIC = 'HOSPITAL_SPECIFIC',
}

export enum ProgramStageKey {
  SETUP         = 'SETUP',
  EXECUTION     = 'EXECUTION',
  ROOT_CAUSE    = 'ROOT_CAUSE',
  REMEDIATION   = 'REMEDIATION',
  COMMUNICATION = 'COMMUNICATION',
  VALIDATION    = 'VALIDATION',
}

export enum ProgramStatus {
  DRAFT            = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE           = 'ACTIVE',
  REJECTED         = 'REJECTED',
  COMPLETED        = 'COMPLETED',
  CANCELLED        = 'CANCELLED',
}

export enum ProgramApprovalStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING      = 'PENDING',
  APPROVED     = 'APPROVED',
  REJECTED     = 'REJECTED',
}

export interface SetupChecklist {
  meetingScheduled?:      boolean;
  meetingDate?:           string;
  meetingAttendees?:      string;
  meetingNotes?:          string;
  questionsDrafted?:      boolean;
  employeeScopeDefined?:  boolean;
  communicationDrafted?:  boolean;
  communicationMessage?:  string;
  employeesNotified?:     boolean;
}

export interface RootCauseChecklist {
  /** Manual — user confirms they reviewed survey results */
  resultsReviewed?:    boolean;
  /** Text of findings — auto-ticks findingsDocumented when saved */
  findings?:           string;
  /** Auto — ticked when findings text is saved */
  findingsDocumented?: boolean;
  /** Auto — ticked when at least 1 issue is linked to program */
  issuesCreated?:      boolean;
  /** Manual — team has agreed on identified root causes */
  teamAgreed?:         boolean;
}

export interface RemediationChecklist {
  /** Text action plan — auto-ticks actionPlanDrafted when saved */
  actionPlan?:         string;
  /** Auto — ticked when action plan text is saved */
  actionPlanDrafted?:  boolean;
  /** Manual — tasks/action plans have been assigned with owners */
  tasksAssigned?:      boolean;
  /** Manual — progress has been formally reviewed */
  progressReviewed?:   boolean;
}

export interface ExecutionChecklist {
  /** Auto-ticked when linked survey status becomes ACTIVE */
  surveyLaunched?:   boolean;
  /** Auto-ticked when first response is recorded */
  responsesReceived?: boolean;
  /** Auto-ticked after first reminder is sent */
  reminderSent?:     boolean;
  /** ISO timestamps of each reminder sent */
  reminderHistory?:  string[];
  /** Auto-ticked when linked survey is CLOSED */
  surveyClosed?:     boolean;
}

@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Auto-generated: ENG-2026-04-001 */
  @Column({ unique: true })
  programId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ProgramScope })
  scope: ProgramScope;

  /** Hospital org-unit IDs — empty for GLOBAL scope */
  @Column({ type: 'jsonb', nullable: true })
  targetHospitalIds: string[];

  @Column({ type: 'text' })
  problemStatement: string;

  @Column({ type: 'text' })
  objective: string;

  @Column({ nullable: true, type: 'text' })
  successCriteria: string;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ nullable: true, type: 'timestamptz' })
  targetLaunchDate: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  targetCompletionDate: Date;

  @Column({ type: 'enum', enum: ProgramStageKey, default: ProgramStageKey.SETUP })
  currentStage: ProgramStageKey;

  @Column({ type: 'enum', enum: ProgramStatus, default: ProgramStatus.DRAFT })
  status: ProgramStatus;

  @Column({ type: 'enum', enum: ProgramApprovalStatus, default: ProgramApprovalStatus.NOT_REQUIRED })
  approvalStatus: ProgramApprovalStatus;

  @Column({ nullable: true })
  approverId: string;

  @Column({ nullable: true, type: 'timestamptz' })
  approvedAt: Date;

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string;

  /** One survey per program — linked after setup is approved */
  @Column({ nullable: true })
  linkedSurveyId: string;

  @Column({ type: 'jsonb', default: '{}' })
  setupChecklist: SetupChecklist;

  @Column({ type: 'jsonb', default: '{}' })
  executionChecklist: ExecutionChecklist;

  @Column({ type: 'jsonb', default: '{}' })
  rootCauseChecklist: RootCauseChecklist;

  @Column({ type: 'jsonb', default: '{}' })
  remediationChecklist: RemediationChecklist;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
