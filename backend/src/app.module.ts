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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'personnel_saas',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Only use in development!
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    AuthModule,
    PersonnelModule,
    ProjectModule,
    ParticipationModule,
    DocumentsModule,
    AuditModule,
    RegulationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}