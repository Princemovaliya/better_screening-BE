import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { UserRole } from '@module/users';
import { AuthService } from './auth.service';
import { CurrentOrgUser, Roles } from './decorators';
import {
  AcceptInviteDto,
  ForgotPasswordDto,
  InviteUserDto,
  LoginDto,
  ResetPasswordDto,
  SignupDto,
} from './dto';
import { OrgAuthGuard, RolesGuard } from './guards';
import { AuthenticatedOrgUser } from './types/jwt-payload.type';

@ApiTags('Auth')
@UseInterceptors(TransformInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('invite')
  @ApiBearerAuth()
  @UseGuards(OrgAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  invite(@CurrentOrgUser() user: AuthenticatedOrgUser, @Body() dto: InviteUserDto) {
    return this.authService.invite(user.organizationId, dto);
  }

  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }
}
