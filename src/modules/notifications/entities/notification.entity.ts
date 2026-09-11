import { Column, Entity, Index } from 'typeorm';
import { OrgScopedEntity } from '@core/database';

export enum NotificationType {
  EVALUATION_READY = 'evaluation_ready',
  GENERAL = 'general',
}

/** One row per (recipient user, event) — a user-scoped inbox, not a broadcast. Read
 * via polling (`GET /notifications`), per the plan's v1 real-time strategy. */
@Entity('notifications')
export class Notification extends OrgScopedEntity {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.GENERAL })
  type!: NotificationType;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  /** Frontend route to deep-link to, e.g. `/app/interviews/:id`. */
  @Column({ type: 'varchar', nullable: true })
  link?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt?: Date | null;
}
