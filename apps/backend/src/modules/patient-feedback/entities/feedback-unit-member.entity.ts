import {
  Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn,
} from 'typeorm';

/**
 * Grants a Director or Manager access to a specific FeedbackUnit. A user can
 * belong to several units (Directors typically oversee more than one); a unit
 * can have several members. Membership is explicit and independent of the org
 * tree, mirroring the self-contained Hospital → Unit → Room model.
 */
@Entity('feedback_unit_members')
@Index(['unitId', 'userId'], { unique: true })
export class FeedbackUnitMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  unitId: string;

  @Index()
  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
