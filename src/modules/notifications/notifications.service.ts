import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification, NotificationType } from './entities';

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(input: CreateNotificationInput): Promise<void> {
    await this.notificationsRepository.save(this.notificationsRepository.create(input));
  }

  listForUser(
    organizationId: string,
    userId: string,
    unreadOnly: boolean,
  ): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { organizationId, userId, ...(unreadOnly ? { readAt: IsNull() } : {}) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  unreadCount(organizationId: string, userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { organizationId, userId, readAt: IsNull() },
    });
  }

  async markRead(organizationId: string, userId: string, id: string): Promise<void> {
    await this.notificationsRepository.update(
      { id, organizationId, userId },
      { readAt: new Date() },
    );
  }

  async markAllRead(organizationId: string, userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { organizationId, userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }
}
