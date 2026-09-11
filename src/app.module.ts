import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from '@core/database';
import { JwtCoreModule } from '@core/jwt';
import { LlmModule } from '@core/llm';
import { MailModule } from '@core/mail';
import { QueueModule } from '@core/queue';
import { StorageModule } from '@core/storage';
import { ActivityModule } from '@module/activity';
import { AuthModule } from '@module/auth';
import { CandidatesModule } from '@module/candidates';
import { DashboardModule } from '@module/dashboard';
import { EmailComposerModule } from '@module/email-composer';
import { EvaluationModule } from '@module/evaluation';
import { InterviewSessionModule } from '@module/interview-session';
import { InterviewsModule } from '@module/interviews';
import { JobsModule } from '@module/jobs';
import { NotificationsModule } from '@module/notifications';
import { OrganizationsModule } from '@module/organizations';
import { TranscriptIngestionModule } from '@module/transcript-ingestion';
import { UsersModule } from '@module/users';

@Module({
  imports: [
    DatabaseModule,
    JwtCoreModule,
    LlmModule,
    MailModule,
    QueueModule,
    StorageModule,
    ActivityModule,
    NotificationsModule,
    OrganizationsModule,
    UsersModule,
    AuthModule,
    JobsModule,
    CandidatesModule,
    InterviewsModule,
    InterviewSessionModule,
    TranscriptIngestionModule,
    EvaluationModule,
    EmailComposerModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
