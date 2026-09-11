import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { AppBaseEntity } from '@core/database';
import { Organization } from './organization.entity';

@Entity('organization_settings')
export class OrganizationSettings extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  organizationId!: string;

  @OneToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Column({ default: true })
  aiInterviewEnabled!: boolean;

  @Column({ default: 30 })
  defaultRoundDurationMinutes!: number;

  @Column({ default: 'Asia/Kolkata (IST)' })
  defaultTimezone!: string;

  @Column({ default: true })
  notifyOnEvaluationReady!: boolean;

  @Column({ default: true })
  notifyOnNewApplication!: boolean;

  @Column({ type: 'text', nullable: true })
  emailSignature?: string | null;
}
