import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany,
  JoinTable, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Role } from './role.entity';
import { OrgUnit } from '../../org/entities/org-unit.entity';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  jobTitle: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  employeeId: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @ManyToMany(() => Role, { eager: true })
  @JoinTable()
  roles: Role[];

  @ManyToOne(() => OrgUnit, { nullable: true })
  orgUnit: OrgUnit;

  // ID of the user this person reports to (enforces hierarchy)
  @Column({ nullable: true })
  reportsToId: string;

  @ManyToOne(() => User, { nullable: true })
  reportsTo: User;

  @Column({ default: false })
  isSuperAdmin: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
