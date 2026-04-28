import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

const DEFAULT_JWT_SECRET = 'your-secret-key-change-in-production';

function isProduction(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === 'production';
}

function requireProductionValue(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (isProduction(env) && (!value || value.trim().length === 0)) {
    throw new Error(`${key} is required in production`);
  }
  return value || '';
}

function getEnvValue(env: NodeJS.ProcessEnv, key: string, fallbackKey?: string): string | undefined {
  return env[key] || (fallbackKey ? env[fallbackKey] : undefined);
}

function requireProductionDatabaseValue(
  env: NodeJS.ProcessEnv,
  key: string,
  fallbackKey: string,
): string {
  const value = getEnvValue(env, key, fallbackKey);
  if (isProduction(env) && (!value || value.trim().length === 0)) {
    throw new Error(`${key} or ${fallbackKey} is required in production`);
  }
  return value || '';
}

function parsePort(value: string | undefined): number {
  const parsed = parseInt(value || '5432', 10);
  if (Number.isNaN(parsed)) {
    throw new Error('DB_PORT must be a number');
  }
  return parsed;
}

function parseOrigins(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function buildCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  const origins = parseOrigins(env.CORS_ORIGINS);
  if (isProduction(env) && origins.length === 0) {
    throw new Error('CORS_ORIGINS is required in production');
  }

  return {
    origin: origins.length > 0 ? origins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  };
}

export function buildTypeOrmOptions(env: NodeJS.ProcessEnv = process.env): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: requireProductionDatabaseValue(env, 'DB_HOST', 'RATE_DB_HOST') || 'localhost',
    port: parsePort(getEnvValue(env, 'DB_PORT', 'RATE_DB_PORT')),
    username: requireProductionDatabaseValue(env, 'DB_USERNAME', 'RATE_DB_USERNAME') || 'postgres',
    password: requireProductionDatabaseValue(env, 'DB_PASSWORD', 'RATE_DB_PASSWORD') || 'postgres',
    database: requireProductionDatabaseValue(env, 'DB_NAME', 'RATE_DB_NAME') || 'personnel_saas',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: isProduction(env) ? false : env.DB_SYNCHRONIZE !== 'false',
    logging: !isProduction(env),
  };
}

export function buildDataSourceOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  return {
    ...(buildTypeOrmOptions(env) as DataSourceOptions),
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  };
}

export function getJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET || DEFAULT_JWT_SECRET;
  if (isProduction(env) && secret === DEFAULT_JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production');
  }
  return secret;
}

export function isSelfRegistrationAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isProduction(env) && env.ALLOW_SELF_REGISTRATION === 'true';
}
