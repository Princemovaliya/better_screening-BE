import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interview, InterviewQuestion } from '@module/interviews/entities';
import { TranscriptIngestionModule } from '@module/transcript-ingestion';
import { InterviewAccessToken, InterviewAnswer } from './entities';
import { CandidateInterviewGuard } from './guards/candidate-interview.guard';
import { InterviewSessionController } from './interview-session.controller';
import { InterviewSessionService } from './interview-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interview, InterviewQuestion, InterviewAccessToken, InterviewAnswer]),
    TranscriptIngestionModule,
  ],
  controllers: [InterviewSessionController],
  providers: [InterviewSessionService, CandidateInterviewGuard],
  exports: [InterviewSessionService],
})
export class InterviewSessionModule {}
