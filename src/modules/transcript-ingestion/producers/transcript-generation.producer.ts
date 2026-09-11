import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, TranscriptGenerationJobPayload } from '@core/queue';
import { StorageService } from '@core/storage';
import { Interview } from '@module/interviews/entities';
import { InterviewAnswer } from '@module/interview-session/entities';

/**
 * Enqueues a `transcript-generation` job for the third-party STT vendor's own worker
 * to pick up. Self-contained: given only an interviewId, it loads everything else
 * (the frozen questions, the candidate's uploaded answers) and mints a short-lived
 * signed GET url per recording so the vendor can fetch the media without ever
 * touching our storage credentials.
 */
@Injectable()
export class TranscriptGenerationProducerService {
  private readonly logger = new Logger(TranscriptGenerationProducerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.TRANSCRIPT_GENERATION)
    private readonly queue: Queue<TranscriptGenerationJobPayload>,
    @InjectRepository(Interview)
    private readonly interviewsRepository: Repository<Interview>,
    @InjectRepository(InterviewAnswer)
    private readonly answersRepository: Repository<InterviewAnswer>,
    private readonly storageService: StorageService,
  ) {}

  async enqueueForInterview(interviewId: string): Promise<void> {
    const interview = await this.interviewsRepository.findOne({
      where: { id: interviewId },
      relations: { questions: true },
    });
    if (!interview) {
      this.logger.warn(`enqueueForInterview: interview ${interviewId} not found — skipping`);
      return;
    }

    const answers = await this.answersRepository.find({ where: { interviewId } });
    if (answers.length === 0) {
      this.logger.warn(`enqueueForInterview: interview ${interviewId} has no answers — skipping`);
      return;
    }
    const answerByQuestionId = new Map(answers.map((a) => [a.interviewQuestionId, a]));

    const questions = await Promise.all(
      (interview.questions ?? [])
        .filter((q) => answerByQuestionId.has(q.id))
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(async (q) => {
          const answer = answerByQuestionId.get(q.id)!;
          const mediaUrl = await this.storageService.getSignedDownloadUrl(
            this.storageService.recordingsBucket,
            answer.recordingStoragePath,
          );
          return {
            questionId: q.id,
            orderIndex: q.orderIndex,
            questionText: q.questionText,
            mediaUrl,
            mediaMimeType: answer.recordingMimeType,
            durationSeconds: answer.recordingDurationSeconds ?? undefined,
          };
        }),
    );

    const payload: TranscriptGenerationJobPayload = {
      interviewId: interview.id,
      candidateId: interview.candidateId,
      organizationId: interview.organizationId,
      questions,
      callbackQueue: QUEUE_NAMES.TRANSCRIPT_READY,
      requestedAt: new Date().toISOString(),
    };

    // jobId = interviewId: dedupes so a retried/duplicate submit never queues the
    // same interview's transcription twice while a job is active.
    await this.queue.add('transcribe', payload, {
      jobId: interview.id,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(`Enqueued transcript-generation for interview ${interview.id}`);
  }
}
