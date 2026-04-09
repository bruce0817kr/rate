import { IsString, IsNotEmpty, IsNumber, Min, Max, IsDateString, IsOptional, IsEnum } from 'class-validator';
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
  startDate?: string;

  @IsDateString()
  @IsOptional()
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

  @IsNumber()
  @IsOptional()
  @Min(0)
  annualSalary?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(60)
  participationMonths?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  personnelCostOverride?: number;
}
