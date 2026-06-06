// =============================================================================
// TELECEL SYSTEM — sales/sales.controller.ts
// Controller de Vendas: criar, listar, aprovar/rejeitar, cancelar
// =============================================================================

import {
  Controller, Get, Post, Patch,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { SalesService } from './sales.service';
import {
  CreateSaleDto,
  QuerySaleDto,
  ReviewSaleDto,
  CancelSaleDto,
  SaleResponseDto,
} from './dto/sale.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiPaginatedResponse } from '../common/decorators/index';

@ApiTags('sales')
@ApiBearerAuth('access-token')
@Controller({ path: 'sales', version: '1' })
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ─── CRIAR VENDA ───────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary: 'Criar nova venda',
    description:
      'Cria venda com múltiplos itens. Calcula total e comissões automaticamente. ' +
      'Venda nasce com status PENDING aguardando aprovação do supervisor.',
  })
  @ApiResponse({ status: 201, type: SaleResponseDto })
  @ApiResponse({ status: 400, description: 'Cliente/produto inválido ou bloqueado' })
  create(
    @Body() dto: CreateSaleDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesService.create(dto, companyId, userId);
  }

  // ─── LISTAR VENDAS ─────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.FINANCEIRO, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Listar vendas com filtros',
    description: 'Vendedores visualizam apenas as próprias vendas. Filtros por status, canal, período.',
  })
  @ApiPaginatedResponse(SaleResponseDto)
  findAll(
    @Query() query: QuerySaleDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.salesService.findAll(companyId, query, { id: userId, role });
  }

  // ─── ESTATÍSTICAS ──────────────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.FINANCEIRO)
  @ApiOperation({ summary: 'Estatísticas de vendas (receita, comissões, por status)' })
  getStats(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.salesService.getStats(companyId, { id: userId, role });
  }

  // ─── BUSCAR POR ID ─────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.FINANCEIRO, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Detalhes da venda (itens, cliente, documentos)' })
  @ApiParam({ name: 'id', description: 'UUID da venda' })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  @ApiResponse({ status: 404, description: 'Venda não encontrada' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.salesService.findOne(id, companyId, { id: userId, role });
  }

  // ─── APROVAR / REJEITAR ────────────────────────────────────────────────

  @Patch(':id/review')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Aprovar ou rejeitar venda [ADMIN, SUPERVISOR]',
    description:
      'Aprovação gera comissão pendente para o vendedor. ' +
      'Rejeição exige motivo. Somente vendas PENDING podem ser revisadas.',
  })
  @ApiParam({ name: 'id', description: 'UUID da venda' })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  @ApiResponse({ status: 400, description: 'Venda não está pendente' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewSaleDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesService.review(id, companyId, dto, userId);
  }

  // ─── CANCELAR ──────────────────────────────────────────────────────────

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary: 'Cancelar venda',
    description:
      'Vendedores só cancelam suas próprias vendas pendentes. ' +
      'Admin/Supervisor cancelam qualquer venda. Estorna comissão pendente.',
  })
  @ApiParam({ name: 'id', description: 'UUID da venda' })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSaleDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.salesService.cancel(id, companyId, dto, userId, role);
  }
}
