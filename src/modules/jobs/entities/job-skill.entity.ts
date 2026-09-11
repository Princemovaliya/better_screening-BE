import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '@core/database';
import { Job } from './job.entity';

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum SkillImportance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('job_skills')
export class JobSkill extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  jobId!: string;

  @ManyToOne(() => Job, (job) => job.skills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job?: Job;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: SkillLevel, default: SkillLevel.INTERMEDIATE })
  level!: SkillLevel;

  @Column({ default: true })
  required!: boolean;

  @Column({ type: 'enum', enum: SkillImportance, default: SkillImportance.HIGH })
  importance!: SkillImportance;

  @Column({ type: 'int', default: 0 })
  orderIndex!: number;
}
