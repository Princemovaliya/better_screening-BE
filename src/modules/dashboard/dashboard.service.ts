import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ActivityLog, ActivityService } from '@module/activity';
import { Candidate, CandidateStage } from '@module/candidates/entities';
import { EvaluationRecommendation, InterviewSummary } from '@module/evaluation/entities';
import { Interview, InterviewStatus } from '@module/interviews/entities';
import { Job, JobStatus } from '@module/jobs/entities';

const TERMINAL_INTERVIEW_STATUSES = [InterviewStatus.COMPLETED, InterviewStatus.CANCELLED];

export interface KpiCard {
  value: number;
  /** (count in the last `days`) - (count in the `days` before that) — a real,
   * computed week-over-week signal, never a fabricated number. */
  delta: number;
  /** One count per day, oldest first, over the same `days` window as `delta`'s
   * "current" half — real daily-bucketed data, not a decorative random walk. */
  sparkline: number[];
}

export interface OpenJobRow {
  id: string;
  title: string;
  department: string;
  location: string | null;
  status: string;
  applicants: number;
  screening: number;
  interviews: number;
  postedAt: string;
}

export interface AiSummary {
  interviewsPending: number;
  candidatesReadyToAdvance: number;
  strongestOpenReqTitle: string | null;
}

export interface DashboardOverview {
  kpis: {
    openings: KpiCard;
    candidates: KpiCard;
    interviewsPending: KpiCard;
    hired: KpiCard;
    inScreening: KpiCard;
    interviewsCompleted: KpiCard;
  };
  aiSummary: AiSummary;
  openJobs: OpenJobRow[];
  today: { interviewsToday: number; roundsToReview: number };
  recentActivity: ActivityLog[];
  candidatesByStage: Record<string, number>;
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

