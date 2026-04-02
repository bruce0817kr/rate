import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePersonnelDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  ssn: string; // Will be encrypted before saving

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  team: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsString()
  @IsNotEmpty()
  salaryBand: string; // e.g., "3000-4000"

  @IsEnum(['FULL_TIME', 'CONTRACT', 'PART_TIME', 'DISPATCHED'])
  employmentType: string;

  @IsDateString()
  hireDate: string;

  @IsDateString()
  @IsOptional()
  terminationDate?: string;

  @IsOptional()
  @IsNotEmpty()
  isActive?: boolean;

  @IsOptional()
  salaryValidity?: {
    startDate: string;
    endDate: string | null;
  };
}