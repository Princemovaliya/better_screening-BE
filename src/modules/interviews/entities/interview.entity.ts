import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { OrgScopedEntity } from '@core/database';
import { Candidate } from '@module/candidates/entities';
import { InterviewRoundType } from '@module/jobs/entities';
import { Job } from '@module/jobs/entities';
import { User } from '@module/users/entities';
import { InterviewQuestion } from './interview-question.entity';

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  INVITATION_SENT = 'invitation_sent',
  IN_PROGRESS = 'in_progress',
  PENDING_EVALUATION = 'pending_evaluation',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('interviews')
@Unique(['candidateId', 'roundIndex'])
export class Interview extends OrgScopedEntity {
  @Index()
  @Column({ type: 'uuid' })
  candidateId!: string;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate?: Candidate;

  @Index()
  @Column({ type: 'uuid' })
  jobId!: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job?: Job;

  @Column({ type: 'uuid', nullable: true })
  roundTemplateId?: string | null;

  @Column({ type: 'int' })
  roundIndex!: number;

  /** Snapshot of the round template's name at schedule time — later edits to the
   * template shouldn't rewrite history for interviews already scheduled against it. */
  @Column()
  roundName!: string;

  @Column({ type: 'enum', enum: InterviewRoundType })
  type!: InterviewRoundType;

  @Column({ type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({ type: 'int' })
  durationMinutes!: number;

  @Column({ type: 'uuid', nullable: true })
  interviewerUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'interviewerUserId' })
  interviewer?: User | null;

  @Column({ default: 'Asia/Kolkata (IST)' })
  timezone!: string;

  @Index()
  @Column({ type: 'enum', enum: InterviewStatus, default: InterviewStatus.SCHEDULED })
  status!: InterviewStatus;

  @Column({ type: 'numeric', nullable: true })
  overallScore?: number | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy?: User | null;

  /** Set when the candidate opens the interview room and starts question 1 — the
   * assessment deadline is startedAt + durationMinutes. Populated in a later phase
   * once the candidate portal exists. */
  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  autoSubmittedAt?: Date | null;

  @OneToMany(() => InterviewQuestion, (q) => q.interview, { cascade: true })
  questions?: InterviewQuestion[];
}
