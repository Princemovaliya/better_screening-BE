import { Body, Controller, Get, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { CurrentOrgUser, Roles } from '@module/auth/decorators';
import { OrgAuthGuard, RolesGuard } from '@module/auth/guards';
import { AuthenticatedOrgUser } from '@module/auth/types/jwt-payload.type';
import { UserRole } from '@module/users';
import { UpdateOrganizationDto, UpdateOrganizationSettingsDto } from './dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  getMine(@CurrentOrgUser() user: AuthenticatedOrgUser) {
    return this.organizationsService.findById(user.organizationId);
  }

  @Patch('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateMine(@CurrentOrgUser() user: AuthenticatedOrgUser, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(user.organizationId, dto);
  }

  @Get('me/settings')
  getMySettings(@CurrentOrgUser() user: AuthenticatedOrgUser) {
    return this.organizationsService.getSettings(user.organizationId);
  }

  @Patch('me/settings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateMySettings(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.organizationsService.updateSettings(user.organizationId, dto);
  }
}
