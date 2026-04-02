import { IsString, IsNotEmpty, IsNumber, Min, Max, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectPersonnelRole } from '../project-personnel-role.enum';

export class UpdateProjectPersonnelDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  personnelId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  participationRate?: number;

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  endDate?: string;

  @IsEnum(['MONTHLY', 'DAILY', 'HOURLY'])
  @IsOptional()
  calculationMethod?: string;

  @IsString()
  @IsOptional()
  expenseCode?: string;

  @IsString()
  @IsOptional()
  legalBasisCode?: string;

  @IsString()
  @IsOptional()
  participatingTeam?: string;

  @IsEnum(ProjectPersonnelRole)
  @IsOptional()
  role?: ProjectPersonnelRole;

  @IsString()
  @IsOptional()
  notes?: string;
}