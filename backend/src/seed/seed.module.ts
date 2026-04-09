import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './personnel.seed';
import { SeedController } from './seed.controller';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { Personnel } from '../modules/personnel/personnel.entity';
import { Project } from '../modules/projects/project.entity';
import { ProjectPersonnel } from '../modules/participation/project-personnel.entity';
import { User } from '../modules/users/user.entity';
import { UsersModule } from '../modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Personnel, Project, ProjectPersonnel, User]),
    UsersModule,
  ],
  controllers: [SeedController],
  providers: [SeedService, AdminBootstrapService],
})
export class SeedModule {}
