import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.STRATEGY_PLANNING,
    UserRole.HR_GENERAL_AFFAIRS,
    UserRole.HR_FINANCE,
    UserRole.GENERAL,
  )
  async findAll() {
    return this.teamsService.findAll();
  }

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.STRATEGY_PLANNING,
    UserRole.HR_GENERAL_AFFAIRS,
    UserRole.HR_FINANCE,
  )
  async create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.STRATEGY_PLANNING,
    UserRole.HR_GENERAL_AFFAIRS,
    UserRole.HR_FINANCE,
  )
  async update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.STRATEGY_PLANNING,
    UserRole.HR_GENERAL_AFFAIRS,
    UserRole.HR_FINANCE,
  )
  async remove(@Param('id') id: string) {
    await this.teamsService.remove(id);
    return { message: 'deleted' };
  }
}
