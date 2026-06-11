// =============================================================================
// TELECEL SYSTEM — main.ts
// Bootstrap da aplicação NestJS com segurança enterprise completa
// =============================================================================

import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  Logger,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import { IoAdapter } from '@nestjs/platform-socket.io';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { WinstonLogger } from './config/logger.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // ─── Criação da aplicação ──────────────────────────────────────────────────
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonLogger,   // Logger personalizado com Winston
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const frontendUrl = configService.get<string>('app.frontendUrl', 'http://localhost:3000');

  // ─── WebSocket Adapter ─────────────────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // ─── Prefixo global da API ─────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── Versionamento ────────────────────────────────────────────────────────
  app.enableVersioning({
    type: VersioningType.URI,     // /api/v1/...
    defaultVersion: '1',
  });

  // ─── Helmet — Headers de segurança HTTP ───────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", frontendUrl],
        },
      },
      crossOriginEmbedderPolicy: false, // Necessário para Swagger UI
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // ─── Compressão de resposta ────────────────────────────────────────────────
  app.use(compression());

  // ─── Cookie Parser ─────────────────────────────────────────────────────────
  const cookieSecret = configService.get<string>('app.cookieSecret');
  app.use(cookieParser(cookieSecret));

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      // Lista de origens permitidas
      const allowedOrigins = configService
        .get<string>('app.corsOrigins', frontendUrl)
        .split(',')
        .map((o) => o.trim());

      // Permitir requisições sem origin (ex: Postman em dev) somente fora de prod
      if (!origin && nodeEnv !== 'production') {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' não permitida`));
      }
    },
    credentials: true,            // Permitir cookies cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400,                // Cache preflight por 24h
  });

  // ─── Trustar proxy reverso (Nginx) ─────────────────────────────────────────
  app.set('trust proxy', 1);

  // ─── Validação global ──────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Remove campos não declarados no DTO
      forbidNonWhitelisted: true, // Rejeita requests com campos extras
      transform: true,            // Transforma tipos automaticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: nodeEnv === 'production', // Ocultar detalhes em prod
    }),
  );

  // ─── Interceptors globais ─────────────────────────────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector), // Aplica @Exclude() dos DTOs
    new TransformInterceptor(),                // Padroniza formato de resposta
    new LoggingInterceptor(),                  // Log de todas as requisições
  );

  // ─── Filtro global de exceções ─────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Swagger / OpenAPI ─────────────────────────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TELECEL System API')
      .setDescription(
        `API REST do Sistema Corporativo TELECEL — parceira credenciada TIM.\n\n` +
        `**Autenticação:** JWT Bearer Token\n\n` +
        `**Base URL:** /api/v1\n\n` +
        `**Ambientes:** development | production`,
      )
      .setVersion('1.0.0')
      .setContact('TELECEL Dev Team', 'https://telecel.com.br', 'dev@telecel.com.br')
      .setLicense('Proprietária', 'https://telecel.com.br')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Insira o JWT token',
          in: 'header',
        },
        'access-token',
      )
      .addCookieAuth('refresh_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
        description: 'Refresh Token (cookie httpOnly)',
      })
      .addTag('auth', 'Autenticação e autorização')
      .addTag('users', 'Gestão de usuários')
      .addTag('clients', 'Gestão de clientes')
      .addTag('products', 'Catálogo de produtos TIM')
      .addTag('sales', 'Registro e aprovação de vendas')
      .addTag('commissions', 'Comissões e regras')
      .addTag('financial', 'Financeiro e fechamento')
      .addTag('reports', 'Relatórios e exportações')
      .addTag('dashboard', 'Métricas e indicadores')
      .addTag('notifications', 'Notificações')
      .addTag('uploads', 'Upload de documentos')
      .addTag('health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'TELECEL API Docs',
    });

    logger.log(`📚 Swagger disponível em: http://localhost:${port}/api/docs`);
  }

  // ─── Health check e métricas: ver HealthModule (/health e /api/v1/metrics) ───

  // ─── Inicialização ─────────────────────────────────────────────────────────
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 TELECEL API rodando na porta ${port} [${nodeEnv.toUpperCase()}]`);
  logger.log(`🌐 API URL: http://localhost:${port}/api/v1`);

  if (nodeEnv !== 'production') {
    logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason: Error) => {
  const logger = new Logger('UnhandledRejection');
  logger.error(`Unhandled Rejection: ${reason?.message}`, reason?.stack);
});

process.on('uncaughtException', (error: Error) => {
  const logger = new Logger('UncaughtException');
  logger.error(`Uncaught Exception: ${error.message}`, error.stack);
  process.exit(1);
});

bootstrap();
