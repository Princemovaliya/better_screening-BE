import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@module/activity';
import { Candidate } from '@module/candidates/entities';
import { InterviewSummary } from '@module/evaluation/entities';
import { Interview } from '@module/interviews/entities';
import { Job } from '@module/jobs/entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/** Read-only aggregates over existing tables — no entities of its own. Imports
 * entities directly from their owning modules (not the modules themselves) to avoid
 * circularity, same pattern used throughout. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Candidate, Interview, InterviewSummary]),
    ActivityModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
