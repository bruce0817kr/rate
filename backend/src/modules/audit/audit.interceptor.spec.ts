import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  it('redacts sensitive request fields before writing audit logs', (done) => {
    const auditService = { logChange: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(auditService as any);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: 'user-1' },
          method: 'POST',
          route: { path: '/api/users' },
          path: '/api/users',
          params: {},
          body: {
            username: 'admin@gtp.or.kr',
            password: 'secret-password',
            token: 'secret-token',
          },
          ip: '127.0.0.1',
          get: () => 'jest-agent',
        }),
      }),
    };
    const next = { handle: () => of({ id: 'created-user' }) };

    interceptor.intercept(context as any, next as any).subscribe({
      complete: () => {
        setImmediate(() => {
          expect(auditService.logChange).toHaveBeenCalledWith(
            'User',
            'created-user',
            'CREATE',
            expect.objectContaining({
              body: expect.objectContaining({
                username: 'admin@gtp.or.kr',
                password: '[REDACTED]',
                token: '[REDACTED]',
              }),
            }),
            'user-1',
            '127.0.0.1',
            'jest-agent',
          );
          done();
        });
      },
    });
  });
});
