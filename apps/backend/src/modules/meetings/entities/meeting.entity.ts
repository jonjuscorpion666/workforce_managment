import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { MeetingNote } from './meeting-note.entity';

export enum MeetingType {
  PRE_SURVEY = 'PRE_SURVEY',
  POST_SURVEY = 'POST_SURVEY',
  ACTION_REVIEW = 'ACTION_REVIEW',
  AD_HOC = 'AD_HOC',
}

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() title: string;
  @Column({ type: 'enum', enum: MeetingType, default: MeetingType.AD_HOC }) type: MeetingType;
  @Column() orgUnitId: string;
  @Column({ nullable: true }) surveyId: string;
  @Column({ nullable: true }) issueId: string;
  @Column() scheduledAt: Date;
  @Column({ nullable: true }) facilitatorId: string;
  @Column({ type: 'jsonb', nullable: true }) attendeeIds: string[];
  @Column({ nullable: true }) location: string;
  @OneToMany(() => MeetingNote, (n) => n.meeting, { cascade: true }) notes: MeetingNote[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
