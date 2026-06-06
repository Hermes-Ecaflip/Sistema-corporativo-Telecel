// =============================================================================
// TELECEL SYSTEM — common/filters/http-exception.filter.ts
// Filtro global de exceções: padroniza todas as respostas de erro
// =============================================================================

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: any = null;

    // ── Exceções HTTP do NestJS ────────────────────────────────────────────
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        // ValidationPipe retorna array de erros
        if (Array.isArray(resp.message)) {
          errors = resp.message;
          message = 'Dados inválidos. Verifique os campos e tente novamente.';
        }
      }
    }

    // ── Erros do Prisma ────────────────────────────────────────────────────
    else if (exception instanceof PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': // Unique constraint violation
          status = HttpStatus.CONFLICT;
          const field = (exception.meta?.target as string[])?.join(', ');
          message = field
            ? `Valor duplicado no campo: ${field}`
            : 'Registro já existe';
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'Registro não encontrado';
          break;
        case 'P2003': // Foreign key constraint
          status = HttpStatus.BAD_REQUEST;
          message = 'Referência inválida — registro relacionado não encontrado';
          break;
        case 'P2014': // Required relation violation
          status = HttpStatus.BAD_REQUEST;
          message = 'Violação de integridade relacional';
          break;
        default:
          this.logger.error(
            `Prisma Error ${exception.code}: ${exception.message}`,
            exception.stack,
          );
      }
    }

    // ── Erros desconhecidos ────────────────────────────────────────────────
    else {
      this.logger.error(
        `Unhandled Exception [${request.method} ${request.url}]: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
    }

    // ── Resposta padronizada ───────────────────────────────────────────────
    response.status(status).json({
      statusCode: status,
      message,
      errors,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }
}
