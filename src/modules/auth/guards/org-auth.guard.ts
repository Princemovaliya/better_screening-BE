import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Standard passport-jwt guard for all org-user (recruiter/admin) routes.
 * Usable from any module without importing AuthModule — see JwtCoreModule/JwtStrategy
 * for why (passport strategy registration is process-global, not module-scoped).
 */
@Injectable()
export class OrgAuthGuard extends AuthGuard('jwt') {}
