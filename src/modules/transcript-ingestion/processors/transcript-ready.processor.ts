import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, TranscriptReadyJobPayload } from '@core/queue';
import { Interview } from '@module/interviews/entities';
import { InterviewTranscript } from '../entities';
import { EvaluationProcessingProducerService } from '../producers/evaluation-processing.producer';

/**
 * Consumes `transcript-ready` — produced by the third-party STT vendor's own worker
 * (or, in local dev, the mock worker in `src/scripts/mock-stt-worker.ts`). Persists the
 * transcript, then hands off to the fully-internal `evaluation-processing` queue.
 *
 * Idempotent by design (BullMQ is at-least-once delivery, and a vendor may legitimately
 * redeliver): looks for an existing `interview_transcripts` row for this interview
 * before writing, so a duplicate delivery is a safe no-op rather than a duplicate row
 * or a duplicate evaluation-processing enqueue.
 */
@Processor(QUEUE_NAMES.TRANSCRIPT_READY)
export class TranscriptReadyProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptReadyProcessor.name);

  constructor(
    @InjectRepository(Interview)
    private readonly interviewsRepository: Repository<Interview>,
    @InjectRepository(InterviewTranscript)
    private readonly transcriptsRepository: Repository<InterviewTranscript>,
    private readonly evaluationProcessingProducer: EvaluationProcessingProducerService,
  ) {
    super();
  }

  async process(job: Job<TranscriptReadyJobPayload>): Promise<void> {
    const payload = job.data;

    const interview = await this.interviewsRepository.findOne({
      where: { id: payload.interviewId },
    });
    if (!interview) {
      this.logger.error(
        `transcript-ready for unknown interview ${payload.interviewId} — dropping (not retryable)`,
      );
      return;
    }
    if (interview.organizationId !== payload.organizationId) {
      this.logger.error(
        `transcript-ready organizationId mismatch for interview ${payload.interviewId} — dropping (not retryable)`,
      );
      return;
    }

    const existing = await this.transcriptsRepository.findOne({
      where: { interviewId: payload.interviewId },
    });
    if (existing) {
      this.logger.log(
        `transcript-ready for interview ${payload.interviewId} already persisted — skipping (idempotent)`,
      );
      return;
    }

    if (payload.status === 'FAILED' || !payload.transcript) {
      await this.transcriptsRepository.save(
        this.transcriptsRepository.create({
          interviewId: payload.interviewId,
          organizationId: payload.organizationId,
          combinedText: '',
          perQuestion: [],
          failureReason: payload.errorMessage ?? 'STT vendor reported failure',
        }),
      );
      this.logger.error(
        `Transcription failed for interview ${payload.interviewId}: ${payload.errorMessage ?? 'unknown error'}`,
      );
      return; // nothing to evaluate — a later phase can add an admin retry/notification
    }

    await this.transcriptsRepository.save(
      this.transcriptsRepository.create({
        interviewId: payload.interviewId,
        organizationId: payload.organizationId,
        combinedText: payload.transcript.combinedText,
        perQuestion: payload.transcript.perQuestion,
        language: payload.transcript.language ?? null,
      }),
    );
    this.logger.log(`Persisted transcript for interview ${payload.interviewId}`);

    await this.evaluationProcessingProducer.enqueue({
      interviewId: payload.interviewId,
      candidateId: payload.candidateId,
      organizationId: payload.organizationId,
    });
  }
}
