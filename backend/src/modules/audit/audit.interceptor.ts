import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Request } from 'express';

interface JwtUser {
  userId?: string;
  sub?: string;
  username?: string;
  role?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtUser | undefined;
    const method = request.method;
    const path = request.route?.path || request.path;

    if (!user || !path.includes('/api/')) {
      return next.handle();
    }

    const entityType = this.extractEntityType(path);
    if (!entityType) {
      return next.handle();
    }

    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!isMutation) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const action = this.getAction(method, response);
          const entityId = response?.id || request.params?.id || 'unknown';

          await this.auditService.logChange(
            entityType,
            entityId,
            action,
            {
              method,
              path,
              body: this.sanitizeBody(request.body),
            },
            user.userId || user.sub || user.username || 'unknown',
            request.ip,
            request.get('user-agent'),
          );
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      }),
    );
  }

  private extractEntityType(path: string): string | null {
    const patterns = [
      { pattern: /\/users/, entity: 'User' },
      { pattern: /\/personnel/, entity: 'Personnel' },
      { pattern: /\/projects/, entity: 'Project' },
      { pattern: /\/participation/, entity: 'Participation' },
      { pattern: /\/documents/, entity: 'Document' },
      { pattern: /\/regulations/, entity: 'Regulation' },
    ];

    for (const { pattern, entity } of patterns) {
      if (pattern.test(path)) {
        return entity;
      }
    }

    return null;
  }

  private getAction(method: string, response: any): 'CREATE' | 'UPDATE' | 'DELETE' {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }

  private sanitizeBody(body: any): Record<string, any> {
    if (!body) return {};
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
