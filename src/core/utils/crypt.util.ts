import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Random URL-safe token, e.g. for invite/reset links and candidate access tokens. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** One-way hash of an opaque token before storing it (e.g. candidate interview access
 * tokens) — the raw token is only ever known to the recipient of the email link. */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
