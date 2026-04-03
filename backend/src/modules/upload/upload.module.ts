import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { Personnel } from '../personnel/personnel.entity';
import { Project } from '../projects/project.entity';
import { ProjectPersonnel } from '../participation/project-personnel.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Personnel, Project, ProjectPersonnel, User]),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
