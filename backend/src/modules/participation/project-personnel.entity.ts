import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Project } from '../projects/project.entity';
import { Personnel } from '../personnel/personnel.entity';
import { ProjectPersonnelRole } from './project-personnel-role.enum';
import { PersonnelCost } from './personnel-cost.entity';

@Entity('project_personnel')
export class ProjectPersonnel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.projectPersonnel)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Personnel, (personnel) => personnel.projectPersonnel)
  @JoinColumn({ name: 'personnel_id' })
  personnel: Personnel;

  @OneToMany(() => PersonnelCost, (pc) => pc.projectPersonnel)
  personnelCosts: PersonnelCost[];

  @Column('decimal', { precision: 5, scale: 2 })
  participationRate: number; // Percentage (0-100)

  @Column()
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({
    type: 'enum',
    enum: ['MONTHLY', 'DAILY', 'HOURLY'],
  })
  calculationMethod: string;

  @Column()
  expenseCode: string; // e.g., "personnel-base", "personnel-bonus"

  @Column()
  legalBasisCode: string; // Legal basis for this expense item

  @Column()
  participatingTeam: string; // Current team of participation (may differ from personnel.team)

  @Column({
    type: 'enum',
    enum: ProjectPersonnelRole,
    default: ProjectPersonnelRole.PARTICIPATING_RESEARCHER,
  })
  role: ProjectPersonnelRole;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  annualSalary: number | null; // Actual annual salary (KRW), optional override from salary band

  @Column({ type: 'int', default: 12 })
  participationMonths: number; // Number of months participating in this project

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  personnelCostOverride: number | null; // Manual personnel cost override (KRW)

  @Column({ nullable: true })
  notes: string;

  @Column({ default: 1 })
  version: number; // For optimistic locking

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
