import { Column, Entity } from 'typeorm';
import { OrgScopedEntity } from '@core/database';

export enum ActivityType {
  JOB_CREATED = 'job_created',
  CANDIDATE_CREATED = 'candidate_created',
  CANDIDATE_STAGE_CHANGED = 'candidate_stage_changed',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  EVALUATION_COMPLETED = 'evaluation_completed',
}

/** Append-only feed of notable events across the org — written internally by feature
 * services, read via the dashboard's recent-activity list. Deliberately just a
 * human-readable `message` rather than a structured payload per type: the feed is
 * display-only in v1, nothing re-derives state from it. */
@Entity('activity_logs')
export class ActivityLog extends OrgScopedEntity {
  @Column({ type: 'enum', enum: ActivityType })
  type!: ActivityType;

  @Column()
  message!: string;

  @Column({ type: 'uuid', nullable: true })
  actorUserId?: string | null;
}
