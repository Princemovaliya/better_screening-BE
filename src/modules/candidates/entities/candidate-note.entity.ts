import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { OrgScopedEntity } from '@core/database';
import { User } from '@module/users/entities';
import { Candidate } from './candidate.entity';

@Entity('candidate_notes')
export class CandidateNote extends OrgScopedEntity {
  @Index()
  @Column({ type: 'uuid' })
  candidateId!: string;

  @ManyToOne(() => Candidate, (candidate) => candidate.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate?: Candidate;

  @Column({ type: 'uuid', nullable: true })
  authorUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorUserId' })
  author?: User | null;

  @Column({ type: 'text' })
  body!: string;
}
