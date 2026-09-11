import { Column, Entity, Index } from 'typeorm';
import { OrgScopedEntity } from '@core/database';

/** One row per interview — the persisted result of the STT vendor's `transcript-ready`
 * job. `perQuestion` is a jsonb array rather than a child table since it's always read
 * and written as a whole alongside `combinedText`, never queried per-row. */
@Entity('interview_transcripts')
export class InterviewTranscript extends OrgScopedEntity {
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  interviewId!: string;

  @Column({ type: 'text' })
  combinedText!: string;

  @Column({ type: 'jsonb' })
  perQuestion!: { questionId: string; transcriptText: string }[];

  @Column({ type: 'varchar', nullable: true })
  language?: string | null;

  /** Set instead of a transcript when the vendor reports `status: 'FAILED'` — kept so
   * the row is still created idempotently and the failure is visible for triage. */
  @Column({ type: 'text', nullable: true })
  failureReason?: string | null;
}
