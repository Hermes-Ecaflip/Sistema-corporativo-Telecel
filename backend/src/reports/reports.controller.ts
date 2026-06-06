// =============================================================================
// TELECEL SYSTEM — reports/reports.controller.ts
// Controller de Relatórios: gera e faz download de PDF/Excel/CSV
// =============================================================================

import {
  Controller, Post, Body, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';

import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/report.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ─── GERAR RELATÓRIO ───────────────────────────────────────────────────

  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.FINANCEIRO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gerar e baixar relatório [ADMIN, SUPERVISOR, FINANCEIRO]',
    description:
      'Tipos: SALES, COMMISSIONS, FINANCIAL, CLIENTS, PRODUCTS. ' +
      'Formatos: PDF, EXCEL, CSV. Retorna o arquivo para download direto.',
  })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  )
  @ApiResponse({ status: 200, description: 'Arquivo do relatório' })
  @ApiResponse({ status: 400, description: 'Nenhum dado encontrado para os filtros' })
  async generate(
    @Body() dto: GenerateReportDto,
    @CurrentUser('companyId') companyId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.generate(dto, companyId);

    res.setHeader('Content-Type', report.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.filename}"`,
    );
    res.setHeader('Content-Length', report.buffer.length);
    res.end(report.buffer);
  }
}
