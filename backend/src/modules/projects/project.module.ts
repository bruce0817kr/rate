import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectService } from './project.service';
import { ProjectsController } from './projects.controller';
import { ProjectSchemaBootstrapService } from './project-schema-bootstrap.service';
import { ProjectPersonnel } from '../participation/project-personnel.entity';
import { ProjectPersonnelSegment } from '../participation/project-personnel-segment.entity';
import { SalaryBand } from '../salary-bands/salary-band.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectPersonnel, ProjectPersonnelSegment, SalaryBand])],
  controllers: [ProjectsController],
  providers: [ProjectService, ProjectSchemaBootstrapService],
  exports: [ProjectService],
})
export class ProjectModule {}
