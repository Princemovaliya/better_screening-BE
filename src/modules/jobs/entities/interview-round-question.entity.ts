import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '@core/database';
import { InterviewRoundTemplate } from './interview-round-template.entity';

export enum QuestionType {
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  SITUATIONAL = 'situational',
  EXPERIENCE = 'experience',
  CULTURE = 'culture',
}

@Entity('interview_round_questions')
export class InterviewRoundQuestion extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  roundTemplateId!: string;

  @ManyToOne(() => InterviewRoundTemplate, (round) => round.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roundTemplateId' })
  roundTemplate?: InterviewRoundTemplate;

  @Column({ type: 'text' })
  questionText!: string;

  @Column({ type: 'enum', enum: QuestionType, default: QuestionType.TECHNICAL })
  questionType!: QuestionType;

  @Column({ type: 'int', default: 0 })
  orderIndex!: number;
}
