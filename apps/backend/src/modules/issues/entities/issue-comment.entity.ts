import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('issue_comments')
export class IssueComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  issueId: string;

  @Column()
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
