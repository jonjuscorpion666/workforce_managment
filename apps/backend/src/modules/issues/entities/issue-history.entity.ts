import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Issue } from './issue.entity';

@Entity('issue_history')
export class IssueHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  issue: Issue;

  @Column()
  issueId: string;

  @Column()
  field: string;

  @Column({ nullable: true })
  oldValue: string;

  @Column({ nullable: true })
  newValue: string;

  @Column()
  changedById: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  changedAt: Date;
}
