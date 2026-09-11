import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CandidateStage } from '../entities';

export class UpdateStageDto {
  @ApiProperty({ enum: CandidateStage })
  @IsEnum(CandidateStage)
  stage!: CandidateStage;

  @ApiPropertyOptional({ description: 'Required when stage is "rejected"' })
  @IsOptional()
  @IsString()
  rejectReason?: string;
}
