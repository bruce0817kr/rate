import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectPersonnel } from './project-personnel.entity';

@Entity('project_personnel_segments')
export class ProjectPersonnelSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectPersonnel, (projectPersonnel) => projectPersonnel.segments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_personnel_id' })
  projectPersonnel: ProjectPersonnel;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column('decimal', { precision: 5, scale: 2 })
  participationRate: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  personnelCostOverride: number | null;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
