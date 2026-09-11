import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getEnv } from '@config/env';
import { ActivityService, ActivityType } from '@module/activity';
import { MailService } from '@core/mail';
import { Candidate, CandidateStage } from '@module/candidates/entities';
import { CandidatesService } from '@module/candidates/candidates.service';
import { InterviewSessionService } from '@module/interview-session';
import { InterviewRoundType } from '@module/jobs/entities';
import { JobsService } from '@module/jobs/jobs.service';
import { EvaluationProcessingProducerService } from '@module/transcript-ingestion';
import { InterviewQuestion, Interview, InterviewStatus } from './entities';
import { ListInterviewsQueryDto, RescheduleInterviewDto, ScheduleInterviewDto } from './dto';

/** Mirrors the prototype's own mapping: an AI-conducted round moves the candidate to
 * "screening", an HR round to "hr_review", anything else ("technical") to "interview". */
function stageForRoundType(type: InterviewRoundType): CandidateStage {
  if (type === InterviewRoundType.AI_INTERVIEW) return CandidateStage.SCREENING;
  if (type === InterviewRoundType.HR) return CandidateStage.HR_REVIEW;
  return CandidateStage.INTERVIEW;
}

@Injectable()
export class InterviewsService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewsRepository: Repository<Interview>,
    @InjectRepository(InterviewQuestion)
    private readonly interviewQuestionsRepository: Repository<InterviewQuestion>,
    @InjectRepository(Candidate)
    private readonly candidatesRepository: Repository<Candidate>,
    private readonly jobsService: JobsService,
    private readonly candidatesService: CandidatesService,
    private readonly interviewSessionService: InterviewSessionService,
    private readonly mailService: MailService,
    private readonly evaluationProcessingProducer: EvaluationProcessingProducerService,
    private readonly activityService: ActivityService,
  ) {}

  async schedule(
    organizationId: string,
    createdByUserId: string,
    dto: ScheduleInterviewDto,
  ): Promise<Interview> {
    const candidate = await this.candidatesRepository.findOne({
      where: { id: dto.candidateId, organizationId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    const job = await this.jobsService.findOne(organizationId, candidate.jobId);
    const rounds = job.rounds ?? [];
    const round = rounds[dto.roundIndex];
    if (!round) {
      throw new BadRequestException(
        `This job only has ${rounds.length} interview round(s) configured`,
      );
    }

    const existing = await this.interviewsRepository.findOne({
      where: { candidateId: dto.candidateId, roundIndex: dto.roundIndex },
    });
    if (existing) {
      throw new ConflictException(
        'An interview already exists for this candidate and round — reschedule it instead of creating a new one',
      );
    }

    const interview = this.interviewsRepository.create({
      organizationId,
      candidateId: dto.candidateId,
      jobId: candidate.jobId,
      roundTemplateId: round.id,
      roundIndex: dto.roundIndex,
      roundName: round.name,
      type: round.type,
      scheduledAt: new Date(dto.scheduledAt),
      durationMinutes: dto.durationMinutes ?? round.durationMinutes,
      interviewerUserId: dto.interviewerUserId ?? round.defaultInterviewerUserId ?? null,
      timezone: dto.timezone ?? 'Asia/Kolkata (IST)',
      createdByUserId,
      questions: (round.questions ?? []).map((q) => ({
        orderIndex: q.orderIndex,
        questionText: q.questionText,
        questionType: q.questionType,
      })),
    });
    const saved = await this.interviewsRepository.save(interview);

    await this.candidatesService.advanceStageIfForward(
      organizationId,
      dto.candidateId,
      stageForRoundType(round.type),
    );
    await this.activityService.log({
      organizationId,
      type: ActivityType.INTERVIEW_SCHEDULED,
      message: `${round.name} scheduled for ${candidate.name}`,
      actorUserId: createdByUserId,
    });

    return this.findOne(organizationId, saved.id);
  }

  async findAll(organizationId: string, query: ListInterviewsQueryDto): Promise<Interview[]> {
    const qb = this.interviewsRepository
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.candidate', 'candidate')
      .leftJoinAndSelect('interview.job', 'job')
      .leftJoinAndSelect('interview.interviewer', 'interviewer')
      .where('interview.organizationId = :organizationId', { organizationId })
      .orderBy('interview.scheduledAt', 'DESC');

    if (query.candidateId) {
      qb.andWhere('interview.candidateId = :candidateId', { candidateId: query.candidateId });
    }
    if (query.jobId) qb.andWhere('interview.jobId = :jobId', { jobId: query.jobId });
    if (query.status) qb.andWhere('interview.status = :status', { status: query.status });

    return qb.getMany();
  }

  async findOne(organizationId: string, id: string): Promise<Interview> {
    const interview = await this.interviewsRepository.findOne({
      where: { id, organizationId },
      relations: { candidate: true, job: true, interviewer: true, questions: true },
      order: { questions: { orderIndex: 'ASC' } },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  private assertNotTerminal(interview: Interview): void {
    if (interview.status === InterviewStatus.CANCELLED) {
      throw new BadRequestException('This interview has been cancelled');
    }
    if (interview.status === InterviewStatus.COMPLETED) {
      throw new BadRequestException('This interview has already been completed');
    }
  }

  async reschedule(
    organizationId: string,
    id: string,
    dto: RescheduleInterviewDto,
  ): Promise<Interview> {
    const interview = await this.findOne(organizationId, id);
    this.assertNotTerminal(interview);

    await this.interviewsRepository.update(
      { id, organizationId },
      {
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        durationMinutes: dto.durationMinutes,
        interviewerUserId: dto.interviewerUserId,
        timezone: dto.timezone,
      },
    );
    return this.findOne(organizationId, id);
  }

  async sendInvitation(organizationId: string, id: string): Promise<Interview> {
    const interview = await this.findOne(organizationId, id);
    this.assertNotTerminal(interview);
    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new BadRequestException('This interview has already been invited');
    }

    const rawToken = await this.interviewSessionService.issueAccessToken({
      id: interview.id,
      candidateId: interview.candidateId,
      organizationId,
    });
    const link = `${getEnv('CANDIDATE_PORTAL_BASE_URL')}/${rawToken}`;
    const candidateName = interview.candidate?.name?.split(' ')[0] ?? 'there';
    const when = new Date(interview.scheduledAt).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    await this.mailService.sendMail({
      to: interview.candidate!.email,
      subject: `Interview Invitation — ${interview.job?.title ?? 'your application'}`,
      html: `<p>Hi ${candidateName},</p><p>You're invited to the <b>${interview.roundName}</b> for the <b>${interview.job?.title ?? 'role'}</b> position.</p><p>Whenever you're ready (by ${when} ${interview.timezone}), click below to begin. Once you start, you'll have ${interview.durationMinutes} minutes to complete all questions.</p><p><a href="${link}">${link}</a></p>`,
    });

    await this.interviewsRepository.update(
      { id, organizationId },
      { status: InterviewStatus.INVITATION_SENT },
    );
    return this.findOne(organizationId, id);
  }

  async cancel(organizationId: string, id: string): Promise<Interview> {
    const interview = await this.findOne(organizationId, id);
    if (interview.status === InterviewStatus.COMPLETED) {
      throw new BadRequestException('A completed interview cannot be cancelled');
    }
    await this.interviewsRepository.update(
      { id, organizationId },
      { status: InterviewStatus.CANCELLED },
    );
    await this.interviewSessionService.revokeTokensForInterview(id);
    return this.findOne(organizationId, id);
  }

  /** Re-enqueues `evaluation-processing` for an interview — e.g. after fixing an LLM
   * config issue, or once a previously-failed transcription has been redone. A no-op
   * from the recruiter's point of view if the transcript still isn't ready; the
   * consumer just logs and skips again until it is. */
  async retryEvaluation(organizationId: string, id: string): Promise<Interview> {
    const interview = await this.findOne(organizationId, id);
    if (
      interview.status !== InterviewStatus.PENDING_EVALUATION &&
      interview.status !== InterviewStatus.COMPLETED
    ) {
      throw new BadRequestException('This interview has not been submitted yet');
    }
    await this.evaluationProcessingProducer.retry({
      interviewId: interview.id,
      candidateId: interview.candidateId,
      organizationId,
    });
    return interview;
  }
}
