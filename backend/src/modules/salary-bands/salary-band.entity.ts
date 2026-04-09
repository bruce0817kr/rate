import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('salary_bands')
export class SalaryBand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  position: string;

  @Column('int')
  minAmount: number;

  @Column('int')
  maxAmount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

