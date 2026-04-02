import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UploadedFile, UseInterceptors, HttpException, HttpStatus } from '@nestjs/common';
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PersonnelEmploymentType } from './personnel.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import { join } from 'path';

@Controller('personnel')
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createPersonnelDto: CreatePersonnelDto) {
    return this.personnelService.createPersonnel(createPersonnelDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.personnelService.findAllPersonnel();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.personnelService.findPersonnelById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.personnelService.updatePersonnel(id, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.personnelService.removePersonnel(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('employee/:employeeId')
  findByEmployeeId(@Param('employeeId') employeeId: string) {
    return this.personnelService.findPersonnelByEmployeeId(employeeId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.personnelService.deactivatePersonnel(id);
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
  async bulkUploadPersonnel(@UploadedFile() file: Express.Multer.File): Promise<{ message: string; processedCount: number }> {
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
              const createPersonnelDto: CreatePersonnelDto = {
                employeeId: row.employeeId,
                name: row.name,
                ssn: row.ssn,
                department: row.department,
                team: row.team,
                position: row.position,
                salaryBand: row.salaryBand,
                employmentType: row.employmentType as PersonnelEmploymentType,
                hireDate: row.hireDate,
                terminationDate: row.terminationDate || null,
                isActive: row.isActive !== undefined ? row.isActive.toLowerCase() === 'true' : true,
              };
              
              await this.personnelService.createPersonnel(createPersonnelDto);
              processedCount++;
            } catch (error) {
              errors.push(`Row ${JSON.stringify(row)}: ${error.message}`);
              // Continue processing other rows
            }
          }
          
          // Clean up uploaded file
          fs.unlinkSync(uploadPath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('Failed to delete uploaded file:', unlinkErr);
            }
          });
          
          if (errors.length > 0) {
            resolve({ 
              message: `Personnel bulk upload completed with ${errors.length} errors. Processed: ${processedCount} records.`, 
              processedCount 
            });
          } else {
            resolve({ 
              message: `Personnel bulk upload completed successfully. Processed: ${processedCount} records.`, 
              processedCount 
            });
          }
        })
        .on('error', (error) => {
          // Clean up uploaded file on error
          fs.unlinkSync(uploadPath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('Failed to delete uploaded file on error:', unlinkErr);
            }
          });
          reject(new HttpException(`CSV processing failed: ${error.message}`, HttpStatus.BAD_REQUEST));
        });
    });
  }
}