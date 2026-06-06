// =============================================================================
// TELECEL SYSTEM — common/middleware/logger.middleware.ts
// Middleware de log: registra cada requisição antes de processar
// =============================================================================

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Request');

  use(req: Request, _res: Response, next: NextFunction): void {
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') ?? '';

    this.logger.debug(`→ ${method} ${url} — ${ip} "${userAgent}"`);
    next();
  }
}
