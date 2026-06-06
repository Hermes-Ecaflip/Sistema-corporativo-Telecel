// =============================================================================
// TELECEL SYSTEM — src/app.module.ts
// Módulo raiz: amarra todos os módulos de funcionalidade + infraestrutura
// =============================================================================

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';

// Infra
import { PrismaModule } from './prisma/prisma.module';

// Configs
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import s3Config from './config/s3.config';
import mailConfig from './config/mail.config';

// Módulos de funcionalidade (Módulos 3 a 12)
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { CommissionsModule } from './commissions/commissions.module';
import { FinancialModule } from './financial/financial.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuditModule } from './audit/audit.module';

// Guards, interceptors, filters globais
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor, LoggingInterceptor } from './common/interceptors/index';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditInterceptor } from './audit/audit.interceptor';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    // Configuração global com validação Joi de variáveis de ambiente
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, redisConfig, s3Config, mailConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        S3_BUCKET: Joi.string().optional(),
        MAIL_HOST: Joi.string().optional(),
      }),
    }),

    // Rate limiting em 3 níveis
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },     // 10 req/seg
      { name: 'medium', ttl: 60000, limit: 100 },  // 100 req/min
      { name: 'long', ttl: 900000, limit: 500 },   // 500 req/15min
    ]),

    // Infraestrutura
    PrismaModule,

    // Funcionalidades
    AuthModule,
    UsersModule,
    ClientsModule,
    ProductsModule,
    SalesModule,
    CommissionsModule,
    FinancialModule,
    ReportsModule,
    NotificationsModule,
    DashboardModule,
    UploadsModule,
    AuditModule,
  ],
  providers: [
    // Guard global de autenticação (JWT) — protege tudo exceto @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Guard global de RBAC — valida @Roles()
    { provide: APP_GUARD, useClass: RolesGuard },
    // Guard global de rate limiting
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Interceptors globais
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },

    // Filtro global de exceções
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Middleware de log em todas as rotas
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
