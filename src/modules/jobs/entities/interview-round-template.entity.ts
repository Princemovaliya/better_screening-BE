import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AppBaseEntity } from '@core/database';
import { User } from '@module/users/entities';
import { InterviewRoundQuestion } from './interview-round-question.entity';
import { Job } from './job.entity';

export enum InterviewRoundType {
  AI_INTERVIEW = 'ai_interview',
  TECHNICAL = 'technical',
  HR = 'hr',
}

@Entity('interview_round_templates')
export class InterviewRoundTemplate extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  jobId!: string;

  @ManyToOne(() => Job, (job) => job.rounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job?: Job;

  @Index()
  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: InterviewRoundType, default: InterviewRoundType.TECHNICAL })
  type!: InterviewRoundType;

  @Column({ type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ type: 'int', default: 30 })
  durationMinutes!: number;

  @Column({ type: 'uuid', nullable: true })
  defaultInterviewerUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'defaultInterviewerUserId' })
  defaultInterviewer?: User | null;

  @OneToMany(() => InterviewRoundQuestion, (q) => q.roundTemplate, { cascade: true })
  questions?: InterviewRoundQuestion[];
}
