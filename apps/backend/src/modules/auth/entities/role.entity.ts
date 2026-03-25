import {
  Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, CreateDateColumn,
} from 'typeorm';
import { Permission } from './permission.entity';

export enum SystemRole {
  SUPER_ADMIN  = 'SUPER_ADMIN',   // Platform admin
  SVP          = 'SVP',           // Senior Vice President — top of org
  CNP          = 'CNP',           // Chief Nursing Officer — reports to SVP, one per hospital
  VP           = 'VP',            // Vice President — reports to CNP
  DIRECTOR     = 'DIRECTOR',      // Director — reports to CNP
  MANAGER      = 'MANAGER',       // Manager — reports to Director
  NURSE        = 'NURSE',         // Nurse — reports to Manager
  HR_ANALYST   = 'HR_ANALYST',    // HR / analytics access
  READ_ONLY    = 'READ_ONLY',     // View-only
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Permission, { eager: true })
  @JoinTable()
  permissions: Permission[];

  @CreateDateColumn()
  createdAt: Date;
}
