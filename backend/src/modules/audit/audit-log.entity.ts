import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string; // e.g., 'Personnel', 'Project', 'ProjectPersonnel'

  @Column()
  entityId: string; // ID of the entity that was changed

  @Column({
    type: 'enum',
    enum: ['CREATE', 'UPDATE', 'DELETE'],
  })
  action: string;

  @Column('jsonb')
  changes: Record<string, any>; // Stores the changes made (before/after values)

  @Column()
  performedBy: string; // User ID who performed the action

  @Column({ nullable: true })
  ipAddress: string; // IP address of the user (if applicable)

  @Column({ nullable: true })
  userAgent: string; // User agent string (if applicable)

  @CreateDateColumn()
  timestamp: Date;
}