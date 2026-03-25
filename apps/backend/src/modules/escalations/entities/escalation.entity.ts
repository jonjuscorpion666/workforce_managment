import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum EscalationStatus {
  PENDING = 'PENDING',
  NOTIFIED = 'NOTIFIED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

@Entity('escalations')
export class Escalation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string; // 'task' | 'issue' | 'case'

  @Column()
  entityId: string;

  @Column()
  reason: string; // 'OVERDUE' | 'INACTIVITY' | 'SLA_BREACH'

  @Column({ default: 1 })
  level: number;

  @Column()
  escalatedToId: string;

  @Column({ nullable: true })
  escalatedById: string;

  @Column({ type: 'enum', enum: EscalationStatus, default: EscalationStatus.PENDING })
  status: EscalationStatus;

  @Column({ nullable: true })
  acknowledgedAt: Date;

  @Column({ nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
