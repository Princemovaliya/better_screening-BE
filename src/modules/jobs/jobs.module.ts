import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@module/activity';
import { InterviewRoundQuestion, InterviewRoundTemplate, Job, JobSkill } from './entities';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobSkill, InterviewRoundTemplate, InterviewRoundQuestion]),
    ActivityModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
