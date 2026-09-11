import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { OrgScopedEntity } from '@core/database';
import { Organization } from '@module/organizations/entities';
import { User } from '@module/users/entities';
import { InterviewRoundTemplate } from './interview-round-template.entity';
import { JobSkill } from './job-skill.entity';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
}

export enum JobStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('jobs')
export class Job extends OrgScopedEntity {
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Column()
  title!: string;

  @Column()
  department!: string;

  @Column({ type: 'varchar', nullable: true })
  location?: string | null;

  @Column({ type: 'enum', enum: EmploymentType, default: EmploymentType.FULL_TIME })
  employmentType!: EmploymentType;

  @Column({ type: 'int', nullable: true })
  experienceMin?: number | null;

  @Column({ type: 'int', nullable: true })
  experienceMax?: number | null;

  @Column({ type: 'numeric', nullable: true })
  salaryMin?: number | null;

  @Column({ type: 'numeric', nullable: true })
  salaryMax?: number | null;

  @Column({ default: 'INR' })
  salaryCurrency!: string;

  @Column({ type: 'int', default: 1 })
  positionsCount!: number;

  @Index()
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.DRAFT })
  status!: JobStatus;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy?: User | null;

  @OneToMany(() => JobSkill, (skill) => skill.job, { cascade: true })
  skills?: JobSkill[];

  @OneToMany(() => InterviewRoundTemplate, (round) => round.job, { cascade: true })
  rounds?: InterviewRoundTemplate[];
}
