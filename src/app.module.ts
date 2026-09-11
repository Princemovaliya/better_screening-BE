import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from '@core/database';
import { JwtCoreModule } from '@core/jwt';
import { MailModule } from '@core/mail';
import { QueueModule } from '@core/queue';
import { AuthModule } from '@module/auth';
import { CandidatesModule } from '@module/candidates';
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
    OrganizationsModule,
    UsersModule,
    AuthModule,
    JobsModule,
    CandidatesModule,
    InterviewsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
