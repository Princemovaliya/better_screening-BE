import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '@core/database';
import { Candidate } from './candidate.entity';

@Entity('candidate_skills')
export class CandidateSkill extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  candidateId!: string;

  @ManyToOne(() => Candidate, (candidate) => candidate.skills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate?: Candidate;

  @Column()
  name!: string;
}
