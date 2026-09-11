import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES, EvaluationProcessingJobPayload } from '@core/queue';
import { EvaluationService } from '../evaluation.service';

/** Consumes the fully-internal `evaluation-processing` queue. Errors (LLM failure,
 * malformed JSON, failed validation) are left to throw — BullMQ retries per the
 * producer's attempts/backoff config, independently of transcript ingestion. */
@Processor(QUEUE_NAMES.EVALUATION_PROCESSING)
export class EvaluationProcessingProcessor extends WorkerHost {
  constructor(private readonly evaluationService: EvaluationService) {
    super();
  }

  async process(job: Job<EvaluationProcessingJobPayload>): Promise<void> {
    await this.evaluationService.evaluate(job.data.interviewId);
  }
}
