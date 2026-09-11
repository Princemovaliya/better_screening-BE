import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { InterviewRoundType } from '../entities';
import { RoundQuestionDto } from './round-question.dto';

export class RoundTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: InterviewRoundType })
  @IsOptional()
  @IsEnum(InterviewRoundType)
  type?: InterviewRoundType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  defaultInterviewerUserId?: string;

  @ApiPropertyOptional({ type: [RoundQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundQuestionDto)
  questions?: RoundQuestionDto[];
}
