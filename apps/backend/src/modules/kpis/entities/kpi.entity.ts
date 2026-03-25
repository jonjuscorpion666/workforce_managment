import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('kpis')
export class KPI {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) orgUnitId: string;
  @Column({ type: 'float', nullable: true }) currentValue: number;
  @Column({ type: 'float', nullable: true }) targetValue: number;
  @Column({ type: 'float', nullable: true }) baselineValue: number;
  @Column({ nullable: true }) unit: string; // %, score, count
  @Column({ nullable: true }) dimension: string; // engagement, participation, resolution
  @Column({ nullable: true }) period: string; // Q1-2026, 2026-03
  @CreateDateColumn() recordedAt: Date;
}
