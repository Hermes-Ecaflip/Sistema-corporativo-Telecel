// =============================================================================
// TELECEL SYSTEM — health/metrics.service.ts
// Coletor leve de métricas no formato Prometheus (sem dependências externas).
// Registra contagem de requisições, durações e métricas de processo.
// =============================================================================

import { Injectable } from '@nestjs/common';

interface RouteMetric {
  count: number;
  totalDurationMs: number;
  statusCounts: Record<string, number>;
}

@Injectable()
export class MetricsService {
  private readonly routes = new Map<string, RouteMetric>();
  private readonly startTime = Date.now();

  /** Registra uma requisição concluída. */
  record(method: string, route: string, status: number, durationMs: number): void {
    const key = `${method} ${route}`;
    const m = this.routes.get(key) ?? { count: 0, totalDurationMs: 0, statusCounts: {} };
    m.count += 1;
    m.totalDurationMs += durationMs;
    const sKey = String(status);
    m.statusCounts[sKey] = (m.statusCounts[sKey] ?? 0) + 1;
    this.routes.set(key, m);
  }

  /** Renderiza todas as métricas no formato de exposição do Prometheus. */
  render(): string {
    const lines: string[] = [];

    // ── http_requests_total ──
    lines.push('# HELP http_requests_total Total de requisições HTTP');
    lines.push('# TYPE http_requests_total counter');
    for (const [key, m] of this.routes.entries()) {
      const [method, route] = key.split(' ');
      for (const [status, count] of Object.entries(m.statusCounts)) {
        lines.push(
          `http_requests_total{service="api",method="${method}",route="${route}",status="${status}"} ${count}`,
        );
      }
    }

    // ── http_request_duration_seconds (média) ──
    lines.push('# HELP http_request_duration_seconds_avg Duração média das requisições');
    lines.push('# TYPE http_request_duration_seconds_avg gauge');
    for (const [key, m] of this.routes.entries()) {
      const [method, route] = key.split(' ');
      const avg = m.count > 0 ? m.totalDurationMs / m.count / 1000 : 0;
      lines.push(
        `http_request_duration_seconds_avg{service="api",method="${method}",route="${route}"} ${avg.toFixed(4)}`,
      );
    }

    // ── métricas de processo ──
    const mem = process.memoryUsage();
    lines.push('# HELP process_resident_memory_bytes Memória residente do processo');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes{service="api"} ${mem.rss}`);

    lines.push('# HELP process_uptime_seconds Tempo de atividade do processo');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds{service="api"} ${((Date.now() - this.startTime) / 1000).toFixed(0)}`);

    lines.push('# HELP nodejs_heap_used_bytes Heap utilizado pelo Node.js');
    lines.push('# TYPE nodejs_heap_used_bytes gauge');
    lines.push(`nodejs_heap_used_bytes{service="api"} ${mem.heapUsed}`);

    return lines.join('\n') + '\n';
  }
}
