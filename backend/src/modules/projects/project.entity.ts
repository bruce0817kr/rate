import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ProjectPersonnel } from '../participation/project-personnel.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int', nullable: true })
  fiscalYear: number | null;

  @OneToMany(() => ProjectPersonnel, (pp) => pp.project)
  projectPersonnel: ProjectPersonnel[];

  @Column({
    type: 'enum',
    enum: ['NATIONAL_RD', 'LOCAL_SUBSIDY', 'MIXED'],
  })
  projectType: string;

  @Column()
  managingDepartment: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column('decimal', { precision: 15, scale: 2 })
  totalBudget: number;

  @Column('decimal', { precision: 15, scale: 2 })
  personnelBudget: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  personnelCostFinalTotal: number | null; // Manual final personnel total adjustment

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  expectedPersonnelRevenue: number | null;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  expectedIndirectRevenue: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  budgetStatus: string | null;

  @Column('jsonb', { nullable: true })
  fundingSources: Record<string, number> | null;

  @Column({
    type: 'enum',
    enum: ['PLANNING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'AUDITING'],
  })
  status: string;

  @Column('jsonb')
  legalBasis: Record<string, any>; // Applied laws and notifications versions

  @Column('jsonb')
  internalRules: Record<string, any>; // GyeonggiTP internal regulations

  @Column()
  managingTeam: string;

  @Column('simple-array')
  participatingTeams: string[]; // List of all teams participating in this project

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
