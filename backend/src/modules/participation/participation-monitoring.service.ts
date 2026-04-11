import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPersonnel } from './project-personnel.entity';
import { ProjectPersonnelRole } from './project-personnel-role.enum';
import { Personnel } from '../personnel/personnel.entity';
import { Project } from '../projects/project.entity';
import { ParticipationCalculationService } from './participation-calculation.service';
import { AuditService } from '../audit/audit.service';
import { ProjectPersonnelSegment } from './project-personnel-segment.entity';

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
  memberCount: number;
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

  private buildFallbackSegment(pp: ProjectPersonnel): ProjectPersonnelSegment {
    return {
      id: `fallback-${pp.id}`,
      projectPersonnel: pp,
      startDate: pp.startDate,
      endDate: pp.endDate || new Date('9999-12-31'),
      participationRate: Number(pp.participationRate || 0),
      personnelCostOverride: pp.personnelCostOverride ?? null,
      sortOrder: 0,
      notes: null,
      createdAt: pp.createdAt,
      updatedAt: pp.updatedAt,
    };
  }

  private getSegments(pp: ProjectPersonnel): ProjectPersonnelSegment[] {
    return pp.segments?.length ? pp.segments : [this.buildFallbackSegment(pp)];
  }

  private getCurrentParticipationRate(pp: ProjectPersonnel, at: Date = new Date()): number {
    const segment = this.getSegments(pp).find((item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      return start <= at && end >= at;
    });

    return Number(segment?.participationRate || 0);
  }

  private async getActiveTeamMemberCounts(): Promise<Record<string, number>> {
    const activePersonnel = await this.personnelRepository.find({
      where: { isActive: true },
    });

    return activePersonnel.reduce<Record<string, number>>((acc, person) => {
      const team = person.team || '???';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});
  }

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
      .leftJoinAndSelect('projectPersonnel.segments', 'segments')
      .where('personnel.isActive = :isActive', { isActive: true })
      .getMany();

    for (const personnel of personnelWithParticipations) {
      // Filter for active participations only
      const activeParticipations = personnel.projectPersonnel
        .filter(pp => !pp.endDate || pp.endDate > new Date())
        .filter(pp => this.getCurrentParticipationRate(pp) > 0);
      
      // Calculate total participation rate
      const totalParticipationRate = activeParticipations
        .reduce((sum, pp) => sum + this.getCurrentParticipationRate(pp), 0);
      
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
                participationRate: this.getCurrentParticipationRate(pp),
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
                participationRate: this.getCurrentParticipationRate(pp),
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
                participationRate: this.getCurrentParticipationRate(pp),
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
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.projectPersonnel', 'projectPersonnel')
      .leftJoinAndSelect('projectPersonnel.personnel', 'personnel')
      .leftJoinAndSelect('projectPersonnel.segments', 'segments')
      .where('project.status IN (:...status)', { status: ['APPROVED', 'IN_PROGRESS', 'PLANNING'] })
      .getMany();

    const teamAllocations: Record<string, number> = {};
    const teamMembers = await this.getActiveTeamMemberCounts();

    for (const project of projects) {
      for (const pp of project.projectPersonnel) {
        if (!pp.endDate || pp.endDate > new Date()) {
          const team = pp.participatingTeam || pp.personnel.team;
          if (!teamAllocations[team]) {
            teamAllocations[team] = 0;
          }
          teamAllocations[team] += this.getCurrentParticipationRate(pp);
        }
      }
    }

    for (const [teamName, totalAllocation] of Object.entries(teamAllocations)) {
      const memberCount = teamMembers[teamName] || 0;
      const averageParticipationRate = memberCount > 0 ? totalAllocation / memberCount : 0;
      let severity: ParticipationAlert['severity'] = 'LOW';
      let title: string;
      let message: string;

      if (averageParticipationRate >= criticalThreshold) {
        severity = 'CRITICAL';
        title = `? ?? ??? ??: ${teamName}`;
        message = `? ${teamName}? ?? ???? ${averageParticipationRate.toFixed(1)}%? ?? ??(${criticalThreshold}% ??)? ??????.`;
      } else if (averageParticipationRate >= warningThreshold) {
        severity = 'MEDIUM';
        title = `? ?? ??? ??: ${teamName}`;
        message = `? ${teamName}? ?? ???? ${averageParticipationRate.toFixed(1)}%? ?? ??(${warningThreshold}% ??)? ??????.`;
      } else {
        continue;
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
          memberCount,
          availableCapacity: Math.max(0, 100 - averageParticipationRate),
          utilizationPercentage: averageParticipationRate,
          thresholdExceeded: averageParticipationRate - (severity === 'CRITICAL' ? criticalThreshold : warningThreshold),
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
      .leftJoinAndSelect('projectPersonnel.segments', 'segments')
      .where('project.status IN (:...status)', { status: ['APPROVED', 'IN_PROGRESS'] })
      .getMany();

    for (const project of projects) {
      const activeParticipations = project.projectPersonnel
        .filter(pp => !pp.endDate || pp.endDate > new Date())
        .filter(pp => this.getCurrentParticipationRate(pp) > 0);
      const totalParticipationRate = activeParticipations
        .reduce((sum, pp) => sum + this.getCurrentParticipationRate(pp), 0);
      const memberCount = activeParticipations.length;
      const averageParticipationRate = memberCount > 0 ? totalParticipationRate / memberCount : 0;

      if (averageParticipationRate >= threshold) {
        const alert: ParticipationAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'PROJECT_HIGH_PARTICIPATION',
          severity: averageParticipationRate >= 95 ? 'HIGH' : 'MEDIUM',
          title: `???? ?? ??? ??: ${project.name}`,
          message: `???? "${project.name}"? ?? ???? ${averageParticipationRate.toFixed(1)}%? ???(${threshold}%)? ??????.`,
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
            averageParticipationRate,
            memberCount,
            threshold,
            exceedingAmount: averageParticipationRate - threshold,
            activeParticipations: memberCount,
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
      .leftJoinAndSelect('projectPersonnel.segments', 'segments')
      .where('project.status IN (:...status)', { status: ['APPROVED', 'IN_PROGRESS', 'PLANNING'] })
      .getMany();

    const teamAllocations: Record<string, number> = {};
    const teamMembers = await this.getActiveTeamMemberCounts();

    for (const project of projects) {
      for (const pp of project.projectPersonnel) {
        if (!pp.endDate || pp.endDate > new Date()) {
          const team = pp.participatingTeam || pp.personnel.team;
          if (!teamAllocations[team]) {
            teamAllocations[team] = 0;
          }
          teamAllocations[team] += this.getCurrentParticipationRate(pp);
        }
      }
    }

    return Object.entries(teamAllocations).map(([teamName, totalAllocation]) => {
      const memberCount = teamMembers[teamName] || 0;
      const averageParticipationRate = memberCount > 0 ? totalAllocation / memberCount : 0;
      let status: TeamUtilizationData['status'] = 'OK';

      if (averageParticipationRate >= 95) {
        status = 'CRITICAL';
      } else if (averageParticipationRate >= 80) {
        status = 'WARNING';
      }

      return {
        teamName,
        totalAllocation,
        memberCount,
        availableCapacity: Math.max(0, 100 - averageParticipationRate),
        utilizationPercentage: averageParticipationRate,
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
      .leftJoinAndSelect('projectPersonnel.segments', 'segments')
      .where('personnel.isActive = :isActive', { isActive: true })
      .getMany();

    return personnelWithParticipations.map(personnel => {
      const activeParticipations = personnel.projectPersonnel
        .filter(pp => !pp.endDate || pp.endDate > new Date())
        .filter(pp => this.getCurrentParticipationRate(pp) > 0);

      const totalParticipationRate = activeParticipations
        .reduce((sum, pp) => sum + this.getCurrentParticipationRate(pp), 0);

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
          participationRate: this.getCurrentParticipationRate(pp),
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
      .leftJoinAndSelect('projectPersonnel.segments', 'segments')
      .where('personnel.id = :id', { id })
      .getOne();

    if (!personnel) {
      return null;
    }

    const activeParticipations = personnel.projectPersonnel
      .filter(pp => !pp.endDate || pp.endDate > new Date())
      .filter(pp => this.getCurrentParticipationRate(pp) > 0);

    const totalParticipationRate = activeParticipations
      .reduce((sum, pp) => sum + this.getCurrentParticipationRate(pp), 0);

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
      salaryReferencePosition: personnel.salaryReferencePosition,
      positionAverageAnnualSalary: personnel.positionAverageAnnualSalary,
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
        participationRate: this.getCurrentParticipationRate(pp),
        role: pp.role,
        startDate: pp.startDate,
        endDate: pp.endDate,
      })),
    };
  }
}
