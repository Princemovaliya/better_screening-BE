import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { OrgScopedEntity } from '@core/database';
import { Job } from '@module/jobs/entities';
import { CandidateNote } from './candidate-note.entity';
import { CandidateSkill } from './candidate-skill.entity';

export enum CandidateStage {
  APPLIED = 'applied',
  SCREENING = 'screening',
  INTERVIEW = 'interview',
  HR_REVIEW = 'hr_review',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

/** Ordering used to enforce "only move forward" stage transitions (REJECTED is a
 * terminal side-branch, not part of the forward sequence). */
export const CANDIDATE_STAGE_RANK: Record<CandidateStage, number> = {
  [CandidateStage.APPLIED]: 0,
  [CandidateStage.SCREENING]: 1,
  [CandidateStage.INTERVIEW]: 2,
  [CandidateStage.HR_REVIEW]: 3,
  [CandidateStage.OFFER]: 4,
  [CandidateStage.HIRED]: 5,
  [CandidateStage.REJECTED]: 99,
};

@Entity('candidates')
export class Candidate extends OrgScopedEntity {
  @Index()
  @Column({ type: 'uuid' })
  jobId!: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job?: Job;

  @Column()
  name!: string;

  @Index()
  @Column()
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string | null;

  @Column({ type: 'int', nullable: true })
  experienceYears?: number | null;

  @Column({ type: 'varchar', nullable: true })
  currentCompany?: string | null;

  @Column({ type: 'varchar', nullable: true })
  location?: string | null;

  @Index()
  @Column({ type: 'enum', enum: CandidateStage, default: CandidateStage.APPLIED })
  stage!: CandidateStage;

  @Column({ type: 'numeric', nullable: true })
  overallScore?: number | null;

  @Column({ type: 'varchar', nullable: true })
  resumePath?: string | null;

  @Column({ type: 'text', nullable: true })
  resumeText?: string | null;

  @Column({ type: 'text', nullable: true })
  resumeSummary?: string | null;

  @Column({ type: 'varchar', nullable: true })
  education?: string | null;

  @Column({ type: 'varchar', nullable: true })
  rejectReason?: string | null;

  @OneToMany(() => CandidateSkill, (skill) => skill.candidate, { cascade: true })
  skills?: CandidateSkill[];

  @OneToMany(() => CandidateNote, (note) => note.candidate)
  notes?: CandidateNote[];
}
