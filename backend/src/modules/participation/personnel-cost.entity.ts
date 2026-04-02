import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProjectPersonnel } from './project-personnel.entity';

@Entity('personnel_costs')
export class PersonnelCost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectPersonnel, (projectPersonnel) => projectPersonnel.personnelCosts)
  @JoinColumn({ name: 'project_personnel_id' })
  projectPersonnel: ProjectPersonnel;

  @Column()
  fiscalYear: number;

  @Column()
  fiscalMonth: number; // 1-12

  @Column()
  calculationDate: Date;

  @Column('decimal', { precision: 15, scale: 2 })
  baseSalary: number; // Midpoint of salary band

  @Column('decimal', { precision: 5, scale: 2 })
  appliedParticipationRate: number;

  @Column('decimal', { precision: 15, scale: 2 })
  calculatedAmount: number;

  @Column()
  expenseItem: string; // e.g., "base-salary", "bonus", "meal-allowance"

  @Column({
    type: 'enum',
    enum: ['EMPLOYEE_PART', 'EMPLOYER_PART', 'FULLY_COVERED'],
  })
  insuranceCoverage: string;

  @Column({
    type: 'enum',
    enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
  })
  documentStatus: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}