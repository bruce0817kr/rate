import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Personnel } from '../personnel/personnel.entity';
import { SalaryBand } from './salary-band.entity';
import { SalaryBandsController } from './salary-bands.controller';
import { SalaryBandsService } from './salary-bands.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalaryBand, Personnel])],
  controllers: [SalaryBandsController],
  providers: [SalaryBandsService],
  exports: [SalaryBandsService],
})
export class SalaryBandsModule {}
