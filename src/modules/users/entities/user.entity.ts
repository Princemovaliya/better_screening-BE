import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { OrgScopedEntity } from '@core/database';
import { Organization } from '@module/organizations/entities';

export enum UserRole {
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
}

export enum UserStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  DISABLED = 'disabled',
}

@Entity('users')
@Unique(['organizationId', 'email'])
export class User extends OrgScopedEntity {
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Index()
  @Column()
  email!: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash?: string | null;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.RECRUITER })
  role!: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ type: 'varchar', nullable: true })
  avatarPath?: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  inviteTokenHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  inviteTokenExpiresAt?: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  resetTokenHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetTokenExpiresAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;
}
