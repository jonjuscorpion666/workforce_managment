import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique,
} from 'typeorm';

@Entity('announcement_recipients')
@Unique(['announcementId', 'userId'])
export class AnnouncementRecipient {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index()
  @Column() announcementId: string;

  @Index()
  @Column() userId: string;

  @Column({ default: false }) isRead: boolean;
  @Column({ type: 'timestamptz', nullable: true }) firstViewedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) lastViewedAt: Date | null;

  @Column({ default: false }) isAcknowledged: boolean;
  @Column({ type: 'timestamptz', nullable: true }) acknowledgedAt: Date | null;

  @Column({ default: 0 }) reminderCount: number;
  @Column({ nullable: true }) escalationStatus: string;

  @CreateDateColumn() createdAt: Date;
}
