import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedOrgUser } from '../types/jwt-payload.type';

export const CurrentOrgUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedOrgUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedOrgUser }>();
    return request.user;
  },
);
