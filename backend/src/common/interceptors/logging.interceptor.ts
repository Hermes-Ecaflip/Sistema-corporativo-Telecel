// =============================================================================
// TELECEL SYSTEM — common/interceptors/logging.interceptor.ts
// Loga método, URL, status e tempo de resposta de cada requisição
// =============================================================================

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') ?? '';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        this.logger.log(`${method} ${url} ${statusCode} ${duration}ms — ${ip} "${userAgent}"`);
        if (duration > 2000) {
          this.logger.warn(`⚠️  Resposta lenta: ${method} ${url} demorou ${duration}ms`);
        }
      }),
    );
  }
}
