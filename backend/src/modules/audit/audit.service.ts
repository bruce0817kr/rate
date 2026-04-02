import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async logChange(
    entityType: string,
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    changes: Record<string, any>,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    const auditLog = this.auditRepository.create({
      entityType,
      entityId,
      action,
      changes,
      performedBy,
      ipAddress,
      userAgent,
    });

    return await this.auditRepository.save(auditLog);
  }

  async getAuditLogs(
    entityType?: string,
    entityId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    const query = this.auditRepository.createQueryBuilder('auditLog');

    if (entityType) {
      query.andWhere('auditLog.entityType = :entityType', { entityType });
    }

    if (entityId) {
      query.andWhere('auditLog.entityId = :entityId', { entityId });
    }

    if (startDate) {
      query.andWhere('auditLog.timestamp >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('auditLog.timestamp <= :endDate', { endDate });
    }

    query.orderBy('auditLog.timestamp', 'DESC')
         .limit(limit);

    return await query.getMany();
  }

  async getAuditLogById(id: string): Promise<AuditLog> {
    const auditLog = await this.auditRepository.findOne({ where: { id } });
    if (!auditLog) {
      throw new Error(`Audit log with ID ${id} not found`);
    }
    return auditLog;
  }
}