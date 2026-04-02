import { IsString, IsNotEmpty, IsNumber, Min, Max, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectPersonnelRole } from '../project-personnel-role.enum';

export class CreateProjectPersonnelDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  personnelId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  participationRate: number;

  @IsDateString()
  @Type(() => Date)
  startDate: string;

  @IsDateString()
  @Type(() => Date)
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
}