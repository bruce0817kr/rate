import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSalaryBandDto {
  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

