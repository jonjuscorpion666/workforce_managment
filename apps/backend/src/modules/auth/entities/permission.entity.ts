import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  action: string; // e.g. "surveys:create", "issues:read", "tasks:assign"

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  module: string; // e.g. "surveys", "issues", "tasks"

  @CreateDateColumn()
  createdAt: Date;
}
