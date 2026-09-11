import { Column, Index } from 'typeorm';
import { AppBaseEntity } from './base.entity';

/**
 * Base for every tenant-scoped table. Multi-tenancy in this project is enforced
 * explicitly in service code (every repository call site filters by organizationId
 * taken from the authenticated user/token) rather than via an implicit global query
 * interceptor — this column + index is the data-layer half of that contract.
 */
export abstract class OrgScopedEntity extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  organizationId!: string;
}
