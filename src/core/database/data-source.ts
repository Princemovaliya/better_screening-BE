import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadEnv, getEnv, getEnvNumber, getEnvBoolean } from '@config/env';

// Used by the TypeORM CLI (migration:generate/run/revert) — kept separate from the
// NestJS-managed connection in database.module.ts, which is what the running app uses.
loadEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: getEnv('DB_HOST', 'localhost'),
  port: getEnvNumber('DB_PORT', 5432),
  username: getEnv('DB_USERNAME', 'postgres'),
  password: getEnv('DB_PASSWORD', 'postgres'),
  database: getEnv('DB_NAME', 'better_screening'),
  ssl: getEnvBoolean('DB_SSL', false),
  synchronize: false,
  entities: [__dirname + '/../../modules/**/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});
