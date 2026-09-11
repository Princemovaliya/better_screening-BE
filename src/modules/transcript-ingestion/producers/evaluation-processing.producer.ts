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
}
