/**
 * Queue names — see the BullMQ queue contract in the implementation plan.
 * TRANSCRIPT_GENERATION: we produce, the third-party STT vendor's own worker consumes.
 * TRANSCRIPT_READY: the STT vendor produces (transcript only, no scores), we consume.
 * EVALUATION_PROCESSING: fully internal — our own producer/consumer, runs our LLM-based
 *   evaluation (resume × JD × transcript). The vendor never touches this queue.
 */
export const QUEUE_NAMES = {
  TRANSCRIPT_GENERATION: 'transcript-generation',
  TRANSCRIPT_READY: 'transcript-ready',
  EVALUATION_PROCESSING: 'evaluation-processing',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
