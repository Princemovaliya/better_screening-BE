import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ScheduleInterviewDto {
  @ApiProperty()
  @IsUUID()
  candidateId!: string;

  @ApiProperty({ description: "Index into the candidate's job round templates" })
  @IsInt()
  @Min(0)
  roundIndex!: number;

  @ApiProperty()
  @IsISO8601()
  scheduledAt!: string;

  @ApiPropertyOptional({ description: 'Defaults to the round template duration' })
  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Defaults to the round template default interviewer' })
  @IsOptional()
  @IsUUID()
  interviewerUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}
