import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  managerName?: string;

  @IsOptional()
  @IsString()
  managerEmail?: string;

  @IsOptional()
  @IsString()
  managerPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  plannedHeadcount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
