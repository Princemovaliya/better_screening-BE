import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '@module/jobs/entities';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { Candidate, CandidateNote, CandidateSkill } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Candidate, CandidateSkill, CandidateNote, Job])],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
