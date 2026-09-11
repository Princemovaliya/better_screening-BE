/**
 * Cross-module BullMQ job payload contracts — see the queue contract in the
 * implementation plan (§2.5). These are shared by producers/consumers on both sides
 * of a queue, so they live in `core/queue` rather than inside any one feature module.
 */

/** We produce this; the third-party STT vendor's own worker consumes it. Deliberately
 * carries no resume/JD data — the vendor's only job is speech-to-text. `questionText`
 * is included only as optional context for the transcriber, not for evaluation. */
export interface TranscriptGenerationJobPayload {
  interviewId: string;
  candidateId: string;
  organizationId: string;
  questions: {
    questionId: string;
    orderIndex: number;
    questionText: string;
    mediaUrl: string;
    mediaMimeType: string;
    durationSeconds?: number;
  }[];
  callbackQueue: 'transcript-ready';
  requestedAt: string;
}

/** The STT vendor produces this once transcription finishes; we consume it. Carries
 * the transcript only — never a score. */
export interface TranscriptReadyJobPayload {
  interviewId: string;
  candidateId: string;
  organizationId: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  transcript?: {
    combinedText: string;
    perQuestion: { questionId: string; transcriptText: string }[];
    language?: string;
  };
  processedAt: string;
  aiServiceJobId?: string;
}

/** Fully internal — our own producer, our own consumer. The STT vendor never sees
 * this queue. Deliberately minimal: the EvaluationModule consumer loads everything
 * else itself from Postgres (job/resume/transcript/questions) keyed off these ids. */
export interface EvaluationProcessingJobPayload {
  interviewId: string;
  candidateId: string;
  organizationId: string;
}
