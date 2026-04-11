import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPersonnelController } from './project-personnel.controller';
import { ProjectPersonnelService } from './project-personnel.service';
import { ProjectPersonnel } from './project-personnel.entity';
import { ProjectPersonnelSegment } from './project-personnel-segment.entity';
import { PersonnelCost } from './personnel-cost.entity';
import { Personnel } from '../personnel/personnel.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { ParticipationCalculationService } from './participation-calculation.service';
import { ParticipationMonitoringService } from './participation-monitoring.service';
import { ParticipationMonitoringController } from './participation-monitoring.controller';
import { AuditModule } from '../audit/audit.module';
import { ProjectPersonnelSchemaBootstrapService } from './project-personnel-schema-bootstrap.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectPersonnel, ProjectPersonnelSegment, PersonnelCost, Personnel, Project, User]), AuditModule],
  controllers: [ProjectPersonnelController, ParticipationMonitoringController],
  providers: [ProjectPersonnelService, ParticipationCalculationService, ParticipationMonitoringService, ProjectPersonnelSchemaBootstrapService],
  exports: [ProjectPersonnelService, ParticipationCalculationService, ParticipationMonitoringService],
})
export class ParticipationModule {}
