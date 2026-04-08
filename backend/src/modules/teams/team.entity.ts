import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  managerName: string | null;

  @Column({ type: 'varchar', nullable: true })
  managerEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  managerPhone: string | null;

  @Column({ type: 'int', nullable: true })
  plannedHeadcount: number | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
