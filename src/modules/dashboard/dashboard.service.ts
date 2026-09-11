import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ActivityLog, ActivityService } from '@module/activity';
import { Candidate } from '@module/candidates/entities';
import { InterviewSummary } from '@module/evaluation/entities';
import { Interview } from '@module/interviews/entities';
import { Job, JobStatus } from '@module/jobs/entities';

export interface DashboardOverview {
  jobsTotal: number;
  jobsOpen: number;
  candidatesTotal: number;
  candidatesByStage: Record<string, number>;
  interviewsThisWeek: number;
  avgEvaluationScore: number | null;
  recentActivity: ActivityLog[];
}

function startOfWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(Candidate)
    private readonly candidatesRepository: Repository<Candidate>,
    @InjectRepository(Interview)
    private readonly interviewsRepository: Repository<Interview>,
    @InjectRepository(InterviewSummary)
    private readonly summariesRepository: Repository<InterviewSummary>,
    private readonly activityService: ActivityService,
  ) {}

  async getOverview(organizationId: string): Promise<DashboardOverview> {
    const [
      jobsTotal,
      jobsOpen,
      candidatesTotal,
      interviewsThisWeek,
      stageCounts,
      avgScoreRow,
      recentActivity,
    ] = await Promise.all([
      this.jobsRepository.count({ where: { organizationId } }),
      this.jobsRepository.count({ where: { organizationId, status: JobStatus.OPEN } }),
      this.candidatesRepository.count({ where: { organizationId } }),
      this.interviewsRepository.count({
        where: { organizationId, scheduledAt: MoreThanOrEqual(startOfWeek()) },
      }),
      this.candidatesRepository
        .createQueryBuilder('candidate')
        .select('candidate.stage', 'stage')
        .addSelect('COUNT(*)', 'count')
        .where('candidate.organizationId = :organizationId', { organizationId })
        .groupBy('candidate.stage')
        .getRawMany<{ stage: string; count: string }>(),
      this.summariesRepository
        .createQueryBuilder('summary')
        .select('AVG(summary.overallScore)', 'avg')
        .where('summary.organizationId = :organizationId', { organizationId })
        .getRawOne<{ avg: string | null }>(),
      this.activityService.listRecent(organizationId, 10),
    ]);

    return {
      jobsTotal,
      jobsOpen,
      candidatesTotal,
      candidatesByStage: Object.fromEntries(stageCounts.map((r) => [r.stage, Number(r.count)])),
      interviewsThisWeek,
      avgEvaluationScore: avgScoreRow?.avg != null ? Number(avgScoreRow.avg) : null,
      recentActivity,
    };
  }
}
