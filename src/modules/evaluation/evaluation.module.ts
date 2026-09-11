import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@module/activity';
import { Candidate } from '@module/candidates/entities';
import { Interview } from '@module/interviews/entities';
import { NotificationsModule } from '@module/notifications';
import { OrganizationSettings } from '@module/organizations/entities';
import { InterviewTranscript } from '@module/transcript-ingestion/entities';
import { QueueModule } from '@core/queue';
import { InterviewQuestionAnalysis, InterviewSummary } from './entities';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { EvaluationProcessingProcessor } from './processors/evaluation-processing.processor';

/**
 * Owns the resume × job description × transcript evaluation — entirely our own LLM
 * call, run off the internal `evaluation-processing` queue. Imports entities from
 * `interviews`/`transcript-ingestion`/`candidates`/`organizations` directly (not their
 * modules) to avoid a circular dependency, same pattern as `InterviewSessionModule`.
 * `Interview`'s `questions` relation is resolved via global entity metadata
 * (`autoLoadEntities`), so `InterviewQuestion` doesn't need its own repository
 * registered here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Interview,
      InterviewTranscript,
      InterviewSummary,
      InterviewQuestionAnalysis,
      Candidate,
      OrganizationSettings,
    ]),
    QueueModule,
    ActivityModule,
    NotificationsModule,
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService, EvaluationProcessingProcessor],
  exports: [EvaluationService],
})
export class EvaluationModule {}
