import { Column, Entity, Index, Unique } from 'typeorm';
import { AppBaseEntity } from '@core/database';

export enum InterviewAnswerStatus {
  UPLOADED = 'uploaded',
  TRANSCRIBED = 'transcribed',
  SCORED = 'scored',
}

/** One row per question — the candidate's raw recording. `status` beyond UPLOADED
 * (TRANSCRIBED/SCORED) is set by later phases' AI pipeline, not this module. */
@Entity('interview_answers')
@Unique(['interviewId', 'interviewQuestionId'])
export class InterviewAnswer extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  interviewId!: string;

  @Column({ type: 'uuid' })
  interviewQuestionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column()
  recordingStoragePath!: string;

  @Column()
  recordingMimeType!: string;

  @Column({ type: 'int', nullable: true })
  recordingDurationSeconds?: number | null;

  @Column({ type: 'int', nullable: true })
  recordingSizeBytes?: number | null;

  @Column({ type: 'enum', enum: InterviewAnswerStatus, default: InterviewAnswerStatus.UPLOADED })
  status!: InterviewAnswerStatus;
}
