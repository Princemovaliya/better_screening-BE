import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashToken, randomToken } from '@core/utils/crypt.util';
import { StorageService } from '@core/storage';
import { Interview, InterviewStatus } from '@module/interviews/entities';
import { TranscriptGenerationProducerService } from '@module/transcript-ingestion';
import {
  AccessTokenStatus,
  InterviewAccessToken,
  InterviewAnswer,
  InterviewAnswerStatus,
} from './entities';
import { CandidateSessionContext } from './types/candidate-session-context.type';

const ACCESS_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface CandidateSessionQuestion {
  id: string;
  orderIndex: number;
  questionText: string;
  questionType: string;
  answered: boolean;
}

export interface CandidateSessionResponse {
  status: 'active' | 'submitted';
  roundName: string;
  jobTitle: string;
  candidateName: string;
  durationMinutes: number;
  startedAt: string | null;
  deadlineAt: string | null;
  questions: CandidateSessionQuestion[];
}

@Injectable()
export class InterviewSessionService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewsRepository: Repository<Interview>,
    @InjectRepository(InterviewAccessToken)
    private readonly tokensRepository: Repository<InterviewAccessToken>,
    @InjectRepository(InterviewAnswer)
    private readonly answersRepository: Repository<InterviewAnswer>,
    private readonly storageService: StorageService,
    private readonly transcriptGenerationProducer: TranscriptGenerationProducerService,
  ) {}

  // ---- Called by InterviewsModule when a recruiter sends an invitation ----

  async issueAccessToken(interview: {
    id: string;
    candidateId: string;
    organizationId: string;
  }): Promise<string> {
    const rawToken = randomToken();
    await this.tokensRepository.save(
      this.tokensRepository.create({
        interviewId: interview.id,
        candidateId: interview.candidateId,
        organizationId: interview.organizationId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
        status: AccessTokenStatus.ACTIVE,
      }),
    );
    return rawToken;
  }

  /** Called when a recruiter cancels an interview — closes off a link that might
   * still be sitting in the candidate's inbox. */
  async revokeTokensForInterview(interviewId: string): Promise<void> {
    await this.tokensRepository.update(
      { interviewId, status: AccessTokenStatus.ACTIVE },
      { status: AccessTokenStatus.REVOKED },
    );
  }

  // ---- Candidate-facing ----

  private async loadInterview(interviewId: string): Promise<Interview> {
    const interview = await this.interviewsRepository.findOne({
      where: { id: interviewId },
      relations: { candidate: true, job: true, questions: true },
      order: { questions: { orderIndex: 'ASC' } },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  private deadlineFor(interview: Interview): Date | null {
    if (!interview.startedAt) return null;
    return new Date(interview.startedAt.getTime() + interview.durationMinutes * 60_000);
  }

  /** If the round is running and its deadline has passed, auto-submit it. Called at
   * the top of every candidate-facing action so a stale/abandoned session can't
   * keep recording or uploading past its allotted time. */
  private async enforceDeadline(interview: Interview): Promise<Interview> {
    if (interview.status !== InterviewStatus.IN_PROGRESS) return interview;
    const deadline = this.deadlineFor(interview);
    if (deadline && new Date() > deadline) {
      await this.finalizeSubmit(interview.id, true);
      return this.loadInterview(interview.id);
    }
    return interview;
  }

  private async finalizeSubmit(interviewId: string, isAutoSubmit: boolean): Promise<void> {
    await this.interviewsRepository.update(interviewId, {
      status: InterviewStatus.PENDING_EVALUATION,
      ...(isAutoSubmit ? { autoSubmittedAt: new Date() } : {}),
    });
    await this.tokensRepository.update(
      { interviewId, status: AccessTokenStatus.ACTIVE },
      { status: AccessTokenStatus.USED, consumedAt: new Date() },
    );
    // Hand off to the STT vendor with whatever was recorded — enqueueForInterview is a
    // no-op if nothing was answered (e.g. the deadline hit before question 1).
    await this.transcriptGenerationProducer.enqueueForInterview(interviewId);
  }

  async getSession(session: CandidateSessionContext): Promise<CandidateSessionResponse> {
    let interview = await this.loadInterview(session.interviewId);
    interview = await this.enforceDeadline(interview);

    // First time the candidate opens the link: start the clock.
    if (interview.status === InterviewStatus.INVITATION_SENT) {
      const startedAt = new Date();
      await this.interviewsRepository.update(interview.id, {
        status: InterviewStatus.IN_PROGRESS,
        startedAt,
      });
      interview = await this.loadInterview(interview.id);
    }

    const answers = await this.answersRepository.find({ where: { interviewId: interview.id } });
    const answeredIds = new Set(answers.map((a) => a.interviewQuestionId));

    const submitted =
      interview.status === InterviewStatus.PENDING_EVALUATION ||
      interview.status === InterviewStatus.COMPLETED;

    if (interview.status === InterviewStatus.CANCELLED) {
      throw new BadRequestException('This interview has been cancelled');
    }

    return {
      status: submitted ? 'submitted' : 'active',
      roundName: interview.roundName,
      jobTitle: interview.job?.title ?? '',
      candidateName: interview.candidate?.name ?? '',
      durationMinutes: interview.durationMinutes,
      startedAt: interview.startedAt?.toISOString() ?? null,
      deadlineAt: this.deadlineFor(interview)?.toISOString() ?? null,
      questions: (interview.questions ?? [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((q) => ({
          id: q.id,
          orderIndex: q.orderIndex,
          questionText: q.questionText,
          questionType: q.questionType,
          answered: answeredIds.has(q.id),
        })),
    };
  }

  private async assertActiveAndFindQuestion(session: CandidateSessionContext, questionId: string) {
    let interview = await this.loadInterview(session.interviewId);
    interview = await this.enforceDeadline(interview);
    if (interview.status !== InterviewStatus.IN_PROGRESS) {
      throw new BadRequestException('This interview session is no longer active');
    }
    const question = interview.questions?.find((q) => q.id === questionId);
    if (!question) throw new NotFoundException('Question not found for this interview');
    return { interview, question };
  }

  async getUploadUrl(
    session: CandidateSessionContext,
    questionId: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    const { interview } = await this.assertActiveAndFindQuestion(session, questionId);
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'bin';
    const storageKey = `org/${interview.organizationId}/interviews/${interview.id}/questions/${questionId}/${randomToken(8)}.${ext}`;
    const uploadUrl = await this.storageService.getSignedUploadUrl(
      this.storageService.recordingsBucket,
      storageKey,
      mimeType,
    );
    return { uploadUrl, storageKey };
  }

  async completeQuestion(
    session: CandidateSessionContext,
    questionId: string,
    dto: { storageKey: string; mimeType: string; durationSeconds?: number; sizeBytes?: number },
  ): Promise<{ questionId: string; status: InterviewAnswerStatus }> {
    const { interview } = await this.assertActiveAndFindQuestion(session, questionId);

    const existing = await this.answersRepository.findOne({
      where: { interviewId: interview.id, interviewQuestionId: questionId },
    });
    const fields = {
      recordingStoragePath: dto.storageKey,
      recordingMimeType: dto.mimeType,
      recordingDurationSeconds: dto.durationSeconds,
      recordingSizeBytes: dto.sizeBytes,
      status: InterviewAnswerStatus.UPLOADED,
    };
    if (existing) {
      await this.answersRepository.update(existing.id, fields);
    } else {
      await this.answersRepository.save(
        this.answersRepository.create({
          interviewId: interview.id,
          interviewQuestionId: questionId,
          organizationId: interview.organizationId,
          ...fields,
        }),
      );
    }
    return { questionId, status: InterviewAnswerStatus.UPLOADED };
  }

  async submit(session: CandidateSessionContext): Promise<{ status: 'submitted' }> {
    let interview = await this.loadInterview(session.interviewId);
    interview = await this.enforceDeadline(interview);

    if (
      interview.status === InterviewStatus.PENDING_EVALUATION ||
      interview.status === InterviewStatus.COMPLETED
    ) {
      return { status: 'submitted' }; // idempotent — candidate double-clicked, or already auto-submitted
    }
    if (interview.status !== InterviewStatus.IN_PROGRESS) {
      throw new BadRequestException('This interview session is not active');
    }
    await this.finalizeSubmit(interview.id, false);
    return { status: 'submitted' };
  }
}
