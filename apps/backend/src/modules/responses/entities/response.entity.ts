import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index,
} from 'typeorm';
import { Survey } from '../../surveys/entities/survey.entity';

@Entity('responses')
export class Response {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE' })
  survey: Survey;

  @Index()
  @Column()
  surveyId: string;

  // null if anonymous
  @Column({ nullable: true })
  respondentId: string;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ type: 'jsonb' })
  answers: {
    questionId: string;
    value: any;
    text?: string;
  }[];

  // Org context — all three snapshotted at submit time from the user's profile
  @Column({ nullable: true })
  orgUnitId: string;     // direct unit the respondent is assigned to

  @Column({ nullable: true })
  hospitalId: string;    // HOSPITAL-level ancestor (walked up from orgUnit)

  @Column({ nullable: true })
  departmentId: string;  // DEPARTMENT-level ancestor if applicable

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  shift: string;

  @Column({ nullable: true })
  ipHash: string; // hashed for deduplication

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  submittedAt: Date;
}
