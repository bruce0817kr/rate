import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('regulation_documents')
export class RegulationDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  filePath: string; // Path to file in storage system (S3, Blob storage, etc.)

  @Column({
    type: 'enum',
    enum: ['PDF', 'HWP', 'DOC', 'DOCX', 'TXT'],
  })
  fileType: string;

  @Column()
  version: string;

  @Column()
  effectiveDate: Date; // When this regulation becomes effective

  @Column({ nullable: true })
  expiryDate: Date | null; // When this regulation expires (if applicable)

  @Column('simple-array')
  applicableProjectTypes: string[]; // e.g., ['NATIONAL_RD', 'LOCAL_SUBSIDY']

  @Column('simple-array')
  applicableTeams: string[]; // Empty array means applies to all teams

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}