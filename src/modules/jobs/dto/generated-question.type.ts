import { QuestionType } from '../entities';

/** A suggestion only — not persisted. The recruiter edits/reorders/drops these before
 * saving them onto the round via the normal job update endpoint. */
export interface GeneratedQuestion {
  questionText: string;
  questionType: QuestionType;
}
