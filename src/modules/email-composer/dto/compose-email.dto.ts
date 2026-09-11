import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { EmailType } from '../entities';

export class ComposeEmailDto {
  @ApiProperty({ enum: EmailType })
  @IsEnum(EmailType)
  type!: EmailType;

  @ApiPropertyOptional({ description: 'Ties the draft to a specific interview round for context' })
  @IsOptional()
  @IsUUID()
  interviewId?: string;

  @ApiPropertyOptional({ description: 'Free-text steer, e.g. "keep it under 3 sentences"' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalContext?: string;
}
