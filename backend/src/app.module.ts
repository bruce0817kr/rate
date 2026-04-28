import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { ProjectModule } from './modules/projects/project.module';
import { ParticipationModule } from './modules/participation/participation.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AuditModule } from './modules/audit/audit.module';
import { RegulationsModule } from './modules/regulations/regulations.module';
import { UsersModule } from './modules/users/users.module';
import { UploadModule } from './modules/upload/upload.module';
import { TeamsModule } from './modules/teams/teams.module';
import { SalaryBandsModule } from './modules/salary-bands/salary-bands.module';
import { HealthController } from './health.controller';
import { buildTypeOrmOptions } from './config/runtime.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => buildTypeOrmOptions(),
    }),
    AuthModule,
    UsersModule,
    PersonnelModule,
    ProjectModule,
    ParticipationModule,
    DocumentsModule,
    AuditModule,
    RegulationsModule,
    TeamsModule,
    SalaryBandsModule,
    UploadModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
