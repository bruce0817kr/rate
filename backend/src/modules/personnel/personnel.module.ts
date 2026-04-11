import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonnelController } from './personnel.controller';
import { PersonnelService } from './personnel.service';
import { Personnel } from './personnel.entity';
import { SalaryBand } from '../salary-bands/salary-band.entity';
import { PersonnelSchemaBootstrapService } from './personnel-schema-bootstrap.service';

@Module({
  imports: [TypeOrmModule.forFeature([Personnel, SalaryBand])],
  controllers: [PersonnelController],
  providers: [PersonnelService, PersonnelSchemaBootstrapService],
  exports: [PersonnelService],
})
export class PersonnelModule {}
