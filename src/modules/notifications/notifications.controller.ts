import {
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
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentOrgUser() user: AuthenticatedOrgUser, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.listForUser(
      user.organizationId,
      user.uid,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  async unreadCount(@CurrentOrgUser() user: AuthenticatedOrgUser) {
    return { count: await this.notificationsService.unreadCount(user.organizationId, user.uid) };
  }

  @Patch(':id/read')
  async markRead(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    await this.notificationsService.markRead(user.organizationId, user.uid, id);
    return { ok: true };
  }

  @Post('read-all')
  async markAllRead(@CurrentOrgUser() user: AuthenticatedOrgUser) {
    await this.notificationsService.markAllRead(user.organizationId, user.uid);
    return { ok: true };
  }
}
