import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPersonnel } from './project-personnel.entity';
import { ProjectPersonnelRole } from './project-personnel-role.enum';
import { Personnel } from '../personnel/personnel.entity';
import { Project } from '../projects/project.entity';
import { ParticipationCalculationService } from './participation-calculation.service';
import { AuditService } from '../audit/audit.service';

interface ParticipationAlert {
  id: string;
  type: 'INDIVIDUAL_EXCEEDS_100' | 'INDIVIDUAL_EXCEEDS_PI_LIMIT' | 'INDIVIDUAL_EXCEEDS_TOTAL_ROLE_LIMIT' | 'TEAM_HIGH_UTILIZATION' | 'PROJECT_HIGH_PARTICIPATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  entityId: string;
  entityType: string;
  timestamp: Date;
  acknowledged: boolean;
  metadata: Record<string, any>;
}

interface TeamUtilizationData {
  teamName: string;
  totalAllocation: number;
  availableCapacity: number;
  utilizationPercentage: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
}

@Injectable()
export class ParticipationMonitoringService {
  constructor(
    @InjectRepository(ProjectPersonnel)
    private projectPersonnelRepository: Repository<ProjectPersonnel>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private participationCalculationService: ParticipationCalculationService,
    private auditService: AuditService,
  ) {}

  /**
   * Validate that no individual's total participation rate exceeds 100%
   * and that role-based limits are respected (max 3 PI roles, max 5 total roles)
   * @returns Array of violations found
   */
  async validateIndividualParticipationLimits(): Promise<ParticipationAlert[]> {
    const alerts: ParticipationAlert[] = [];
    
    // Get all personnel with their project participations
    const personnelWithParticipations = await this.personnelRepository
      .createQueryBuilder('personnel')
      .leftJoinAndSelect('personnel.projectPersonnel', 'projectPersonnel')
      .leftJoinAndSelect('projectPersonnel.project', 'project')
      .where('personnel.isActive = :isActive', { isActive: true })
      .getMany();

    for (const personnel of personnelWithParticipations) {
      // Filter for active participations only
      const activeParticipations = personnel.projectPersonnel
        .filter(pp => !pp.endDate || pp.endDate > new Date());
      
      // Calculate total participation rate
      const totalParticipationRate = activeParticipations
        .reduce((sum, pp) => sum + pp.participationRate, 0);
      
      // Count PI roles
      const piRoleCount = activeParticipations
        .filter(pp => pp.role === ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR)
        .length;
        
      // Count total roles
      const totalRoleCount = activeParticipations.length;

      // Check total participation rate limit (existing validation)
      if (totalParticipationRate > 100) {
        const alert: ParticipationAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'INDIVIDUAL_EXCEEDS_100',
          severity: 'CRITICAL',
          title: `개인 참여율 100% 초과: ${personnel.name}`,
          message: `직원 ${personnel.name} (사번: ${personnel.employeeId})의 총 참여율이 ${totalParticipationRate}%로 100%를 초과했습니다.`,
          entityId: personnel.id,
          entityType: 'Personnel',
          timestamp: new Date(),
          acknowledged: false,
          metadata: {
            employeeId: personnel.employeeId,
            name: personnel.name,
            totalParticipationRate,
            exceedingAmount: totalParticipationRate - 100,
            activeParticipations: activeParticipations
              .map(pp => ({
                projectId: pp.project.id,
                projectName: pp.project.name,
                participationRate: pp.participationRate,
                role: pp.role,
              })),
          },
        };
        
        alerts.push(alert);
      }
      
      // Check PI role limit (max 3)
      if (piRoleCount > 3) {
        const alert: ParticipationAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'INDIVIDUAL_EXCEEDS_PI_LIMIT',
          severity: 'CRITICAL',
          title: `개인 연구책임자 역할 초과: ${personnel.name}`,
          message: `직원 ${personnel.name} (사번: ${personnel.employeeId})의 연구책임자 역할이 ${piRoleCount}개로 최대 3개를 초과했습니다.`,
          entityId: personnel.id,
          entityType: 'Personnel',
          timestamp: new Date(),
          acknowledged: false,
          metadata: {
            employeeId: personnel.employeeId,
            name: personnel.name,
            piRoleCount,
            maxPiRoles: 3,
            exceedingAmount: piRoleCount - 3,
            activeParticipations: activeParticipations
              .map(pp => ({
                projectId: pp.project.id,
                projectName: pp.project.name,
                participationRate: pp.participationRate,
                role: pp.role,
              })),
          },
        };
        
        alerts.push(alert);
      }
      
