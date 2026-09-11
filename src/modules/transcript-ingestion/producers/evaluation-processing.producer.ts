import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EvaluationProcessingJobPayload, QUEUE_NAMES } from '@core/queue';

/**
 * Enqueues the fully-internal `evaluation-processing` job once a transcript has been
 * persisted. No `EvaluationModule` consumes this yet (that's a later phase) — jobs
 * will simply queue up in Redis until it exists, which is fine: BullMQ jobs persist
 * until a worker picks them up.
 */
@Injectable()
export class EvaluationProcessingProducerService {
  private readonly logger = new Logger(EvaluationProcessingProducerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.EVALUATION_PROCESSING)
    private readonly queue: Queue<EvaluationProcessingJobPayload>,
  ) {}

  async enqueue(payload: EvaluationProcessingJobPayload): Promise<void> {
    await this.queue.add('evaluate', payload, {
      jobId: payload.interviewId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(`Enqueued evaluation-processing for interview ${payload.interviewId}`);
  }

  /** Manual retry (the admin `retry-evaluation` endpoint). `enqueue`'s fixed
   * `jobId: interviewId` means a plain `queue.add()` here would silently no-op against
   * a job still sitting in the `failed` set (kept via `removeOnFail: false` for
   * inspection) — BullMQ dedupes by jobId and won't create a second attempt. So: if a
   * failed job exists, explicitly `.retry()` it; if one is already waiting/active,
   * leave it alone; otherwise fall back to a normal `enqueue`. */
  async retry(payload: EvaluationProcessingJobPayload): Promise<void> {
    const existing = await this.queue.getJob(payload.interviewId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        await existing.retry();
        this.logger.log(
          `Retried failed evaluation-processing job for interview ${payload.interviewId}`,
        );
        return;
      }
      this.logger.log(
        `evaluation-processing job for interview ${payload.interviewId} is already "${state}" — not re-adding`,
      );
      return;
    }
    await this.enqueue(payload);
  }
}
