import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationSettings } from './entities';

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(OrganizationSettings)
    private readonly settingsRepository: Repository<OrganizationSettings>,
  ) {}

  async createWithDefaults(name: string): Promise<Organization> {
    const baseSlug = slugify(name) || 'org';
    let slug = baseSlug;
    let suffix = 1;
    while (await this.organizationsRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    const org = await this.organizationsRepository.save(
      this.organizationsRepository.create({ name, slug }),
    );
    await this.settingsRepository.save(this.settingsRepository.create({ organizationId: org.id }));
    return org;
  }

  async findById(id: string): Promise<Organization> {
    const org = await this.organizationsRepository.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, patch: Partial<Organization>): Promise<Organization> {
    if (patch.slug) {
      const existing = await this.organizationsRepository.findOne({
        where: { slug: patch.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('That slug is already taken');
      }
    }
    await this.organizationsRepository.update(id, patch);
    return this.findById(id);
  }

  async getSettings(organizationId: string): Promise<OrganizationSettings> {
    const settings = await this.settingsRepository.findOne({ where: { organizationId } });
    if (!settings) throw new NotFoundException('Organization settings not found');
    return settings;
  }

  async updateSettings(
    organizationId: string,
    patch: Partial<OrganizationSettings>,
  ): Promise<OrganizationSettings> {
    await this.settingsRepository.update({ organizationId }, patch);
    return this.getSettings(organizationId);
  }
}
