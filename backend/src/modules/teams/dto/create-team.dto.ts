import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
