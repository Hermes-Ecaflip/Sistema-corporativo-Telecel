// =============================================================================
// TELECEL SYSTEM — health/health.controller.ts
// Endpoints de saúde (health check com banco) e métricas Prometheus.
// =============================================================================

import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check com verificação de banco de dados' })
  async health() {
    const dbOk = await this.prisma.isHealthy().catch(() => false);
    return {
      status: dbOk ? 'ok' : 'degraded',
      database: dbOk ? 'up' : 'down',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('api/v1/metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @ApiOperation({ summary: 'Métricas no formato Prometheus' })
  metricsEndpoint(): string {
    return this.metrics.render();
  }
}
