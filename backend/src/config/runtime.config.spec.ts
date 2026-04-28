import {
  buildDataSourceOptions,
  buildCorsOptions,
  buildTypeOrmOptions,
  getJwtSecret,
  isSelfRegistrationAllowed,
} from './runtime.config';

describe('runtime configuration', () => {
  const productionEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'production',
    DB_HOST: 'postgres',
    DB_PORT: '5432',
    DB_USERNAME: 'rate_user',
    DB_PASSWORD: 'rate_password',
    DB_NAME: 'rate_db',
    JWT_SECRET: 'production-secret',
    CORS_ORIGINS: 'https://gtp.example, https://rate.example',
  };

  it('uses explicit CORS origins in production', () => {
    const options = buildCorsOptions(productionEnv);

    expect(options.origin).toEqual(['https://gtp.example', 'https://rate.example']);
    expect(options.credentials).toBe(true);
  });

  it('rejects production startup without explicit CORS origins', () => {
    const { CORS_ORIGINS: _corsOrigins, ...env } = productionEnv;

    expect(() => buildCorsOptions(env)).toThrow('CORS_ORIGINS is required in production');
  });

  it('never enables TypeORM synchronize in production', () => {
    const options = buildTypeOrmOptions({
      ...productionEnv,
      DB_SYNCHRONIZE: 'true',
    });

    expect(options.synchronize).toBe(false);
    expect(options).toMatchObject({
      host: 'postgres',
      port: 5432,
    });
  });

  it('accepts docker env aliases for local migration commands', () => {
    const options = buildTypeOrmOptions({
      NODE_ENV: 'production',
      RATE_DB_HOST: 'localhost',
      RATE_DB_PORT: '5433',
      RATE_DB_USERNAME: 'rate_user',
      RATE_DB_PASSWORD: 'rate_password',
      RATE_DB_NAME: 'rate_db',
    });

    expect(options).toMatchObject({
      host: 'localhost',
      port: 5433,
      username: 'rate_user',
      password: 'rate_password',
      database: 'rate_db',
    });
  });

  it('rejects production startup without a real JWT secret', () => {
    const { JWT_SECRET: _jwtSecret, ...env } = productionEnv;

    expect(() => getJwtSecret(env)).toThrow('JWT_SECRET is required in production');
  });

  it('exposes migration paths for the TypeORM data source', () => {
    const options = buildDataSourceOptions(productionEnv);

    expect(options.synchronize).toBe(false);
    expect(options.migrations).toEqual([expect.stringContaining('/migrations/*')]);
  });

  it('disables self-registration by default in production', () => {
    expect(isSelfRegistrationAllowed(productionEnv)).toBe(false);
  });

  it('allows self-registration only when explicitly enabled outside production', () => {
    expect(
      isSelfRegistrationAllowed({
        NODE_ENV: 'development',
        ALLOW_SELF_REGISTRATION: 'true',
      }),
    ).toBe(true);
  });
});
