import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  entityType: string;

  @Index()
  @Column()
  entityId: string;

  @Column()
  action: string; // CREATE, UPDATE, DELETE, ESCALATE, PUBLISHED, APPROVED, etc.

  @Column({ nullable: true })
  performedById: string;

  // Human-readable display fields — stored at log time so they survive user renames
  @Column({ nullable: true })
  performedByName: string;

  @Column({ nullable: true })
  performedByRole: string;

  // Title / name of the entity at the time of the action
  @Column({ nullable: true })
  entityTitle: string;

  @Column({ type: 'jsonb', nullable: true })
  before: any;

  @Column({ type: 'jsonb', nullable: true })
  after: any;

  // Structured list of field-level changes extracted from before/after diff
  @Column({ type: 'jsonb', nullable: true })
  changeLog: Array<{ field: string; oldValue: string; newValue: string }>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  timestamp: Date;
}
