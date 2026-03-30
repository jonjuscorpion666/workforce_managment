import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ nullable: true })
  issueId: string;

  @Column({ nullable: true })
  milestoneId: string;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ nullable: true })
  assignedToId: string;

  // Hierarchical task support (parent-child)
  @ManyToOne(() => Task, (t) => t.subTasks, { nullable: true })
  parentTask: Task;

  @Column({ nullable: true })
  parentTaskId: string;

  @OneToMany(() => Task, (t) => t.parentTask)
  subTasks: Task[];

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  escalatedAt: Date;

  @Column({ default: 0 })
  escalationLevel: number;

  @Column({ nullable: true })
  orgUnitId: string;

  @Column({ nullable: true })
  hospitalId: string;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
