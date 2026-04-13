import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, Min, Max, IsDateString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ProjectPersonnelRole } from '../project-personnel-role.enum';
import { ProjectPersonnelSegmentDto } from './project-personnel-segment.dto';

export class CreateProjectPersonnelDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  personnelId: string;

  @IsNumber()
  @IsOptional()
  fiscalYear?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  participationRate: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['MONTHLY', 'DAILY', 'HOURLY'])
  calculationMethod: string;

  @IsString()
  @IsNotEmpty()
  expenseCode: string;

  @IsString()
  @IsNotEmpty()
  legalBasisCode: string;

  @IsString()
  @IsNotEmpty()
  participatingTeam: string;

  @IsEnum(ProjectPersonnelRole)
  @IsOptional()
  role?: ProjectPersonnelRole;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  actualAnnualSalaryOverride?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(60)
  participationMonths?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  personnelCostOverride?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectPersonnelSegmentDto)
  segments?: ProjectPersonnelSegmentDto[];
}
