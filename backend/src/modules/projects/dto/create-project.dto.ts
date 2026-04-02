import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['NATIONAL_RD', 'LOCAL_SUBSIDY', 'MIXED'])
  projectType: string;

  @IsString()
  @IsNotEmpty()
  managingDepartment: string;

  @IsDateString()
  @Type(() => Date)
  startDate: string;

  @IsDateString()
  @Type(() => Date)
  endDate: string;

  @IsNumber()
  @Min(0)
  totalBudget: number;

  @IsNumber()
  @Min(0)
  personnelBudget: number;

  @IsOptional()
  @IsEnum(['PLANNING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'AUDITING'])
  status?: string;

  @IsOptional()
  legalBasis?: Record<string, any>;

  @IsOptional()
  internalRules?: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  managingTeam: string;

  @IsArray()
  @IsString({ each: true })
  participatingTeams: string[];
}