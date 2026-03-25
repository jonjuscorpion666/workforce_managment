import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum OrgLevel {
  SYSTEM = 'SYSTEM',
  HOSPITAL = 'HOSPITAL',
  DEPARTMENT = 'DEPARTMENT',
  UNIT = 'UNIT',
}

@Entity('org_units')
export class OrgUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column({ type: 'enum', enum: OrgLevel })
  level: OrgLevel;

  @Column({ nullable: true })
  code: string;

  @ManyToOne(() => OrgUnit, (org) => org.children, { nullable: true })
  parent: OrgUnit;

  @Column({ nullable: true })
  parentId: string;

  @OneToMany(() => OrgUnit, (org) => org.parent)
  children: OrgUnit[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  timezone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
