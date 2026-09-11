import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GenerateQuestionsDto {
  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;

  /** Free-text steer for the recruiter, e.g. "focus more on system design". */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalContext?: string;
}
