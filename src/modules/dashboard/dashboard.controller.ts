import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { CurrentOrgUser } from '@module/auth/decorators';
import { OrgAuthGuard } from '@module/auth/guards';
import { AuthenticatedOrgUser } from '@module/auth/types/jwt-payload.type';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getOverview(@CurrentOrgUser() user: AuthenticatedOrgUser) {
    return this.dashboardService.getOverview(user.organizationId);
  }
}
