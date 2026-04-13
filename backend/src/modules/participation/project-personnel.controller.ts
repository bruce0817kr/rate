import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ProjectPersonnelService } from './project-personnel.service';
import { CreateProjectPersonnelDto } from './dto/create-project-personnel.dto';
import { UpdateProjectPersonnelDto } from './dto/update-project-personnel.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('project-personnel')
@UseGuards(JwtAuthGuard)
export class ProjectPersonnelController {
  constructor(private readonly projectPersonnelService: ProjectPersonnelService) {}

  @Post()
  async create(@Body() createProjectPersonnelDto: CreateProjectPersonnelDto, @Request() req: any) {
    return this.projectPersonnelService.createProjectPersonnel(createProjectPersonnelDto, req.user);
  }

  @Get()
  findAll(@Request() req: any, @Query('fiscalYear') fiscalYear?: string) {
    return this.projectPersonnelService.findAll({}, req.user, fiscalYear ? Number(fiscalYear) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.projectPersonnelService.findOne(id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: UpdateProjectPersonnelDto, @Request() req: any) {
    return this.projectPersonnelService.update(id, updateData, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectPersonnelService.remove(id);
  }
}
