import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from '@module/candidates/entities';
import { Interview } from '@module/interviews/entities';
import { CandidateEmail } from './entities';
import { EmailComposerController } from './email-composer.controller';
import { EmailComposerService } from './email-composer.service';

/** Imports `Candidate`/`Interview` entities directly (not their modules) — same
 * circularity-avoidance pattern used by `InterviewSessionModule`/`EvaluationModule`. */
@Module({
  imports: [TypeOrmModule.forFeature([Candidate, Interview, CandidateEmail])],
  controllers: [EmailComposerController],
  providers: [EmailComposerService],
  exports: [EmailComposerService],
})
export class EmailComposerModule {}