  /** Buckets `qb` (already filtered to the org + whatever else the caller needs) by
   * day over the last `days * 2` days, using `dateExpr` (an alias-qualified column,
   * e.g. `"job"."createdAt"`) as the event timestamp — then splits that into two
   * `days`-long halves so both a trend delta and a sparkline come from one query. */
  private async trend(
    qb: SelectQueryBuilder<any>,
    dateExpr: string,
    days = 7,
  ): Promise<{ delta: number; sparkline: number[] }> {
    const rows = await qb
      .select(`date_trunc('day', ${dateExpr})`, 'day')
      .addSelect('COUNT(*)', 'count')
      .andWhere(`${dateExpr} >= NOW() - INTERVAL '${days * 2} days'`)
      .groupBy('1')
      .orderBy('1', 'ASC')
      .getRawMany<{ day: Date; count: string }>();

    const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));
    const bucket = (offsetDaysAgo: number): number => {
      const d = new Date();
      d.setDate(d.getDate() - offsetDaysAgo);
      return byDay.get(d.toISOString().slice(0, 10)) ?? 0;
    };

    const sparkline = Array.from({ length: days }, (_, i) => bucket(days - 1 - i));
    const currentSum = sparkline.reduce((a, b) => a + b, 0);
    const previousSum = Array.from({ length: days }, (_, i) => bucket(days * 2 - 1 - i)).reduce(
      (a, b) => a + b,
      0,
    );

    return { delta: currentSum - previousSum, sparkline };
  }

  async getOverview(organizationId: string, trendDays = 30): Promise<DashboardOverview> {
    const [
      jobsOpen,
      candidatesTotal,
      interviewsPendingCount,
      hiredCount,
      inScreeningCount,
      interviewsCompletedCount,
      openingsTrend,
      candidatesTrend,
      interviewsPendingTrend,
      hiredTrend,
      inScreeningTrend,
      interviewsCompletedTrend,
      recentActivity,
      stageCounts,
    ] = await Promise.all([
      this.jobsRepository.count({ where: { organizationId, status: JobStatus.OPEN } }),
      this.candidatesRepository.count({ where: { organizationId } }),
      this.interviewsRepository
        .createQueryBuilder('interview')
        .where('interview.organizationId = :organizationId', { organizationId })
        .andWhere('interview.status NOT IN (:...statuses)', {
          statuses: TERMINAL_INTERVIEW_STATUSES,
        })
        .getCount(),
      // "Hired this month" — there's no dedicated per-stage-transition timestamp, so
      // this uses updatedAt as a practical proxy for "became hired around this time"
      // (imperfect: any later edit to the candidate would also bump it, but stage
      // changes are by far the most common reason a hired candidate gets touched).
      this.candidatesRepository
        .createQueryBuilder('candidate')
        .where('candidate.organizationId = :organizationId AND candidate.stage = :stage', {
          organizationId,
          stage: CandidateStage.HIRED,
        })
        .andWhere(`candidate.updatedAt >= date_trunc('month', NOW())`)
        .getCount(),
      this.candidatesRepository.count({
        where: { organizationId, stage: CandidateStage.SCREENING },
      }),
      this.summariesRepository.count({ where: { organizationId } }),

      this.trend(
        this.jobsRepository
          .createQueryBuilder('job')
          .where('job.organizationId = :organizationId', {
            organizationId,
          }) as SelectQueryBuilder<any>,
        '"job"."createdAt"',
        trendDays,
      ),
      this.trend(
        this.candidatesRepository
          .createQueryBuilder('candidate')
          .where('candidate.organizationId = :organizationId', {
            organizationId,
          }) as SelectQueryBuilder<any>,
        '"candidate"."createdAt"',
        trendDays,
      ),
      this.trend(
        this.interviewsRepository
          .createQueryBuilder('interview')
          .where('interview.organizationId = :organizationId', {
            organizationId,
          }) as SelectQueryBuilder<any>,
        '"interview"."createdAt"',
        trendDays,
      ),
      this.trend(
        this.candidatesRepository
          .createQueryBuilder('candidate')
          .where('candidate.organizationId = :organizationId AND candidate.stage = :stage', {
            organizationId,
            stage: CandidateStage.HIRED,
          }) as SelectQueryBuilder<any>,
        '"candidate"."updatedAt"',
        trendDays,
      ),
      this.trend(
        this.candidatesRepository
          .createQueryBuilder('candidate')
          .where('candidate.organizationId = :organizationId AND candidate.stage = :stage', {
            organizationId,
            stage: CandidateStage.SCREENING,
          }) as SelectQueryBuilder<any>,
        '"candidate"."updatedAt"',
        trendDays,
      ),
      this.trend(
        this.summariesRepository
          .createQueryBuilder('summary')
          .where('summary.organizationId = :organizationId', {
            organizationId,
          }) as SelectQueryBuilder<any>,
        '"summary"."createdAt"',
        trendDays,
      ),

      this.activityService.listRecent(organizationId, 10),

      this.candidatesRepository
        .createQueryBuilder('candidate')
        .select('candidate.stage', 'stage')
        .addSelect('COUNT(*)', 'count')
        .where('candidate.organizationId = :organizationId', { organizationId })
        .groupBy('candidate.stage')
        .getRawMany<{ stage: string; count: string }>(),
    ]);

    const [aiSummary, openJobs, today] = await Promise.all([
      this.getAiSummary(organizationId, interviewsPendingCount),
      this.getOpenJobsTable(organizationId),
      this.getToday(organizationId),
    ]);

    return {
      kpis: {
        openings: { value: jobsOpen, ...openingsTrend },
        candidates: { value: candidatesTotal, ...candidatesTrend },
        interviewsPending: { value: interviewsPendingCount, ...interviewsPendingTrend },
        hired: { value: hiredCount, ...hiredTrend },
        inScreening: { value: inScreeningCount, ...inScreeningTrend },
        interviewsCompleted: { value: interviewsCompletedCount, ...interviewsCompletedTrend },
      },
      aiSummary,
      openJobs,
      today,
      recentActivity,
      candidatesByStage: Object.fromEntries(stageCounts.map((r) => [r.stage, Number(r.count)])),
    };
  }

  /** "Ready to advance" = interviewed, scored well by the AI, but the recruiter
   * hasn't moved them past the interview stage yet — a genuinely actionable signal,
   * not a decorative number. */
  private async getAiSummary(
    organizationId: string,
    interviewsPending: number,
  ): Promise<AiSummary> {
    const readyToAdvance = await this.candidatesRepository
      .createQueryBuilder('candidate')
      .innerJoin(Interview, 'interview', 'interview.candidateId = candidate.id')
      .innerJoin(InterviewSummary, 'summary', 'summary.interviewId = interview.id')
      .where('candidate.organizationId = :organizationId', { organizationId })
      .andWhere('candidate.stage = :stage', { stage: CandidateStage.INTERVIEW })
      .andWhere('summary.recommendation IN (:...recs)', {
        recs: [EvaluationRecommendation.STRONG_HIRE, EvaluationRecommendation.HIRE],
      })
      .getCount();

    const strongestOpenReq = await this.jobsRepository
      .createQueryBuilder('job')
      .leftJoin(Candidate, 'candidate', 'candidate.jobId = job.id')
      .select('job.title', 'title')
      .addSelect('COUNT(candidate.id)', 'applicants')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('job.status = :status', { status: JobStatus.OPEN })
      .groupBy('job.id')
      .orderBy('applicants', 'DESC')
      .addOrderBy('job.createdAt', 'DESC')
      .limit(1)
      .getRawOne<{ title: string; applicants: string }>();

    return {
      interviewsPending,
      candidatesReadyToAdvance: readyToAdvance,
      strongestOpenReqTitle: strongestOpenReq?.title ?? null,
    };
  }

  private async getOpenJobsTable(organizationId: string): Promise<OpenJobRow[]> {
    const jobs = await this.jobsRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 8,
    });
    if (jobs.length === 0) return [];
    const jobIds = jobs.map((j) => j.id);

    const [candidateCounts, interviewCounts] = await Promise.all([
      this.candidatesRepository
        .createQueryBuilder('candidate')
        .select('candidate.jobId', 'jobId')
        .addSelect('COUNT(*)', 'total')
        .addSelect(`COUNT(*) FILTER (WHERE candidate.stage = :screeningStage)`, 'screening')
        .where('candidate.organizationId = :organizationId', { organizationId })
        .andWhere('candidate.jobId IN (:...jobIds)', { jobIds })
        .setParameter('screeningStage', CandidateStage.SCREENING)
        .groupBy('candidate.jobId')
        .getRawMany<{ jobId: string; total: string; screening: string }>(),
      this.interviewsRepository
        .createQueryBuilder('interview')
        .select('interview.jobId', 'jobId')
        .addSelect('COUNT(*)', 'total')
        .where('interview.organizationId = :organizationId', { organizationId })
        .andWhere('interview.jobId IN (:...jobIds)', { jobIds })
        .groupBy('interview.jobId')
        .getRawMany<{ jobId: string; total: string }>(),
    ]);

    const candidatesByJob = new Map(candidateCounts.map((r) => [r.jobId, r]));
    const interviewsByJob = new Map(interviewCounts.map((r) => [r.jobId, Number(r.total)]));

    return jobs.map((job) => ({
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location ?? null,
      status: job.status,
      applicants: Number(candidatesByJob.get(job.id)?.total ?? 0),
      screening: Number(candidatesByJob.get(job.id)?.screening ?? 0),
      interviews: interviewsByJob.get(job.id) ?? 0,
      postedAt: job.createdAt.toISOString(),
    }));
  }

  /** Backs the sidebar's "AI Assistant" widget — both numbers are real, not
   * decorative: interviews scheduled for today, and completed-but-unread evaluations
   * (i.e. status flipped to `completed` since the recruiter last looked). We don't
   * track "last looked" separately, so this uses "evaluated in the last 24h" as the
   * practical proxy for "needs review". */
  private async getToday(
    organizationId: string,
  ): Promise<{ interviewsToday: number; roundsToReview: number }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [interviewsToday, roundsToReview] = await Promise.all([
      this.interviewsRepository
        .createQueryBuilder('interview')
        .where('interview.organizationId = :organizationId', { organizationId })
        .andWhere('interview.scheduledAt >= :start AND interview.scheduledAt < :end', {
          start: startOfDay,
          end: endOfDay,
        })
        .getCount(),
      this.summariesRepository
        .createQueryBuilder('summary')
        .where('summary.organizationId = :organizationId', { organizationId })
        .andWhere(`summary.createdAt >= NOW() - INTERVAL '24 hours'`)
        .getCount(),
    ]);

    return { interviewsToday, roundsToReview };
  }
}
