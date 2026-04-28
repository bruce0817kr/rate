import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService, PersonnelCsvRow, ProjectCsvRow, ProjectPersonnelCsvRow, UserCsvRow, TeamCsvRow } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_UPLOAD_EXTENSIONS = ['csv', 'xlsx', 'xls'];
const uploadInterceptor = FileInterceptor('file', {
  limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !SUPPORTED_UPLOAD_EXTENSIONS.includes(extension)) {
      callback(new BadRequestException('Only CSV and Excel files are supported'), false);
      return;
    }
    callback(null, true);
  },
});

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  private assertSupportedFile(file: Express.Multer.File): void {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !SUPPORTED_UPLOAD_EXTENSIONS.includes(extension)) {
      throw new BadRequestException('Only CSV and Excel files are supported');
    }

    if (file.size === 0 || file.buffer.length === 0) {
      throw new BadRequestException('File must not be empty');
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES || file.buffer.length > MAX_UPLOAD_FILE_SIZE_BYTES) {
      throw new BadRequestException('File size cannot exceed 10MB');
    }
  }

  private async parseExcel(file: Express.Multer.File): Promise<any[]> {
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(file.buffer);
      const csvText = utf8Text.includes('\ufffd')
        ? new TextDecoder('euc-kr', { fatal: false }).decode(file.buffer)
        : utf8Text;
      return await new Promise<any[]>((resolve, reject) => {
        const rows: any[] = [];
        Readable.from([csvText])
          .pipe(csvParser())
          .on('data', (row) => rows.push(row))
          .on('end', () => resolve(rows))
          .on('error', reject);
      });
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer', raw: false, cellDates: false });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
  }

  @Post('personnel')
  @Roles(UserRole.ADMIN, UserRole.STRATEGY_PLANNING, UserRole.HR_GENERAL_AFFAIRS)
  @UseInterceptors(uploadInterceptor)
  async uploadPersonnel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    this.assertSupportedFile(file);

    const data = await this.parseExcel(file);
    const result = await this.uploadService.uploadPersonnel(data as PersonnelCsvRow[]);
    return {
      message: `Uploaded ${result.success} personnel, ${result.failed} failed`,
      ...result,
    };
  }

  @Post('projects')
  @Roles(UserRole.ADMIN, UserRole.STRATEGY_PLANNING, UserRole.HR_GENERAL_AFFAIRS)
  @UseInterceptors(uploadInterceptor)
  async uploadProjects(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    this.assertSupportedFile(file);

    const data = await this.parseExcel(file);
    const result = await this.uploadService.uploadProjects(data as ProjectCsvRow[]);
    return {
      message: `Uploaded ${result.success} projects, ${result.failed} failed`,
      ...result,
    };
  }

  @Post('project-personnel')
  @Roles(UserRole.ADMIN, UserRole.STRATEGY_PLANNING, UserRole.HR_GENERAL_AFFAIRS)
  @UseInterceptors(uploadInterceptor)
  async uploadProjectPersonnel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    this.assertSupportedFile(file);

    const data = await this.parseExcel(file);
    const result = await this.uploadService.uploadProjectPersonnel(data as ProjectPersonnelCsvRow[]);
    return {
      message: `Uploaded ${result.success} participations, ${result.failed} failed`,
      ...result,
    };
  }

  @Post('users')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(uploadInterceptor)
  async uploadUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    this.assertSupportedFile(file);

    const data = await this.parseExcel(file);
    const result = await this.uploadService.uploadUsers(data as UserCsvRow[]);
    return {
      message: `Uploaded ${result.success} users, ${result.failed} failed`,
      ...result,
    };
  }

  @Post('teams')
  @Roles(UserRole.ADMIN, UserRole.STRATEGY_PLANNING, UserRole.HR_GENERAL_AFFAIRS)
  @UseInterceptors(uploadInterceptor)
  async uploadTeams(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    this.assertSupportedFile(file);

    const data = await this.parseExcel(file);
    const result = await this.uploadService.uploadTeams(data as TeamCsvRow[]);
    return {
      message: `Uploaded ${result.success} teams, ${result.failed} failed`,
      ...result,
    };
  }
}
