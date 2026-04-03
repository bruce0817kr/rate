import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService, PersonnelCsvRow, ProjectCsvRow, ProjectPersonnelCsvRow, UserCsvRow } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import * as XLSX from 'xlsx';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  private parseExcel(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  @Post('personnel')
  @Roles(UserRole.ADMIN, UserRole.HR_FINANCE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadPersonnel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const data = this.parseExcel(file.buffer);
    const result = await this.uploadService.uploadPersonnel(data as PersonnelCsvRow[]);
    return {
      message: `Uploaded ${result.success} personnel, ${result.failed} failed`,
      ...result,
    };
  }

  @Post('projects')
  @Roles(UserRole.ADMIN, UserRole.HR_FINANCE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProjects(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const data = this.parseExcel(file.buffer);
    const result = await this.uploadService.uploadProjects(data as ProjectCsvRow[]);
    return {
      message: `Uploaded ${result.success} projects, ${result.failed} failed`,
      ...result,
    };
  }

  @Post('project-personnel')
  @Roles(UserRole.ADMIN, UserRole.HR_FINANCE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProjectPersonnel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const data = this.parseExcel(file.buffer);
    const result = await this.uploadService.uploadProjectPersonnel(data as ProjectPersonnelCsvRow[]);
    return {
      message: `Uploaded ${result.success} participations, ${result.failed} failed`,
      ...result,
    };
  }

  @Post('users')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const data = this.parseExcel(file.buffer);
    const result = await this.uploadService.uploadUsers(data as UserCsvRow[]);
    return {
      message: `Uploaded ${result.success} users, ${result.failed} failed`,
      ...result,
    };
  }
}
