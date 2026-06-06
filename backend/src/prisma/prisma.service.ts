// =============================================================================
// TELECEL SYSTEM — prisma.service.ts
// Serviço Prisma com soft delete automático, auditoria e query logging
// =============================================================================

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('database.url'),
        },
      },
      // Log de queries em desenvolvimento
      log:
        configService.get<string>('app.nodeEnv') === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'info' },
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' },
            ]
          : [
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' },
            ],
      errorFormat: 'colorless',
    });

    // Registrar eventos de log do Prisma no Winston
    this.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > 1000) {
        // Log queries lentas (> 1s)
        this.logger.warn(
          `🐢 Query lenta (${e.duration}ms): ${e.query.substring(0, 200)}`,
        );
      }
    });

    this.$on('error' as never, (e: Prisma.LogEvent) => {
      this.logger.error(`Prisma Error: ${e.message}`, e.target);
    });

    this.$on('warn' as never, (e: Prisma.LogEvent) => {
      this.logger.warn(`Prisma Warning: ${e.message}`);
    });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('✅ Conectado ao PostgreSQL via Prisma');

      // Aplicar middlewares após a conexão
      this.applyMiddlewares();
    } catch (error) {
      this.logger.error('❌ Falha ao conectar ao PostgreSQL', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('🔌 Desconectado do PostgreSQL');
  }

  // ─── Middlewares do Prisma ───────────────────────────────────────────────
  private applyMiddlewares(): void {
    // ── Middleware de Soft Delete ──────────────────────────────────────────
    // Intercepta findMany/findFirst/findUnique para ignorar registros deletados
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      // Models que suportam soft delete (possuem campo deletedAt)
      const softDeleteModels = [
        'User',
        'Client',
        'Product',
        'Sale',
        'Commission',
        'CommissionRule',
        'Company',
        'Store',
      ];

      if (softDeleteModels.includes(params.model as string)) {
        // Filtrar registros não deletados em buscas
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          params.action = 'findFirst';
          params.args.where = {
            ...params.args.where,
            deletedAt: null,
          };
        }

        if (params.action === 'findMany') {
          if (params.args.where) {
            // Respeitar filtro explícito de deletedAt (ex: buscar deletados)
            if (params.args.where.deletedAt === undefined) {
              params.args.where.deletedAt = null;
            }
          } else {
            params.args = { ...params.args, where: { deletedAt: null } };
          }
        }

        // Redirecionar delete para update com deletedAt
        if (params.action === 'delete') {
          params.action = 'update';
          params.args.data = { deletedAt: new Date() };
        }

        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          if (params.args.data !== undefined) {
            params.args.data.deletedAt = new Date();
          } else {
            params.args.data = { deletedAt: new Date() };
          }
        }
      }

      return next(params);
    });

    // ── Middleware de timestamps automáticos ───────────────────────────────
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      if (params.action === 'create') {
        // Garante que createdAt e updatedAt estejam presentes
        if (params.args.data) {
          params.args.data.createdAt = params.args.data.createdAt ?? new Date();
          params.args.data.updatedAt = new Date();
        }
      }

      if (params.action === 'update' || params.action === 'updateMany') {
        if (params.args.data) {
          params.args.data.updatedAt = new Date();
        }
      }

      return next(params);
    });
  }

  // ─── Utilitários ────────────────────────────────────────────────────────

  /**
   * Verificar se o banco está acessível (usado no health check)
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Executar queries dentro de uma transação gerenciada
   * Faz rollback automático em caso de erro
   */
  async runInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn, {
      maxWait: 5000,    // Máximo de espera para adquirir transação (5s)
      timeout: 30000,  // Timeout da transação (30s)
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }

  /**
   * Paginação padronizada — retorna dados + metadados
   */
  async paginate<T>(
    model: any,
    args: {
      where?: Record<string, any>;
      orderBy?: Record<string, any> | Record<string, any>[];
      include?: Record<string, any>;
      select?: Record<string, any>;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: T[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = Math.max(1, args.page ?? 1);
    const limit = Math.min(100, Math.max(1, args.limit ?? 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      model.findMany({
        where: args.where,
        orderBy: args.orderBy,
        include: args.include,
        select: args.select,
        skip,
        take: limit,
      }),
      model.count({ where: args.where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
