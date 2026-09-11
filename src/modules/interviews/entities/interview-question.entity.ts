import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '@core/database';
import { QuestionType } from '@module/jobs/entities';
import { Interview } from './interview.entity';

@Entity('interview_questions')
export class InterviewQuestion extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  interviewId!: string;

  @ManyToOne(() => Interview, (interview) => interview.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewId' })
  interview?: Interview;

  @Column({ type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ type: 'text' })
  questionText!: string;

  @Column({ type: 'enum', enum: QuestionType, default: QuestionType.TECHNICAL })
  questionType!: QuestionType;
}
