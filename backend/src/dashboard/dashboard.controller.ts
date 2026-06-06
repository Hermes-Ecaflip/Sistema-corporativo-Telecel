// =============================================================================
// TELECEL SYSTEM — dashboard/dashboard.controller.ts
// Controller do Dashboard: KPIs, ranking, gráficos e metas
// =============================================================================

import {
  Controller, Get, Post, Patch,
  Body, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { DashboardService } from './dashboard.service';
import {
  DashboardQueryDto,
  CreateGoalDto,
  UpdateGoalDto,
} from './dto/dashboard.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ─── VISÃO GERAL (KPIs) ────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({
    summary: 'KPIs principais do período',
    description: 'Vendas, receita, comissões, taxa de aprovação. Vendedor vê apenas os próprios números.',
  })
  getOverview(
    @Query() query: DashboardQueryDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.dashboardService.getOverview(companyId, query, { id: userId, role });
  }

  // ─── RANKING DE VENDEDORES ─────────────────────────────────────────────

  @Get('ranking')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.FINANCEIRO)
  @ApiOperation({ summary: 'Ranking de vendedores por receita (Top 10)' })
  getRanking(
    @Query() query: DashboardQueryDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.dashboardService.getSellerRanking(companyId, query);
  }

  // ─── TENDÊNCIA DE VENDAS (gráfico de linha) ────────────────────────────

  @Get('sales-trend')
  @ApiOperation({ summary: 'Vendas e receita por dia no período (gráfico de linha)' })
  getSalesTrend(
    @Query() query: DashboardQueryDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.dashboardService.getSalesTrend(companyId, query, { id: userId, role });
  }

  // ─── VENDAS POR CATEGORIA (gráfico de pizza) ───────────────────────────

  @Get('sales-by-category')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.FINANCEIRO)
  @ApiOperation({ summary: 'Distribuição de vendas por categoria de produto' })
  getSalesByCategory(
    @Query() query: DashboardQueryDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.dashboardService.getSalesByCategory(companyId, query);
  }

  // ─── PROGRESSO DAS METAS ───────────────────────────────────────────────

  @Get('goals/:month')
  @ApiOperation({
    summary: 'Progresso das metas do mês',
    description: 'Meta vs. realizado, com %. Vendedor vê apenas as próprias metas.',
  })
  @ApiParam({ name: 'month', example: '2025-08', description: 'Mês AAAA-MM' })
  getGoalsProgress(
    @Param('month') month: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.dashboardService.getGoalsProgress(companyId, month, { id: userId, role });
  }

  // ─── DEFINIR META ──────────────────────────────────────────────────────

  @Post('goals')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Definir meta (empresa, loja ou vendedor) [ADMIN, SUPERVISOR]',
    description: 'Tipos: REVENUE (receita R$) ou SALES_COUNT (qtd. vendas).',
  })
  @ApiResponse({ status: 201, description: 'Meta criada' })
  @ApiResponse({ status: 409, description: 'Meta já existe para o período/alvo' })
  createGoal(
    @Body() dto: CreateGoalDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dashboardService.createGoal(dto, companyId, userId);
  }

  // ─── ATUALIZAR META ────────────────────────────────────────────────────

  @Patch('goals/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Atualizar valor da meta [ADMIN, SUPERVISOR]' })
  @ApiParam({ name: 'id', description: 'UUID da meta' })
  updateGoal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dashboardService.updateGoal(id, companyId, dto, userId);
  }
}
