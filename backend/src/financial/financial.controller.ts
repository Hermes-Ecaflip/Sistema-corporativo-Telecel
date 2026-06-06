// =============================================================================
// TELECEL SYSTEM — financial/financial.controller.ts
// Controller do Financeiro: fechamentos, movimentos, balanço, evolução
// =============================================================================

import {
  Controller, Get, Post, Patch,
  Body, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { FinancialService } from './financial.service';
import {
  CreateFinancialCloseDto,
  CreateMovementDto,
  QueryFinancialDto,
  FinancialCloseResponseDto,
} from './dto/financial.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiPaginatedResponse } from '../common/decorators/index';

@ApiTags('financial')
@ApiBearerAuth('access-token')
@Controller({ path: 'financial', version: '1' })
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  // ─── BALANÇO PRÉVIO (preview, sem gravar) ──────────────────────────────

  @Get('balance/:month')
  @Roles(UserRole.ADMIN, UserRole.FINANCEIRO, UserRole.SUPERVISOR, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Balanço prévio do mês (preview)',
    description: 'Calcula receita, comissões, despesas e resultado SEM gravar fechamento.',
  })
  @ApiParam({ name: 'month', example: '2025-08', description: 'Mês AAAA-MM' })
  getBalance(
    @Param('month') month: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.financialService.getMonthBalance(companyId, month);
  }

  // ─── EVOLUÇÃO ANUAL ────────────────────────────────────────────────────

  @Get('evolution/:year')
  @Roles(UserRole.ADMIN, UserRole.FINANCEIRO, UserRole.SUPERVISOR, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Evolução financeira ao longo do ano',
    description: 'Série mensal de receita, comissões e resultado líquido (para gráficos).',
  })
  @ApiParam({ name: 'year', example: '2025', description: 'Ano AAAA' })
  getEvolution(
    @Param('year') year: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.financialService.getYearlyEvolution(companyId, year);
  }

  // ─── EXECUTAR FECHAMENTO ───────────────────────────────────────────────

  @Post('close')
  @Roles(UserRole.ADMIN, UserRole.FINANCEIRO)
  @ApiOperation({
    summary: 'Executar fechamento mensal [ADMIN, FINANCEIRO]',
    description:
      'Consolida receita aprovada, comissões e despesas do mês e grava o fechamento. ' +
      'Não permite duplicidade para o mesmo mês/loja.',
  })
  @ApiResponse({ status: 201, type: FinancialCloseResponseDto })
  @ApiResponse({ status: 409, description: 'Fechamento já existe para o período' })
  createClose(
    @Body() dto: CreateFinancialCloseDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.financialService.createClose(dto, companyId, userId);
  }

  // ─── LISTAR FECHAMENTOS ────────────────────────────────────────────────

  @Get('closes')
  @Roles(UserRole.ADMIN, UserRole.FINANCEIRO, UserRole.SUPERVISOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Listar fechamentos mensais' })
  @ApiPaginatedResponse(FinancialCloseResponseDto)
  findAllCloses(
    @Query() query: QueryFinancialDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.financialService.findAllCloses(companyId, query);
  }

  // ─── DETALHE DO FECHAMENTO ─────────────────────────────────────────────

  @Get('closes/:id')
  @Roles(UserRole.ADMIN, UserRole.FINANCEIRO, UserRole.SUPERVISOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Detalhes de um fechamento' })
  @ApiParam({ name: 'id', description: 'UUID do fechamento' })
  @ApiResponse({ status: 200, type: FinancialCloseResponseDto })
  findOneClose(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.financialService.findOneClose(id, companyId);
  }

  // ─── REABRIR FECHAMENTO ────────────────────────────────────────────────

  @Patch('closes/:id/reopen')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reabrir fechamento [ADMIN]',
    description: 'Permite ajustes após o fechamento. Use com cautela.',
  })
  @ApiParam({ name: 'id', description: 'UUID do fechamento' })
  reopenClose(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.financialService.reopenClose(id, companyId, userId);
  }

  // ─── LANÇAR MOVIMENTO MANUAL ───────────────────────────────────────────

  @Post('movements')
  @Roles(UserRole.ADMIN, UserRole.FINANCEIRO)
  @ApiOperation({
    summary: 'Lançar receita/despesa manual [ADMIN, FINANCEIRO]',
    description: 'Registra movimentos avulsos (aluguel, bônus, etc.) que entram no fechamento.',
  })
  @ApiResponse({ status: 201, description: 'Movimento registrado' })
  createMovement(
    @Body() dto: CreateMovementDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.financialService.createMovement(dto, companyId, userId);
  }

  // ─── LISTAR MOVIMENTOS DO MÊS ──────────────────────────────────────────

  @Get('movements/:month')
  @Roles(UserRole.ADMIN, UserRole.FINANCEIRO, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Listar movimentos manuais do mês' })
  @ApiParam({ name: 'month', example: '2025-08', description: 'Mês AAAA-MM' })
  findMovements(
    @Param('month') month: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.financialService.findMovements(companyId, month);
  }
}
