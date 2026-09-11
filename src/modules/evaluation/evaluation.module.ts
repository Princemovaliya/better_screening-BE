import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from '@module/candidates/entities';
import { Interview } from '@module/interviews/entities';
import { InterviewTranscript } from '@module/transcript-ingestion/entities';
import { QueueModule } from '@core/queue';
import { InterviewQuestionAnalysis, InterviewSummary } from './entities';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { EvaluationProcessingProcessor } from './processors/evaluation-processing.processor';

/**
 * Owns the resume × job description × transcript evaluation — entirely our own LLM
 * call, run off the internal `evaluation-processing` queue. Imports entities from
 * `interviews`/`transcript-ingestion`/`candidates` directly (not their modules) to
 * avoid a circular dependency, same pattern as `InterviewSessionModule`. `Interview`'s
 * `questions` relation is resolved via global entity metadata (`autoLoadEntities`),
 * so `InterviewQuestion` doesn't need its own repository registered here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Interview,
      InterviewTranscript,
      InterviewSummary,
      InterviewQuestionAnalysis,
      Candidate,
    ]),
    QueueModule,
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService, EvaluationProcessingProcessor],
  exports: [EvaluationService],
})
export class EvaluationModule {}
