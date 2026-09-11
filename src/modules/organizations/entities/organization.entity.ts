import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '@core/database';

export enum OrganizationStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

@Entity('organizations')
export class Organization extends AppBaseEntity {
  @Column()
  name!: string;

  @Index({ unique: true })
  @Column()
  slug!: string;

  @Column({ type: 'enum', enum: OrganizationStatus, default: OrganizationStatus.TRIAL })
  status!: OrganizationStatus;
}
