import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { CurrentOrgUser } from '@module/auth/decorators';
import { OrgAuthGuard } from '@module/auth/guards';
import { AuthenticatedOrgUser } from '@module/auth/types/jwt-payload.type';
import { ComposeEmailDto, SendEmailDto } from './dto';
import { EmailComposerService } from './email-composer.service';

@ApiTags('Candidate emails')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('candidates/:candidateId/emails')
export class EmailComposerController {
  constructor(private readonly emailComposerService: EmailComposerService) {}

  @Post('compose')
  compose(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: ComposeEmailDto,
  ) {
    return this.emailComposerService.compose(user.organizationId, candidateId, dto);
  }

  @Post('send')
  send(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: SendEmailDto,
  ) {
    return this.emailComposerService.send(user.organizationId, candidateId, user.uid, dto);
  }

  @Get()
  list(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('candidateId') candidateId: string) {
    return this.emailComposerService.list(user.organizationId, candidateId);
  }
}
