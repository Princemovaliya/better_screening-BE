import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { CurrentOrgUser } from '@module/auth/decorators';
import { OrgAuthGuard } from '@module/auth/guards';
import { AuthenticatedOrgUser } from '@module/auth/types/jwt-payload.type';
import { ListInterviewsQueryDto, RescheduleInterviewDto, ScheduleInterviewDto } from './dto';
import { InterviewsService } from './interviews.service';

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  schedule(@CurrentOrgUser() user: AuthenticatedOrgUser, @Body() dto: ScheduleInterviewDto) {
    return this.interviewsService.schedule(user.organizationId, user.uid, dto);
  }

  @Get()
  findAll(@CurrentOrgUser() user: AuthenticatedOrgUser, @Query() query: ListInterviewsQueryDto) {
    return this.interviewsService.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    return this.interviewsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  reschedule(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Param('id') id: string,
    @Body() dto: RescheduleInterviewDto,
  ) {
    return this.interviewsService.reschedule(user.organizationId, id, dto);
  }

  @Post(':id/send-invitation')
  sendInvitation(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    return this.interviewsService.sendInvitation(user.organizationId, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    return this.interviewsService.cancel(user.organizationId, id);
  }

  @Post(':id/retry-evaluation')
  retryEvaluation(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    return this.interviewsService.retryEvaluation(user.organizationId, id);
  }
}
