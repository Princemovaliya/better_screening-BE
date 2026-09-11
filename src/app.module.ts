import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from '@core/database';
import { JwtCoreModule } from '@core/jwt';
import { MailModule } from '@core/mail';
import { QueueModule } from '@core/queue';
import { AuthModule } from '@module/auth';
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
  ],
  controllers: [AppController],
})
export class AppModule {}
