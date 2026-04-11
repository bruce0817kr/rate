import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateSalaryBandDto } from './dto/create-salary-band.dto';
import { UpdateSalaryBandDto } from './dto/update-salary-band.dto';
import { SalaryBandsService } from './salary-bands.service';

@Controller('salary-bands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalaryBandsController {
  constructor(private readonly salaryBandsService: SalaryBandsService) {}

  @Get()
  async findAll() {
    return this.salaryBandsService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STRATEGY_PLANNING, UserRole.HR_GENERAL_AFFAIRS)
  async create(@Body() dto: CreateSalaryBandDto) {
    return this.salaryBandsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STRATEGY_PLANNING, UserRole.HR_GENERAL_AFFAIRS)
  async update(@Param('id') id: string, @Body() dto: UpdateSalaryBandDto) {
    return this.salaryBandsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STRATEGY_PLANNING, UserRole.HR_GENERAL_AFFAIRS)
  async remove(@Param('id') id: string) {
    await this.salaryBandsService.remove(id);
    return { message: 'deleted' };
  }
}
