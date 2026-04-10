import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ProjectPersonnelSegmentDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  participationRate: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  personnelCostOverride?: number | null;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
