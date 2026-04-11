import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ProjectPersonnel } from '../participation/project-personnel.entity';
import { PersonnelCost } from '../participation/personnel-cost.entity';
import { AuditLog } from '../audit/audit-log.entity';

@Entity('personnel')
export class Personnel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  employeeId: string;

  @Column()
  name: string;

  @Column()
  gender: string; // 성별 (M/F 또는 기타)

  @Column()
  highestEducation: string; // 최종학위 (예: "박사(컴퓨터공학)")

  @Column()
  educationYear: number; // 학위 취득년도

  @Column()
  nationalResearcherNumber: string; // 국가연구자번호

  @Column()
  birthDate: Date; // 생년월일 (yy,mm,dd)

  @Column()
  ssn: string; // Encrypted SSN

  @Column()
  department: string;

  @Column()
  team: string;

  @Column()
  position: string;

  @Column({ type: 'varchar', nullable: true })
  salaryReferencePosition: string | null;

  @Column('bigint', { nullable: true })
  positionAverageAnnualSalary: number | null;

  @Column({
    type: 'enum',
    enum: ['FULL_TIME', 'CONTRACT', 'PART_TIME', 'DISPATCHED'],
  })
  employmentType: string;

  @Column()
  hireDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  terminationDate: Date | null;

  @Column({ default: true })
  isActive: boolean;

  // Salary validity period for tracking changes
  @Column('jsonb')
  salaryValidity: {
    startDate: Date;
    endDate: Date | null;
  };

  // Relationships
  @OneToMany(() => ProjectPersonnel, (projectPersonnel) => projectPersonnel.personnel)
  projectPersonnel: ProjectPersonnel[];

  @OneToMany(() => PersonnelCost, (personnelCost) => personnelCost.personnel)
  personnelCosts: PersonnelCost[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.entityId, {
    // This is a simplified relationship - in practice, we'd need a more complex setup
  })
  auditLogs: AuditLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
