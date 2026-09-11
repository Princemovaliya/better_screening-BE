import { Column, Entity, Index } from 'typeorm';
import { OrgScopedEntity } from '@core/database';

export enum EvaluationRecommendation {
  STRONG_HIRE = 'strong_hire',
  HIRE = 'hire',
  NO_HIRE = 'no_hire',
  STRONG_NO_HIRE = 'strong_no_hire',
}

/** The 5 fixed competency dimensions every evaluation scores (0-100 each) — mirrors
 * the prototype's evaluation view. */
export interface CompetencyScores {
  technicalSkills: number;
  problemSolving: number;
  communication: number;
  culturalFit: number;
  experienceRelevance: number;
}

/** One row per interview — the persisted result of our own `EvaluationModule`
 * running the resume × job description × transcript analysis. Never written by the
 * STT vendor; this is entirely our backend's LLM call. */
@Entity('interview_summaries')
export class InterviewSummary extends OrgScopedEntity {
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  interviewId!: string;

  @Column({ type: 'numeric' })
  overallScore!: number;

  @Column({ type: 'enum', enum: EvaluationRecommendation })
  recommendation!: EvaluationRecommendation;

  @Column({ type: 'jsonb' })
  strengths!: string[];

  @Column({ type: 'jsonb' })
  weaknesses!: string[];

  @Column({ type: 'text' })
  observations!: string;

  @Column({ type: 'text' })
  communicationNote!: string;

  @Column({ type: 'jsonb' })
  competencyScores!: CompetencyScores;

  /** The LLM's full structured response, kept verbatim for audit/debugging —
   * separate from the normalized columns above. */
  @Column({ type: 'jsonb' })
  rawLlmResponse!: unknown;
}
