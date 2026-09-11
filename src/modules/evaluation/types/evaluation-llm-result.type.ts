import { CompetencyScores } from '../entities/interview-summary.entity';

/** The exact JSON shape we ask the LLM to return — validated in full before anything
 * is persisted (see `EvaluationService.validate`). */
export interface EvaluationLlmResult {
  overallScore: number; // 0-100
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  strengths: string[];
  weaknesses: string[];
  observations: string;
  communicationNote: string;
  competencyScores: CompetencyScores;
  perQuestion: { questionId: string; score: number; feedback: string }[];
}
