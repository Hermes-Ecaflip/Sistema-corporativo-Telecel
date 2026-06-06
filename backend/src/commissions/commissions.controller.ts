// =============================================================================
// TELECEL SYSTEM — commissions/commissions.controller.ts
// Controller de Comissões: listar, aprovar, pagar, fechar mês, resumo
// =============================================================================

import {
  Controller, Get, Post, Patch,
  Body, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CommissionsService } from './commissions.service';
import {
  QueryCommissionDto,
  ApproveCommissionsDto,
  PayCommissionsDto,
  CloseMonthDto,
  CommissionResponseDto,
} from './dto/commission.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiPaginatedResponse } from '../common/decorators/index';

@ApiTags('commissions')
@ApiBearerAuth('access-token')
@Controller({ path: 'commissions', version: '1' })
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  // ─── LISTAR ────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.FINANCEIRO, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Listar comissões com filtros',
    description: 'Vendedores veem apenas as próprias. Filtros por status, vendedor e mês.',
  })
  @ApiPaginatedResponse(CommissionResponseDto)
  findAll(
    @Query() query: QueryCommissionDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.commissionsService.findAll(companyId, query, { id: userId, role });
  }

  // ─── ESTATÍSTICAS ──────────────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.FINANCEIRO)
  @ApiOperation({ summary: 'Totais de comissões por status (R$ e quantidade)' })
  getStats(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.commissionsService.getStats(companyId, { id: userId, role });
  }

  // ─── RESUMO POR MÊS ────────────────────────────────────────────────────

  @Get('summary/:month')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.FINANCEIRO)
  @ApiOperation({
    summary: 'Resumo de comissões por vendedor em um mês',
    description: 'Consolida pendente/aprovado/pago/cancelado por vendedor.',
  })
  @ApiParam({ name: 'month', example: '2025-08', description: 'Mês AAAA-MM' })
  getSummaryByMonth(
    @Param('month') month: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.commissionsService.getSummaryByMonth(companyId, month);
  }

  // ─── BUSCAR POR ID ─────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.FINANCEIRO, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Detalhes da comissão' })
  @ApiParam({ name: 'id', description: 'UUID da comissão' })
  @ApiResponse({ status: 200, type: CommissionResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.commissionsService.findOne(id, companyId, { id: userId, role });
  }

  // ─── APROVAR EM LOTE ───────────────────────────────────────────────────

  @Patch('approve')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.FINANCEIRO)
  @ApiOperation({
    summary: 'Aprovar comissões em lote [ADMIN, SUPERVISOR, FINANCEIRO]',
    description: 'Move comissões de PENDING para APPROVED.',
  })
  @ApiResponse({ status: 200, description: 'Comissões aprovadas' })
  approve(
    @Body() dto: ApproveCommissionsDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commissionsService.approve(dto, companyId, userId);
  }

  // ─── MARCAR COMO PAGA ──────────────────────────────────────────────────

  @Patch('pay')
  @Roles(UserRole.ADMIN, UserRole.FINANCEIRO)
  @ApiOperation({
    summary: 'Marcar comissões como pagas [ADMIN, FINANCEIRO]',
    description: 'Move comissões de APPROVED para PAID.',
  })
  @ApiResponse({ status: 200, description: 'Comissões pagas' })
  pay(
    @Body() dto: PayCommissionsDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commissionsService.pay(dto, companyId, userId);
  }

  // ─── FECHAMENTO MENSAL ─────────────────────────────────────────────────

  @Post('close-month')
  @Roles(UserRole.ADMIN, UserRole.FINANCEIRO)
  @ApiOperation({
    summary: 'Fechar mês — aprovar todas as comissões pendentes [ADMIN, FINANCEIRO]',
    description: 'Aprova em lote todas as comissões pendentes do mês de referência.',
  })
  @ApiResponse({ status: 200, description: 'Fechamento concluído' })
  closeMonth(
    @Body() dto: CloseMonthDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commissionsService.closeMonth(dto, companyId, userId);
  }
}
