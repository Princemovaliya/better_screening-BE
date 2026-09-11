import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { CurrentOrgUser } from '@module/auth/decorators';
import { OrgAuthGuard } from '@module/auth/guards';
import { AuthenticatedOrgUser } from '@module/auth/types/jwt-payload.type';
import { ActivityService } from './activity.service';

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  list(@CurrentOrgUser() user: AuthenticatedOrgUser, @Query('limit') limit?: string) {
    return this.activityService.listRecent(user.organizationId, limit ? Number(limit) : 20);
  }
}
