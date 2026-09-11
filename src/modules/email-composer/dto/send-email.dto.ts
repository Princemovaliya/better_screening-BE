import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';
import { EmailType } from '../entities';

/** The recruiter has edited the composed draft (or written their own) — this is what
 * actually gets sent and logged. */
export class SendEmailDto {
  @ApiProperty({ enum: EmailType })
  @IsEnum(EmailType)
  type!: EmailType;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  subject!: string;

  @ApiProperty()
  @IsString()
  body!: string;
}
