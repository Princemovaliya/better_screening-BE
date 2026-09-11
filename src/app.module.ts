import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from '@core/database';
import { JwtCoreModule } from '@core/jwt';
import { MailModule } from '@core/mail';
import { QueueModule } from '@core/queue';
import { StorageModule } from '@core/storage';
import { AuthModule } from '@module/auth';
import { CandidatesModule } from '@module/candidates';
import { InterviewSessionModule } from '@module/interview-session';
import { InterviewsModule } from '@module/interviews';
import { JobsModule } from '@module/jobs';
import { OrganizationsModule } from '@module/organizations';
import { UsersModule } from '@module/users';

@Module({
  imports: [
    DatabaseModule,
    JwtCoreModule,
    MailModule,
    QueueModule,
    StorageModule,
    OrganizationsModule,
    UsersModule,
    AuthModule,
    JobsModule,
    CandidatesModule,
    InterviewsModule,
    InterviewSessionModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
