import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { OrgScopedEntity } from '@core/database';
import { User } from '@module/users/entities';

export enum EmailType {
  INVITATION = 'invitation',
  REMINDER = 'reminder',
  PASSED = 'passed',
  REJECTED = 'rejected',
  OFFER = 'offer',
  FOLLOWUP = 'followup',
}

/** Sent-email log — one row per email actually sent to a candidate through the
 * composer (not the automatic interview-invitation email, which InterviewsService
 * sends directly). */
@Entity('candidate_emails')
export class CandidateEmail extends OrgScopedEntity {
  @Index()
  @Column({ type: 'uuid' })
  candidateId!: string;

  @Column({ type: 'enum', enum: EmailType })
  type!: EmailType;

  @Column()
  subject!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'uuid', nullable: true })
  sentByUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sentByUserId' })
  sentBy?: User | null;

  @Column({ type: 'timestamptz' })
  sentAt!: Date;
}
