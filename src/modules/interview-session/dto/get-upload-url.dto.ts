import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class GetUploadUrlDto {
  @ApiProperty({ example: 'video/webm' })
  @IsString()
  @Matches(/^(video|audio)\//, { message: 'mimeType must be a video/* or audio/* type' })
  mimeType!: string;
}
