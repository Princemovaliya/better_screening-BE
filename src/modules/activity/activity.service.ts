import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityType } from './entities';

export interface LogActivityInput {
  organizationId: string;
  type: ActivityType;
  message: string;
  actorUserId?: string;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogsRepository: Repository<ActivityLog>,
  ) {}

  async log(input: LogActivityInput): Promise<void> {
    await this.activityLogsRepository.save(this.activityLogsRepository.create(input));
  }

  listRecent(organizationId: string, limit = 20): Promise<ActivityLog[]> {
    return this.activityLogsRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
