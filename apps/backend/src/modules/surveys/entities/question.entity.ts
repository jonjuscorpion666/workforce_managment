import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn,
} from 'typeorm';
import { Survey } from './survey.entity';

export enum QuestionType {
  LIKERT_5 = 'LIKERT_5',
  LIKERT_10 = 'LIKERT_10',
  NPS = 'NPS',
  YES_NO = 'YES_NO',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  OPEN_TEXT = 'OPEN_TEXT',
  RATING = 'RATING',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Survey, (s) => s.questions, { onDelete: 'CASCADE' })
  survey: Survey;

  @Column()
  text: string;

  @Column({ nullable: true })
  helpText: string;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column({ type: 'jsonb', nullable: true })
  options: string[];

  @Column({ default: false })
  isRequired: boolean;

  @Column({ default: 0 })
  orderIndex: number;

  @Column({ type: 'jsonb', nullable: true })
  branchingRules: {
    condition: string;
    threshold: number;
    operator: 'lt' | 'gt' | 'eq' | 'lte' | 'gte';
    nextQuestionId?: string;
    action?: 'show' | 'skip' | 'trigger_followup';
  }[];

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  dimension: string;

  @CreateDateColumn()
  createdAt: Date;
}
