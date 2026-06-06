// =============================================================================
// TELECEL SYSTEM — audit/audit.interceptor.ts
// Interceptor que registra automaticamente operações de escrita
// =============================================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditAction } from '@prisma/client';
import { Request } from 'express';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') ?? '';
    const user = (req as any).user;

    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!writeMethods.includes(method) || !user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        const action = this.resolveAction(method);
        const entity = this.resolveEntity(url);
        if (action && entity && user?.companyId) {
          await this.auditService.log({
            userId: user.id,
            companyId: user.companyId,
            action,
            entity,
            ip,
            userAgent,
            description: `${method} ${url}`,
          });
        }
      }),
    );
  }

  private resolveAction(method: string): AuditAction | null {
    const map: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };
    return map[method] ?? null;
  }

  private resolveEntity(url: string): string {
    const segments = url.split('/').filter(Boolean);
    const resourceIndex = segments.findIndex((s) => s === 'v1') + 1;
    const resource = segments[resourceIndex] ?? 'Unknown';
    return resource.charAt(0).toUpperCase() + resource.slice(1, -1);
  }
}
