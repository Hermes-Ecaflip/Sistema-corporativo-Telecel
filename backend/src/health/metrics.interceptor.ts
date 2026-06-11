// =============================================================================
// TELECEL SYSTEM — health/metrics.interceptor.ts
// Mede automaticamente cada requisição HTTP e alimenta o MetricsService.
// =============================================================================

import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const start = Date.now();

    // Usa a rota declarada (com placeholders) para evitar explosão de cardinalidade
    const route = req.route?.path ?? req.url?.split('?')[0] ?? 'unknown';
    const method = req.method;

    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse();
          this.metrics.record(method, route, res.statusCode ?? 200, Date.now() - start);
        },
        error: (err) => {
          const status = err?.status ?? 500;
          this.metrics.record(method, route, status, Date.now() - start);
        },
      }),
    );
  }
}
