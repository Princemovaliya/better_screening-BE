import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getEnv, getEnvBoolean, getEnvNumber } from '@config/env';

/**
 * Global so every feature module can inject its repositories via
 * `TypeOrmModule.forFeature([...])` without re-importing connection config.
 * Migrations only — synchronize is always false, schema changes go through
 * `npm run migration:generate` / `migration:run`.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: getEnv('DB_HOST', 'localhost'),
        port: getEnvNumber('DB_PORT', 5432),
        username: getEnv('DB_USERNAME', 'postgres'),
        password: getEnv('DB_PASSWORD', 'postgres'),
        database: getEnv('DB_NAME', 'better_screening'),
        ssl: getEnvBoolean('DB_SSL', false),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
