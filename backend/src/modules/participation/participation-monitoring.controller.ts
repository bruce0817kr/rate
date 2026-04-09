import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ParticipationMonitoringService } from './participation-monitoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface ParticipationAlertResponse {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  entityId: string;
  entityType: string;
  timestamp: Date;
  acknowledged: boolean;
  metadata: Record<string, any>;
}

interface TeamUtilizationResponse {
  teamName: string;
  totalAllocation: number;
  availableCapacity: number;
  utilizationPercentage: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
}

interface IndividualParticipationResponse {
  personnelId: string;
  employeeId: string;
  name: string;
  team: string;
  position: string;
  totalParticipationRate: number;
  piRoleCount: number;
  totalRoleCount: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  activeParticipations: {
    projectPersonnelId: string;
    projectId: string;
    projectName: string;
    participationRate: number;
    role: string;
    startDate: Date;
    endDate: Date | null;
  }[];
}

@Controller('participation-monitoring')

export class ParticipationMonitoringController {
  constructor(private readonly participationMonitoringService: ParticipationMonitoringService) {}

  @Get('alerts')
  async getParticipationAlerts(): Promise<ParticipationAlertResponse[]> {
    const alerts = await this.participationMonitoringService.runAllParticipationChecks();
    return alerts;
  }

  @Get('team-utilization')
  async getTeamUtilization(): Promise<TeamUtilizationResponse[]> {
    return await this.participationMonitoringService.getTeamUtilizationData();
  }

  @Get('individual')
  async getIndividualParticipations(): Promise<IndividualParticipationResponse[]> {
    return await this.participationMonitoringService.getIndividualParticipationData();
  }

  @Get('individual/:id')
  async getIndividualParticipation(@Param('id') id: string): Promise<IndividualParticipationResponse | null> {
    return await this.participationMonitoringService.getIndividualParticipationById(id);
  }

  @Get('validate-individual')
  async validateIndividualParticipation(): Promise<ParticipationAlertResponse[]> {
    return await this.participationMonitoringService.validateIndividualParticipationLimits();
  }

  @Get('validate-team')
  async validateTeamUtilization(
    @Body() body: { warningThreshold?: number; criticalThreshold?: number }
  ): Promise<ParticipationAlertResponse[]> {
    const { warningThreshold = 80, criticalThreshold = 95 } = body;
    return await this.participationMonitoringService.checkTeamUtilization(warningThreshold, criticalThreshold);
  }

  @Get('validate-project')
  async validateProjectParticipation(
    @Body() body: { threshold?: number }
  ): Promise<ParticipationAlertResponse[]> {
    const { threshold = 90 } = body;
    return await this.participationMonitoringService.checkProjectHighParticipation(threshold);
  }

  @Post('acknowledge-alert/:alertId')
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Request() req
  ): Promise<{ success: boolean }> {
    // In a real implementation, we would extract the user ID from the request
    const userId = req.user?.userId || 'unknown';
    await this.participationMonitoringService.acknowledgeAlert(alertId, userId);
    return { success: true };
  }
}
