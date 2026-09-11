import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { getEnv } from '@config/env';

/**
 * Global so `JwtService` — and any passport-jwt strategy built on top of it — is
 * injectable from any feature module without that module importing AuthModule
 * directly (avoids circular module imports between Auth and everything it guards).
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getEnv('JWT_SECRET'),
        signOptions: { expiresIn: getEnv('JWT_EXPIRES_IN', '7d') as unknown as number },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtCoreModule {}
