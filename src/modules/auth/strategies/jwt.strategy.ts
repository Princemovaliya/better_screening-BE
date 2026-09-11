import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getEnv } from '@config/env';
import { AuthenticatedOrgUser, JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getEnv('JWT_SECRET'),
    });
  }

  // Whatever this returns becomes `request.user`.
  validate(payload: JwtPayload): AuthenticatedOrgUser {
    return { uid: payload.sub, organizationId: payload.organizationId, role: payload.role };
  }
}
