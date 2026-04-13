import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UploadedFile, UseInterceptors, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import csv from 'csv-parser';
import * as fs from 'fs';
import { join } from 'path';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectService: ProjectService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.createProject(createProjectDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('copy-year')
  async copyYear(@Body() body: { sourceYear: number; targetYear: number }) {
    return this.projectService.copyFiscalYear(Number(body.sourceYear), Number(body.targetYear));
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('fiscalYear') fiscalYear?: string) {
    return this.projectService.findAllProjects({}, fiscalYear ? Number(fiscalYear) : undefined);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectService.findProjectById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.projectService.updateProject(id, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectService.removeProject(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('team/:team')
  findByManagingTeam(@Param('team') team: string) {
    return this.projectService.findProjectsByManagingTeam(team);
  }

  @UseGuards(JwtAuthGuard)
  @Get('participating-team/:team')
  findByParticipatingTeam(@Param('team') team: string) {
    return this.projectService.findProjectsByParticipatingTeam(team);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv') {
        cb(null, true);
      } else {
        cb(new HttpException('Only CSV files are allowed', HttpStatus.BAD_REQUEST), false);
      }
    }
  }))
  async bulkUploadProjects(@UploadedFile() file: Express.Multer.File) {
    const uploadPath = file.path;
    const results: any[] = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(uploadPath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          let processedCount = 0;
          const errors: string[] = [];
          
          for (const row of results) {
            try {
              const createProjectDto: CreateProjectDto = {
                name: row.name,
                fiscalYear: row.fiscalYear ? Number(row.fiscalYear) : undefined,
                projectType: row.projectType as any, // Assuming it matches the enum values
                managingDepartment: row.managingDepartment,
                startDate: row.startDate,
                endDate: row.endDate,
                totalBudget: parseFloat(row.totalBudget),
                personnelBudget: parseFloat(row.personnelBudget),
                status: row.status || 'PLANNING',
                managingTeam: row.managingTeam,
                participatingTeams: row.participatingTeams ? row.participatingTeams.split(',').map(t => t.trim()) : [],
              };
              
              await this.projectService.createProject(createProjectDto);
              processedCount++;
            } catch (error) {
              errors.push(`Row ${JSON.stringify(row)}: ${error.message}`);
              // Continue processing other rows
            }
          }
          
          // Clean up uploaded file
          try {
            fs.unlinkSync(uploadPath);
          } catch (unlinkErr) {
            console.error('Failed to delete uploaded file:', unlinkErr);
          }
          
          if (errors.length > 0) {
            resolve({ 
              message: `Projects bulk upload completed with ${errors.length} errors. Processed: ${processedCount} records.`, 
              processedCount 
            });
          } else {
            resolve({ 
              message: `Projects bulk upload completed successfully. Processed: ${processedCount} records.`, 
              processedCount 
            });
          }
        })
        .on('error', (error) => {
          // Clean up uploaded file on error
          try {
            fs.unlinkSync(uploadPath);
          } catch (unlinkErr) {
            console.error('Failed to delete uploaded file on error:', unlinkErr);
          }
          reject(new HttpException(`CSV processing failed: ${error.message}`, HttpStatus.BAD_REQUEST));
        });
    });
  }
}
