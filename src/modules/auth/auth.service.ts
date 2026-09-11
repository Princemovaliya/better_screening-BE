import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getEnv } from '@config/env';
import { MailService } from '@core/mail';
import { comparePassword, hashPassword, hashToken, randomToken } from '@core/utils/crypt.util';
import { OrganizationsService } from '@module/organizations/organizations.service';
import { PublicUser, toPublicUser, UsersService } from '@module/users';
import { User, UserRole, UserStatus } from '@module/users/entities';
import {
  AcceptInviteDto,
  ForgotPasswordDto,
  InviteUserDto,
  LoginDto,
  ResetPasswordDto,
  SignupDto,
} from './dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AuthService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private signToken(user: Pick<User, 'id' | 'organizationId' | 'role'>): string {
    return this.jwtService.sign({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });
  }

  async signup(
    dto: SignupDto,
  ): Promise<{ message: string; data: { token: string; user: PublicUser } }> {
    const org = await this.organizationsService.createWithDefaults(dto.organizationName);

    const existing = await this.usersService.findByEmailInOrg(org.id, dto.email);
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await hashPassword(dto.password);
    const user = await this.usersService.create({
      organizationId: org.id,
      email: dto.email,
      name: dto.fullName,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    const token = this.signToken(user);
    return {
      message: 'Account created',
      data: { token, user: toPublicUser(user) },
    };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ message: string; data: { token: string; user: PublicUser } }> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is not active. Contact your admin.');
    }

    await this.usersService.update(user.organizationId, user.id, { lastLoginAt: new Date() });

    const token = this.signToken(user);
    return { message: 'Signed in', data: { token, user: toPublicUser(user) } };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    // Always respond the same way whether or not the email exists, to avoid leaking
    // which addresses have accounts.
    if (user) {
      const rawToken = randomToken();
      await this.usersService.update(user.organizationId, user.id, {
        resetTokenHash: hashToken(rawToken),
        resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
      const resetLink = `${getEnv('FRONTEND_URL')}/reset-password?token=${rawToken}`;
      await this.mailService.sendMail({
        to: user.email,
        subject: 'Reset your Better Screening password',
        html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      });
    }
    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = hashToken(dto.token);
    const user = await this.usersService.findByResetTokenHash(tokenHash);
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.usersService.update(user.organizationId, user.id, {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
    return { message: 'Password updated — you can now sign in' };
  }

  async invite(
    organizationId: string,
    dto: InviteUserDto,
  ): Promise<{ message: string; data: PublicUser }> {
    const existing = await this.usersService.findByEmailInOrg(organizationId, dto.email);
    if (existing) throw new ConflictException('This person is already a member of your team');

    const rawToken = randomToken();
    const user = await this.usersService.create({
      organizationId,
      email: dto.email,
      name: dto.email,
      role: dto.role,
      status: UserStatus.INVITED,
      inviteTokenHash: hashToken(rawToken),
      inviteTokenExpiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
    });

    const inviteLink = `${getEnv('FRONTEND_URL')}/accept-invite?token=${rawToken}`;
    const org = await this.organizationsService.findById(organizationId);
    await this.mailService.sendMail({
      to: dto.email,
      subject: `You've been invited to join ${org.name} on Better Screening`,
      html: `<p>You've been invited to join <b>${org.name}</b>. Click the link below to set up your account. This link expires in 7 days.</p><p><a href="${inviteLink}">${inviteLink}</a></p>`,
    });

    return { message: 'Invitation sent', data: toPublicUser(user) };
  }

  async acceptInvite(
    dto: AcceptInviteDto,
  ): Promise<{ message: string; data: { token: string; user: PublicUser } }> {
    const tokenHash = hashToken(dto.token);
    const user = await this.usersService.findByInviteTokenHash(tokenHash);
    if (!user || !user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
      throw new BadRequestException('This invitation is invalid or has expired');
    }

    const passwordHash = await hashPassword(dto.password);
    const updated = await this.usersService.update(user.organizationId, user.id, {
      name: dto.fullName,
      passwordHash,
      status: UserStatus.ACTIVE,
      inviteTokenHash: null,
      inviteTokenExpiresAt: null,
    });

    const token = this.signToken(updated);
    return { message: 'Welcome aboard', data: { token, user: toPublicUser(updated) } };
  }
}
