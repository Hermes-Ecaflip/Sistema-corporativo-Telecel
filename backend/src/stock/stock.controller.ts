// =============================================================================
// TELECEL SYSTEM — stock/stock.controller.ts
// Endpoints de estoque, transferências (PDF) e aparelhos danificados (imagem+PDF)
// =============================================================================

import {
  Controller, Get, Post, Patch, Body, Param, Query, Res,
  ParseUUIDPipe, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';

import { StockService } from './stock.service';
import {
  CreateStockItemDto, UpdateStockItemDto, QueryStockDto,
  CreateTransferDto, ApproveTransferDto, CreateDamageReportDto,
} from './dto/stock.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('stock')
@ApiBearerAuth('access-token')
@Controller({ path: 'stock', version: '1' })
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // ─── ITENS ──────────────────────────────────────────────────────────────
  @Post('items')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.ESTOQUISTA)
  @ApiOperation({ summary: 'Adicionar item ao estoque (IMEI / código de barras)' })
  createItem(
    @Body() dto: CreateStockItemDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.createItem(dto, companyId, userId);
  }

  @Get('items')
  @ApiOperation({ summary: 'Listar itens de estoque (filtros: marca, loja, status, busca)' })
  findItems(@Query() query: QueryStockDto, @CurrentUser('companyId') companyId: string) {
    return this.stockService.findAllItems(companyId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas do estoque (por marca e status)' })
  stats(@CurrentUser('companyId') companyId: string) {
    return this.stockService.getStockStats(companyId);
  }

  @Patch('items/:id')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.ESTOQUISTA)
  @ApiOperation({ summary: 'Atualizar item de estoque' })
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockItemDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.updateItem(id, dto, companyId, userId);
  }

  // ─── TRANSFERÊNCIAS ──────────────────────────────────────────────────────
  @Post('transfers')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.ESTOQUISTA)
  @ApiOperation({
    summary: 'Criar transferência entre lojas (mesma marca)',
    description: 'TIM→TIM, Motorola→Motorola, Samsung→Samsung. Outras combinações são rejeitadas.',
  })
  @ApiResponse({ status: 400, description: 'Marcas diferentes ou itens indisponíveis' })
  createTransfer(
    @Body() dto: CreateTransferDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.createTransfer(dto, companyId, userId);
  }

  @Get('transfers')
  @ApiOperation({ summary: 'Listar transferências' })
  findTransfers(@Query() query: QueryStockDto, @CurrentUser('companyId') companyId: string) {
    return this.stockService.findAllTransfers(companyId, query);
  }

  @Patch('transfers/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  @ApiOperation({ summary: 'Aprovar/assinar transferência (gerente)' })
  approveTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveTransferDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.approveTransfer(id, dto, companyId, userId);
  }

  @Get('transfers/:id/pdf')
  @ApiOperation({ summary: 'Baixar PDF do remanejamento de estoque (assinado)' })
  async transferPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.stockService.generateTransferPdf(id, companyId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="remanejamento-${id}.pdf"`,
    });
    res.send(pdf);
  }

  // ─── APARELHOS DANIFICADOS ────────────────────────────────────────────────
  @Post('damage-reports')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.ESTOQUISTA, UserRole.SUPERVISOR)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiOperation({ summary: 'Registrar aparelho danificado (com upload de até 5 imagens)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
        storeId: { type: 'string', format: 'uuid' },
        productName: { type: 'string' },
        brand: { type: 'string' },
        severity: { type: 'string' },
        description: { type: 'string' },
        imei: { type: 'string' },
        estimatedLoss: { type: 'number' },
      },
    },
  })
  createDamageReport(
    @Body() dto: CreateDamageReportDto,
    @UploadedFiles() images: Express.Multer.File[],
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Em produção, as imagens são enviadas ao S3; aqui guardamos os nomes como referência.
    const imageUrls = (images ?? []).map((f) => `uploads/damage/${Date.now()}-${f.originalname}`);
    return this.stockService.createDamageReport(dto, imageUrls, companyId, userId);
  }

  @Get('damage-reports')
  @ApiOperation({ summary: 'Listar registros de aparelhos danificados' })
  findDamageReports(@Query() query: QueryStockDto, @CurrentUser('companyId') companyId: string) {
    return this.stockService.findAllDamageReports(companyId, query);
  }

  @Get('damage-reports/:id/pdf')
  @ApiOperation({ summary: 'Baixar PDF do registro de dano' })
  async damagePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.stockService.generateDamagePdf(id, companyId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="dano-${id}.pdf"`,
    });
    res.send(pdf);
  }
}
