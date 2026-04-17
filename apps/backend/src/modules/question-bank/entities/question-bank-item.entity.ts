import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum QuestionCategory {
  BURNOUT       = 'BURNOUT',
  ENGAGEMENT    = 'ENGAGEMENT',
  WORKLOAD      = 'WORKLOAD',
  COMMUNICATION = 'COMMUNICATION',
  LEADERSHIP    = 'LEADERSHIP',
  WELLBEING     = 'WELLBEING',
  TEAMWORK      = 'TEAMWORK',
  SAFETY        = 'SAFETY',
  RECOGNITION   = 'RECOGNITION',
  GROWTH        = 'GROWTH',
  GENERAL       = 'GENERAL',
}

export enum QuestionFramework {
  MBI        = 'MBI',        // Maslach Burnout Inventory
  GALLUP_Q12 = 'GALLUP_Q12',
  UWES       = 'UWES',       // Utrecht Work Engagement Scale
  HEALTHCARE  = 'HEALTHCARE',
  CUSTOM     = 'CUSTOM',
}

@Entity('question_bank_items')
export class QuestionBankItem {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'text' })
  text: string;

  @Column()
  type: string; // LIKERT_5 | LIKERT_10 | NPS | YES_NO | OPEN_TEXT | RATING | MULTIPLE_CHOICE

  @Column({ type: 'enum', enum: QuestionCategory, default: QuestionCategory.GENERAL })
  category: QuestionCategory;

  @Column({ type: 'enum', enum: QuestionFramework, default: QuestionFramework.CUSTOM })
  framework: QuestionFramework;

  @Column({ type: 'text', nullable: true })
  helpText: string | null;

  @Column({ type: 'jsonb', nullable: true })
  options: string[] | null;

  @Column({ type: 'int', nullable: true })
  followUpThreshold: number | null;

  @Column({ type: 'text', nullable: true })
  followUpPrompt: string | null;

  /** Whether this is a scientifically validated question */
  @Column({ default: false })
  isValidated: boolean;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
