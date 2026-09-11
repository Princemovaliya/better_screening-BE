import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { CurrentOrgUser, Roles } from '@module/auth/decorators';
import { OrgAuthGuard, RolesGuard } from '@module/auth/guards';
import { AuthenticatedOrgUser } from '@module/auth/types/jwt-payload.type';
import { UpdateUserRoleDto } from './dto';
import { UserRole } from './entities';
import { toPublicUser, UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@CurrentOrgUser() user: AuthenticatedOrgUser) {
    const users = await this.usersService.findAllInOrg(user.organizationId);
    return users.map(toPublicUser);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateRole(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(user.organizationId, id, dto.role);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    await this.usersService.remove(user.organizationId, user.uid, id);
    return { ok: true };
  }
}
