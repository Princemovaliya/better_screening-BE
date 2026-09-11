import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities';

/** Fields safe to return to clients — an explicit allowlist (rather than an Omit of
 * secret fields) so a newly added sensitive column can't leak just by being forgotten
 * in an exclusion list. */
export type PublicUser = Pick<
  User,
  'id' | 'organizationId' | 'email' | 'name' | 'role' | 'status' | 'avatarPath' | 'createdAt'
>;

export function toPublicUser(user: User): PublicUser {
  const { id, organizationId, email, name, role, status, avatarPath, createdAt } = user;
  return { id, organizationId, email, name, role, status, avatarPath, createdAt };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmailInOrg(organizationId: string, email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { organizationId, email } });
  }

  /** Looks up a user by email across all orgs — used only during login, before we
   * know which organization the credentials belong to. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  findByResetTokenHash(resetTokenHash: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect(['user.resetTokenHash', 'user.resetTokenExpiresAt'])
      .where('user.resetTokenHash = :resetTokenHash', { resetTokenHash })
      .getOne();
  }

  findByInviteTokenHash(inviteTokenHash: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect(['user.inviteTokenHash', 'user.inviteTokenExpiresAt'])
      .where('user.inviteTokenHash = :inviteTokenHash', { inviteTokenHash })
      .getOne();
  }

  findById(organizationId: string, id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id, organizationId } });
  }

  findAllInOrg(organizationId: string): Promise<User[]> {
    return this.usersRepository.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async update(organizationId: string, id: string, patch: Partial<User>): Promise<User> {
    await this.usersRepository.update({ id, organizationId }, patch);
    const updated = await this.findById(organizationId, id);
    if (!updated) throw new Error('User not found after update');
    return updated;
  }

  private countAdmins(organizationId: string): Promise<number> {
    return this.usersRepository.count({ where: { organizationId, role: UserRole.ADMIN } });
  }

  async updateRole(organizationId: string, id: string, role: UserRole): Promise<PublicUser> {
    const target = await this.findById(organizationId, id);
    if (!target) throw new NotFoundException('Team member not found');

    if (target.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      if ((await this.countAdmins(organizationId)) <= 1) {
        throw new BadRequestException('Cannot demote the only admin — promote someone else first');
      }
    }

    await this.usersRepository.update({ id, organizationId }, { role });
    return toPublicUser((await this.findById(organizationId, id))!);
  }

  async remove(organizationId: string, requestingUserId: string, id: string): Promise<void> {
    if (id === requestingUserId) {
      throw new BadRequestException('You cannot remove yourself from the team');
    }
    const target = await this.findById(organizationId, id);
    if (!target) throw new NotFoundException('Team member not found');

    if (target.role === UserRole.ADMIN && (await this.countAdmins(organizationId)) <= 1) {
      throw new BadRequestException('Cannot remove the only admin — promote someone else first');
    }

    await this.usersRepository.delete({ id, organizationId });
  }
}
