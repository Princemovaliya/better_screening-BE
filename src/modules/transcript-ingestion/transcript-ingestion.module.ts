import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueModule } from '@core/queue';
import { Interview } from '@module/interviews/entities';
import { InterviewAnswer } from '@module/interview-session/entities';
import { InterviewTranscript } from './entities';
import { TranscriptGenerationProducerService } from './producers/transcript-generation.producer';
import { EvaluationProcessingProducerService } from './producers/evaluation-processing.producer';
import { TranscriptReadyProcessor } from './processors/transcript-ready.processor';

/**
 * The STT hand-off boundary: produces `transcript-generation` jobs for the third-party
 * vendor's own worker, consumes `transcript-ready` jobs it sends back, and forwards to
 * the fully-internal `evaluation-processing` queue once a transcript is persisted.
 *
 * Imports entities from `interviews`/`interview-session` directly (not their modules)
 * to avoid a circular dependency — same pattern as `InterviewSessionModule`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Interview, InterviewAnswer, InterviewTranscript]),
    QueueModule,
  ],
  providers: [
    TranscriptGenerationProducerService,
    EvaluationProcessingProducerService,
    TranscriptReadyProcessor,
  ],
  exports: [TranscriptGenerationProducerService, EvaluationProcessingProducerService],
})
export class TranscriptIngestionModule {}
