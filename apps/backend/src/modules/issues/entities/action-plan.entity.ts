import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Issue } from './issue.entity';

export enum ActionPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

@Entity('action_plans')
export class ActionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  issueId: string;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  issue: Issue;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  objective: string;

  @Column({ type: 'text', nullable: true })
  rootCauseSummary: string;

  @Column({ type: 'jsonb', nullable: true })
  plannedActions: string[];  // list of action descriptions

  @Column({ nullable: true })
  ownerId: string;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  successCriteria: string;

  @Column({ default: 0 })
  progressPercent: number;

  @Column({ type: 'enum', enum: ActionPlanStatus, default: ActionPlanStatus.DRAFT })
  status: ActionPlanStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ActionPlanMilestone, (m) => m.actionPlan)
  milestones: ActionPlanMilestone[];
}

@Entity('action_plan_milestones')
export class ActionPlanMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  actionPlanId: string;

  @ManyToOne(() => ActionPlan, (ap) => ap.milestones, { onDelete: 'CASCADE' })
  actionPlan: ActionPlan;

  @Column()
  title: string;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: 'enum', enum: MilestoneStatus, default: MilestoneStatus.PENDING })
  status: MilestoneStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
