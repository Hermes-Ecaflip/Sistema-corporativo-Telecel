// =============================================================================
// TELECEL SYSTEM — audit/audit.service.ts
// Serviço de auditoria: registra operações sensíveis no banco
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

export interface AuditLogInput {
  userId?: string;
  companyId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  description?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra um evento de auditoria de forma assíncrona (fire-and-forget).
   * Falhas de auditoria não devem impedir a operação principal.
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          companyId: input.companyId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          oldValues: input.oldValues ?? undefined,
          newValues: input.newValues ?? undefined,
          ip: input.ip?.substring(0, 45) ?? null,
          userAgent: input.userAgent?.substring(0, 500) ?? null,
          description: input.description ?? null,
        },
      });
    } catch (err) {
      // Log de falha de auditoria — nunca propagar o erro
      this.logger.error(
        `Falha ao registrar auditoria [${input.action} ${input.entity}]: ${err.message}`,
      );
    }
  }

  /**
   * Cria um diff entre dois objetos (oldValues vs newValues).
   * Remove campos sensíveis antes de registrar.
   */
  createDiff(
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
    sensitiveFields = ['password', 'twoFactorSecret', 'token'],
  ): { old: Record<string, any>; new: Record<string, any> } {
    const changed: Record<string, any> = {};
    const oldChanged: Record<string, any> = {};

    for (const key of Object.keys(newObj)) {
      if (sensitiveFields.includes(key)) continue;
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        oldChanged[key] = oldObj[key];
        changed[key] = newObj[key];
      }
    }

    return { old: oldChanged, new: changed };
  }
}
