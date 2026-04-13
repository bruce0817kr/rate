import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateSalaryBandDto {
  @IsString()
  @IsNotEmpty()
  position: string;

  @IsOptional()
  @IsInt()
  fiscalYear?: number;

  @IsInt()
  @Min(0)
  averageAnnualSalary: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
