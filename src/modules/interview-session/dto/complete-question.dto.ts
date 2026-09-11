import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CompleteQuestionDto {
  @ApiProperty({ description: 'The storageKey returned by the upload-url endpoint' })
  @IsString()
  storageKey!: string;

  @ApiProperty()
  @IsString()
  mimeType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}
