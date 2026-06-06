// =============================================================================
// TELECEL SYSTEM — clients/clients.controller.ts
// Controller de Clientes: CRUD, busca, histórico, status, CSV
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';

import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  UpdateClientDto,
  QueryClientDto,
  ClientResponseDto,
  UpdateClientStatusDto,
} from './dto/client.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiPaginatedResponse } from '../common/decorators/index';

@ApiTags('clients')
@ApiBearerAuth('access-token')
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // ─── CRIAR CLIENTE ───────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR)
  @ApiOperation({ summary: 'Cadastrar novo cliente' })
  @ApiResponse({ status: 201, type: ClientResponseDto })
  @ApiResponse({ status: 409, description: 'CPF ou CNPJ já cadastrado' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (CPF/CNPJ obrigatório conforme tipo)',
  })
  create(
    @Body() dto: CreateClientDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.create(dto, companyId, userId);
  }

  // ─── LISTAR CLIENTES ─────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Listar clientes com filtros avançados e paginação',
    description:
      'Busca por nome, CPF, CNPJ, telefone, e-mail ou linha TIM. ' +
      'Filtra por tipo (PF/PJ), status, cidade e estado.',
  })
  @ApiPaginatedResponse(ClientResponseDto)
  findAll(
    @Query() query: QueryClientDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.clientsService.findAll(companyId, query);
  }

  // ─── ESTATÍSTICAS ────────────────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Estatísticas de clientes (totais, tipos, status, risco)' })
  getStats(@CurrentUser('companyId') companyId: string) {
    return this.clientsService.getStats(companyId);
  }

  // ─── EXPORTAR CSV ────────────────────────────────────────────────────────

  @Get('export/csv')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Exportar clientes filtrados em CSV' })
  @ApiResponse({ status: 200, description: 'Arquivo CSV gerado' })
  async exportCsv(
    @Query() query: QueryClientDto,
    @CurrentUser('companyId') companyId: string,
    @Res() res: Response,
  ) {
    const csv = await this.clientsService.exportCsv(companyId, query);
    const filename = `clientes_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ─── BUSCAR POR ID ───────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiParam({ name: 'id', description: 'UUID do cliente' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.clientsService.findOne(id, companyId);
  }

  // ─── BUSCAR POR CPF/CNPJ ─────────────────────────────────────────────────

  @Get('cpf-cnpj/:document')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary: 'Buscar cliente por CPF ou CNPJ',
    description: 'Aceita formatos com ou sem máscara (123.456.789-09 ou 12345678909)',
  })
  @ApiParam({
    name: 'document',
    description: 'CPF (11 dígitos) ou CNPJ (14 dígitos)',
    example: '12345678909',
  })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  findByCpfOrCnpj(
    @Param('document') document: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.clientsService.findByCpfOrCnpj(document, companyId);
  }

  // ─── HISTÓRICO DE VENDAS ─────────────────────────────────────────────────

  @Get(':id/sales')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Histórico de vendas do cliente (últimas 50)' })
  @ApiParam({ name: 'id', description: 'UUID do cliente' })
  @ApiResponse({ status: 200, description: 'Lista de vendas com itens e vendedor' })
  getSalesHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.clientsService.getSalesHistory(id, companyId);
  }

  // ─── ATUALIZAR DADOS ─────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR)
  @ApiOperation({ summary: 'Atualizar dados do cliente' })
  @ApiParam({ name: 'id', description: 'UUID do cliente' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 409, description: 'CPF ou CNPJ duplicado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.update(id, companyId, dto, userId);
  }

  // ─── ALTERAR STATUS ──────────────────────────────────────────────────────

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Alterar status do cliente [ADMIN, SUPERVISOR]',
    description:
      'Status: ACTIVE, INACTIVE, BLOCKED, FRAUD_SUSPECT. ' +
      'Usado para bloquear clientes suspeitos ou inativos.',
  })
  @ApiParam({ name: 'id', description: 'UUID do cliente' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientStatusDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.updateStatus(id, companyId, dto, userId);
  }

  // ─── EXCLUIR (SOFT DELETE) ───────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover cliente (soft delete) [ADMIN]',
    description: 'Clientes com vendas vinculadas não podem ser removidos',
  })
  @ApiParam({ name: 'id', description: 'UUID do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente removido com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Cliente possui vendas vinculadas',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.remove(id, companyId, userId);
  }
}
