import { UserRole } from '@module/users';

export interface JwtPayload {
  /** subject — the user's id */
  sub: string;
  organizationId: string;
  role: UserRole;
}

/** What guards attach to `request.user` after verifying the JWT. */
export interface AuthenticatedOrgUser {
  uid: string;
  organizationId: string;
  role: UserRole;
}
