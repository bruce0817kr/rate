import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSalaryBandDto {
  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  averageAnnualSalary?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
