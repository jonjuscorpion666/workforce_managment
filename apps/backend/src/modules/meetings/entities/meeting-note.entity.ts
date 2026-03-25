import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Meeting } from './meeting.entity';

@Entity('meeting_notes')
export class MeetingNote {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Meeting, (m) => m.notes, { onDelete: 'CASCADE' }) meeting: Meeting;
  @Column() meetingId: string;
  @Column({ type: 'text' }) content: string;
  @Column({ type: 'jsonb', nullable: true }) extractedIssues: string[];
  @Column({ type: 'jsonb', nullable: true }) actionItems: string[];
  @Column() authorId: string;
  @CreateDateColumn() createdAt: Date;
}
