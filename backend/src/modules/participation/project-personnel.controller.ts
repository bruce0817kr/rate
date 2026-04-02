import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProjectPersonnelService } from './project-personnel.service';
import { CreateProjectPersonnelDto } from './dto/create-project-personnel.dto';
import { UpdateProjectPersonnelDto } from './dto/update-project-personnel.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('project-personnel')
@UseGuards(JwtAuthGuard)
export class ProjectPersonnelController {
  constructor(private readonly projectPersonnelService: ProjectPersonnelService) {}

  @Post()
  async create(@Body() createProjectPersonnelDto: CreateProjectPersonnelDto) {
    return this.projectPersonnelService.createProjectPersonnel(createProjectPersonnelDto);
  }

  @Get()
  findAll() {
    return this.projectPersonnelService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectPersonnelService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: UpdateProjectPersonnelDto) {
    return this.projectPersonnelService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectPersonnelService.remove(id);
  }
}