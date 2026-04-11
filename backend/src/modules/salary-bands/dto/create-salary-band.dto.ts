import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateSalaryBandDto {
  @IsString()
  @IsNotEmpty()
  position: string;

  @IsInt()
  @Min(0)
  averageAnnualSalary: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
