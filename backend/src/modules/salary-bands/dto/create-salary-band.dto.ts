import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateSalaryBandDto {
  @IsString()
  @IsNotEmpty()
  position: string;

  @IsInt()
  @Min(0)
  minAmount: number;

  @IsInt()
  @Min(0)
  maxAmount: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

