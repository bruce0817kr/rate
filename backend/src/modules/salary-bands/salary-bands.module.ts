import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryBand } from './salary-band.entity';
import { SalaryBandsController } from './salary-bands.controller';
import { SalaryBandsService } from './salary-bands.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalaryBand])],
  controllers: [SalaryBandsController],
  providers: [SalaryBandsService],
  exports: [SalaryBandsService],
})
export class SalaryBandsModule {}

