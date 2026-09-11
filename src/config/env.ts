import { config as loadDotenv } from 'dotenv';
import * as path from 'path';

export enum AvailableEnv {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
  Production = 'production',
}

class EnvError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`);
    this.name = 'EnvError';
  }
}

/** Must be called at the very top of main.ts, before AppModule (or anything using
 * decorators that read env at import time) is imported. */
export function loadEnv(): void {
  const envFile =
    (process.env.NODE_ENV as AvailableEnv) === AvailableEnv.Test ? '.env.test' : '.env';
  loadDotenv({ path: path.resolve(process.cwd(), envFile) });
}

export function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new EnvError(name);
  }
  return value;
}

export function getEnvNumber(name: string, defaultValue?: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new EnvError(name);
  }
  const n = Number(raw);
  if (Number.isNaN(n)) throw new EnvError(`${name} (not a number)`);
  return n;
}

export function getEnvBoolean(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  return raw === 'true' || raw === '1';
}

export function currentEnv(): AvailableEnv {
  return (process.env.NODE_ENV as AvailableEnv) || AvailableEnv.Development;
}
export const isProduction = () => currentEnv() === AvailableEnv.Production;
export const isStaging = () => currentEnv() === AvailableEnv.Staging;
export const isDevelopment = () => currentEnv() === AvailableEnv.Development;
export const isTest = () => currentEnv() === AvailableEnv.Test;