      // Check total role limit (max 5)
      if (totalRoleCount > 5) {
        const alert: ParticipationAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'INDIVIDUAL_EXCEEDS_TOTAL_ROLE_LIMIT',
          severity: 'CRITICAL',
          title: `개인 총 역할 수 초과: ${personnel.name}`,
          message: `직원 ${personnel.name} (사번: ${personnel.employeeId})의 총 역할 수가 ${totalRoleCount}개로 최대 5개를 초과했습니다.`,
          entityId: personnel.id,
          entityType: 'Personnel',
          timestamp: new Date(),
          acknowledged: false,
          metadata: {
            employeeId: personnel.employeeId,
            name: personnel.name,
            totalRoleCount,
            maxTotalRoles: 5,
            exceedingAmount: totalRoleCount - 5,
            activeParticipations: activeParticipations
              .map(pp => ({
                projectId: pp.project.id,
                projectName: pp.project.name,
                participationRate: pp.participationRate,
                role: pp.role,
              })),
          },
        };
        
        alerts.push(alert);
      }
    }
    
    // Batch audit log all violations at once
    const auditPromises = alerts.map(alert => {
      let validationType: string;
      switch (alert.type) {
        case 'INDIVIDUAL_EXCEEDS_100':
          validationType = 'INDIVIDUAL_PARTICIPATION_LIMIT';
          break;
        case 'INDIVIDUAL_EXCEEDS_PI_LIMIT':
          validationType = 'INDIVIDUAL_PI_ROLE_LIMIT';
          break;
        case 'INDIVIDUAL_EXCEEDS_TOTAL_ROLE_LIMIT':
          validationType = 'INDIVIDUAL_TOTAL_ROLE_LIMIT';
          break;
        default:
          validationType = 'UNKNOWN';
      }
      return this.auditService.logChange(
        'Personnel',
        alert.entityId,
        'UPDATE',
        { validationType, isValid: false },
        'SYSTEM',
      );
    });
    
    await Promise.all(auditPromises);
    
    return alerts;
  }

  /**
   * Check team utilization rates and generate alerts for high utilization
   * @param warningThreshold - Percentage at which to trigger warning alert (default 80)
   * @param criticalThreshold - Percentage at which to trigger critical alert (default 95)
   * @returns Array of team utilization alerts
   */
  async checkTeamUtilization(
    warningThreshold: number = 80,
    criticalThreshold: number = 95,
  ): Promise<ParticipationAlert[]> {
    const alerts: ParticipationAlert[] = [];
    
    // Get all projects with their participating teams and calculate team allocations
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.projectPersonnel', 'projectPersonnel')
      .leftJoinAndSelect('projectPersonnel.personnel', 'personnel')
      .where('project.status IN (:...status)', { status: ['APPROVED', 'IN_PROGRESS', 'PLANNING'] })
      .getMany();

    // Calculate team allocations
    const teamAllocations: Record<string, number> = {};
    
    for (const project of projects) {
      for (const pp of project.projectPersonnel) {
        if (!pp.endDate || pp.endDate > new Date()) { // Only active participations
          const team = pp.participatingTeam || pp.personnel.team; // Use participating team or fallback to personnel team
          if (!teamAllocations[team]) {
            teamAllocations[team] = 0;
          }
          teamAllocations[team] += pp.participationRate;
        }
      }
    }

    // Generate alerts based on utilization
    for (const [teamName, totalAllocation] of Object.entries(teamAllocations)) {
      let severity: ParticipationAlert['severity'] = 'LOW';
      let title: string;
      let message: string;
      
      if (totalAllocation >= criticalThreshold) {
        severity = 'CRITICAL';
        title = `팀 참여율 위험: ${teamName}`;
        message = `팀 ${teamName}의 총 참여 할당률이 ${totalAllocation}%로 위험 수준(${criticalThreshold}% 이상)에 도달했습니다.`;
      } else if (totalAllocation >= warningThreshold) {
        severity = 'MEDIUM';
        title = `팀 참여율 주의: ${teamName}`;
        message = `팀 ${teamName}의 총 참여 할당률이 ${totalAllocation}%로 주의 수준(${warningThreshold}% 이상)에 도달했습니다.`;
      } else {
        continue; // No alert needed
      }

      const alert: ParticipationAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'TEAM_HIGH_UTILIZATION',
        severity,
        title,
        message,
        entityId: teamName,
        entityType: 'Team',
        timestamp: new Date(),
        acknowledged: false,
        metadata: {
          teamName,
          totalAllocation,
          availableCapacity: Math.max(0, 100 - totalAllocation),
          utilizationPercentage: totalAllocation,
          thresholdExceeded: totalAllocation - (severity === 'CRITICAL' ? criticalThreshold : warningThreshold),
        },
      };
      
      alerts.push(alert);
    }
    
    return alerts;
  }

  /**
   * Check for projects with unusually high participation rates
   * @param threshold - Percentage at which to trigger alert (default 90)
   * @returns Array of project participation alerts
   */
  async checkProjectHighParticipation(threshold: number = 90): Promise<ParticipationAlert[]> {
    const alerts: ParticipationAlert[] = [];
    
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.projectPersonnel', 'projectPersonnel')
      .where('project.status IN (:...status)', { status: ['APPROVED', 'IN_PROGRESS'] })
      .getMany();

    for (const project of projects) {
      const totalParticipationRate = project.projectPersonnel
        .filter(pp => !pp.endDate || pp.endDate > new Date()) // Only active participations
        .reduce((sum, pp) => sum + pp.participationRate, 0);

      if (totalParticipationRate >= threshold) {
        const alert: ParticipationAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'PROJECT_HIGH_PARTICIPATION',
          severity: totalParticipationRate >= 95 ? 'HIGH' : 'MEDIUM',
          title: `프로젝트 참여율 높음: ${project.name}`,
          message: `프로젝트 "${project.name}"의 총 참여율이 ${totalParticipationRate}%로 임계값(${threshold}%)을 초과했습니다.`,
          entityId: project.id,
          entityType: 'Project',
          timestamp: new Date(),
          acknowledged: false,
          metadata: {
            projectId: project.id,
            projectName: project.name,
            projectType: project.projectType,
            managingTeam: project.managingTeam,
            totalParticipationRate,
            threshold,
            exceedingAmount: totalParticipationRate - threshold,
            activeParticipations: project.projectPersonnel
              .filter(pp => !pp.endDate || pp.endDate > new Date())
              .length,
          },
        };
        
        alerts.push(alert);
      }
    }
    
    return alerts;
  }

  /**
   * Run all participation validation checks and return combined alerts
   * @returns All participation-related alerts
   */
  async runAllParticipationChecks(): Promise<ParticipationAlert[]> {
    const [
      individualAlerts,
      teamAlerts,
      projectAlerts,
    ] = await Promise.all([
      this.validateIndividualParticipationLimits(),
      this.checkTeamUtilization(),
      this.checkProjectHighParticipation(),
    ]);
    
    return [...individualAlerts, ...teamAlerts, ...projectAlerts];
  }

  /**
   * Get current team utilization data for dashboard display
   * @returns Array of team utilization data
   */
  async getTeamUtilizationData(): Promise<TeamUtilizationData[]> {
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.projectPersonnel', 'projectPersonnel')
      .leftJoinAndSelect('projectPersonnel.personnel', 'personnel')
      .where('project.status IN (:...status)', { status: ['APPROVED', 'IN_PROGRESS', 'PLANNING'] })
      .getMany();

    // Calculate team allocations
    const teamAllocations: Record<string, number> = {};
    
    for (const project of projects) {
      for (const pp of project.projectPersonnel) {
        if (!pp.endDate || pp.endDate > new Date()) { // Only active participations
          const team = pp.participatingTeam || pp.personnel.team;
          if (!teamAllocations[team]) {
            teamAllocations[team] = 0;
          }
          teamAllocations[team] += pp.participationRate;
        }
      }
    }

    // Convert to TeamUtilizationData array
    return Object.entries(teamAllocations).map(([teamName, totalAllocation]) => {
      let status: TeamUtilizationData['status'] = 'OK';
      
      if (totalAllocation >= 95) {
        status = 'CRITICAL';
      } else if (totalAllocation >= 80) {
        status = 'WARNING';
      }
      
      return {
        teamName,
        totalAllocation,
        availableCapacity: Math.max(0, 100 - totalAllocation),
        utilizationPercentage: totalAllocation,
        status,
      };
    });
  }

  /**
   * Acknowledge an alert (mark as handled)
   * @param alertId - The ID of the alert to acknowledge
   * @param acknowledgedBy - User ID who acknowledged the alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    await this.auditService.logChange(
      'ParticipationAlert',
      alertId,
      'UPDATE',
      {
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date().toISOString(),
      },
      acknowledgedBy,
    );
  }

  /**
   * Get all individual participation data for dashboard
   */
  async getIndividualParticipationData() {
    const personnelWithParticipations = await this.personnelRepository
      .createQueryBuilder('personnel')
      .leftJoinAndSelect('personnel.projectPersonnel', 'projectPersonnel')
      .leftJoinAndSelect('projectPersonnel.project', 'project')
      .where('personnel.isActive = :isActive', { isActive: true })
      .getMany();

    return personnelWithParticipations.map(personnel => {
      const activeParticipations = personnel.projectPersonnel
        .filter(pp => !pp.endDate || pp.endDate > new Date());

      const totalParticipationRate = activeParticipations
        .reduce((sum, pp) => sum + pp.participationRate, 0);

      const piRoleCount = activeParticipations
        .filter(pp => pp.role === ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR)
        .length;

      let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
      if (totalParticipationRate > 100 || piRoleCount > 3) {
        status = 'CRITICAL';
      } else if (totalParticipationRate >= 90 || piRoleCount >= 3) {
        status = 'WARNING';
      }

      return {
        personnelId: personnel.id,
        employeeId: personnel.employeeId,
        name: personnel.name,
        team: personnel.team,
        position: personnel.position,
        totalParticipationRate,
        piRoleCount,
        totalRoleCount: activeParticipations.length,
        status,
        activeParticipations: activeParticipations.map(pp => ({
          projectPersonnelId: pp.id,
          projectId: pp.project.id,
          projectName: pp.project.name,
          participationRate: pp.participationRate,
          role: pp.role,
          startDate: pp.startDate,
          endDate: pp.endDate,
        })),
      };
    });
  }

  /**
   * Get individual participation data by personnel ID
   */
  async getIndividualParticipationById(id: string) {
    const personnel = await this.personnelRepository
      .createQueryBuilder('personnel')
      .leftJoinAndSelect('personnel.projectPersonnel', 'projectPersonnel')
      .leftJoinAndSelect('projectPersonnel.project', 'project')
      .where('personnel.id = :id', { id })
      .getOne();

    if (!personnel) {
      return null;
    }

    const activeParticipations = personnel.projectPersonnel
      .filter(pp => !pp.endDate || pp.endDate > new Date());

    const totalParticipationRate = activeParticipations
      .reduce((sum, pp) => sum + pp.participationRate, 0);

    const piRoleCount = activeParticipations
      .filter(pp => pp.role === ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR)
      .length;

    let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (totalParticipationRate > 100 || piRoleCount > 3) {
      status = 'CRITICAL';
    } else if (totalParticipationRate >= 90 || piRoleCount >= 3) {
      status = 'WARNING';
    }

    return {
      personnelId: personnel.id,
      employeeId: personnel.employeeId,
      name: personnel.name,
      team: personnel.team,
      position: personnel.position,
      salaryBand: personnel.salaryBand,
      highestEducation: personnel.highestEducation,
      educationYear: personnel.educationYear,
      totalParticipationRate,
      piRoleCount,
      totalRoleCount: activeParticipations.length,
      status,
      activeParticipations: activeParticipations.map(pp => ({
        projectPersonnelId: pp.id,
        projectId: pp.project.id,
        projectName: pp.project.name,
        participationRate: pp.participationRate,
        role: pp.role,
        startDate: pp.startDate,
        endDate: pp.endDate,
      })),
    };
  }
}
