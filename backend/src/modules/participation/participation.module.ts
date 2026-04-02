import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPersonnelController } from './project-personnel.controller';
import { ProjectPersonnelService } from './project-personnel.service';
import { ProjectPersonnel } from './project-personnel.entity';
import { PersonnelCost } from './personnel-cost.entity';
import { Personnel } from '../personnel/personnel.entity';
import { Project } from '../projects/project.entity';
import { ParticipationCalculationService } from './participation-calculation.service';
import { ParticipationMonitoringService } from './participation-monitoring.service';
import { ParticipationMonitoringController } from './participation-monitoring.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectPersonnel, PersonnelCost, Personnel, Project]), AuditModule],
  controllers: [ProjectPersonnelController, ParticipationMonitoringController],
  providers: [ProjectPersonnelService, ParticipationCalculationService, ParticipationMonitoringService],
  exports: [ProjectPersonnelService, ParticipationCalculationService, ParticipationMonitoringService],
})
export class ParticipationModule {}