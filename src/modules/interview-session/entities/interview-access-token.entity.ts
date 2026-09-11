import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '@core/database';

export enum AccessTokenStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  USED = 'used',
}

/**
 * Candidate portal auth — NOT a JWT. An opaque random token is emailed to the
 * candidate; only its SHA-256 hash is ever stored (see @core/utils/crypt.util).
 * `createdAt` (from AppBaseEntity) doubles as "issuedAt".
 */
@Entity('interview_access_tokens')
export class InterviewAccessToken extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  interviewId!: string;

  @Column({ type: 'uuid' })
  candidateId!: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId!: string;

  @Index({ unique: true })
  @Column()
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt?: Date | null;

  @Column({ type: 'enum', enum: AccessTokenStatus, default: AccessTokenStatus.ACTIVE })
  status!: AccessTokenStatus;
}
