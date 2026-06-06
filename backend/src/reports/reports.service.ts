// =============================================================================
// TELECEL SYSTEM — reports/reports.service.ts
// Geração de relatórios em PDF (PDFKit), Excel (ExcelJS) e CSV
// =============================================================================

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenerateReportDto,
  ReportType,
  ReportFormat,
} from './dto/report.dto';
import { Prisma, SaleStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { createObjectCsvStringifier } from 'csv-writer';

export interface ReportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

// Metadados de cada tipo de relatório
const REPORT_META: Record<ReportType, { title: string; columns: { key: string; header: string; width?: number }[] }> = {
  [ReportType.SALES]: {
    title: 'Relatório de Vendas',
    columns: [
      { key: 'saleNumber', header: 'Nº Venda', width: 18 },
      { key: 'date', header: 'Data', width: 14 },
      { key: 'client', header: 'Cliente', width: 30 },
      { key: 'seller', header: 'Vendedor', width: 25 },
      { key: 'channel', header: 'Canal', width: 14 },
      { key: 'status', header: 'Status', width: 14 },
      { key: 'total', header: 'Total (R$)', width: 14 },
      { key: 'commission', header: 'Comissão (R$)', width: 16 },
    ],
  },
  [ReportType.COMMISSIONS]: {
    title: 'Relatório de Comissões',
    columns: [
      { key: 'seller', header: 'Vendedor', width: 28 },
      { key: 'month', header: 'Mês Ref.', width: 12 },
      { key: 'saleNumber', header: 'Nº Venda', width: 18 },
      { key: 'amount', header: 'Valor (R$)', width: 14 },
      { key: 'status', header: 'Status', width: 14 },
    ],
  },
  [ReportType.FINANCIAL]: {
    title: 'Relatório Financeiro',
    columns: [
      { key: 'month', header: 'Mês Ref.', width: 12 },
      { key: 'grossRevenue', header: 'Receita (R$)', width: 16 },
      { key: 'totalCommissions', header: 'Comissões (R$)', width: 16 },
      { key: 'totalExpenses', header: 'Despesas (R$)', width: 16 },
      { key: 'netResult', header: 'Líquido (R$)', width: 16 },
      { key: 'salesCount', header: 'Qtd. Vendas', width: 12 },
    ],
  },
  [ReportType.CLIENTS]: {
    title: 'Relatório de Clientes',
    columns: [
      { key: 'name', header: 'Nome', width: 30 },
      { key: 'document', header: 'CPF/CNPJ', width: 20 },
      { key: 'phone', header: 'Telefone', width: 16 },
      { key: 'city', header: 'Cidade', width: 20 },
      { key: 'status', header: 'Status', width: 14 },
      { key: 'fraudScore', header: 'Score', width: 10 },
    ],
  },
  [ReportType.PRODUCTS]: {
    title: 'Relatório de Produtos',
    columns: [
      { key: 'code', header: 'Código', width: 18 },
      { key: 'name', header: 'Produto', width: 30 },
      { key: 'category', header: 'Categoria', width: 16 },
      { key: 'price', header: 'Preço (R$)', width: 14 },
      { key: 'salesCount', header: 'Vendas', width: 12 },
    ],
  },
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── PONTO DE ENTRADA ──────────────────────────────────────────────────

  async generate(dto: GenerateReportDto, companyId: string): Promise<ReportResult> {
    // 1. Buscar os dados conforme o tipo
    const rows = await this.fetchData(dto, companyId);

    if (rows.length === 0) {
      throw new BadRequestException('Nenhum dado encontrado para os filtros informados');
    }

    const meta = REPORT_META[dto.type];
    const timestamp = new Date().toISOString().split('T')[0];
    const baseName = `${dto.type.toLowerCase()}_${timestamp}`;

    // 2. Gerar no formato solicitado
    switch (dto.format) {
      case ReportFormat.PDF:
        return {
          buffer: await this.buildPdf(meta, rows),
          filename: `${baseName}.pdf`,
          mimeType: 'application/pdf',
        };
      case ReportFormat.EXCEL:
        return {
          buffer: await this.buildExcel(meta, rows),
          filename: `${baseName}.xlsx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      case ReportFormat.CSV:
        return {
          buffer: this.buildCsv(meta, rows),
          filename: `${baseName}.csv`,
          mimeType: 'text/csv; charset=utf-8',
        };
      default:
        throw new BadRequestException('Formato não suportado');
    }
  }

  // ─── BUSCA DE DADOS POR TIPO ───────────────────────────────────────────

  private async fetchData(
    dto: GenerateReportDto,
    companyId: string,
  ): Promise<Record<string, any>[]> {
    const dateRange =
      dto.startDate || dto.endDate
        ? {
            ...(dto.startDate && { gte: new Date(dto.startDate) }),
            ...(dto.endDate && { lte: new Date(`${dto.endDate}T23:59:59`) }),
          }
        : undefined;

    switch (dto.type) {
      case ReportType.SALES: {
        const sales = await this.prisma.sale.findMany({
          where: {
            companyId, deletedAt: null,
            ...(dateRange && { createdAt: dateRange }),
            ...(dto.sellerId && { sellerId: dto.sellerId }),
            ...(dto.storeId && { storeId: dto.storeId }),
          },
          include: {
            client: { select: { name: true } },
            seller: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        return sales.map((s) => ({
          saleNumber: s.saleNumber,
          date: new Date(s.createdAt).toLocaleDateString('pt-BR'),
          client: s.client?.name ?? '',
          seller: s.seller?.name ?? '',
          channel: s.channel,
          status: s.status,
          total: Number(s.totalAmount).toFixed(2),
          commission: Number(s.totalCommission).toFixed(2),
        }));
      }

      case ReportType.COMMISSIONS: {
        const commissions = await this.prisma.commission.findMany({
          where: {
            companyId,
            ...(dto.referenceMonth && { referenceMonth: dto.referenceMonth }),
            ...(dto.sellerId && { userId: dto.sellerId }),
          },
          include: {
            user: { select: { name: true } },
            sale: { select: { saleNumber: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        return commissions.map((c) => ({
          seller: c.user?.name ?? '',
          month: c.referenceMonth,
          saleNumber: c.sale?.saleNumber ?? '',
          amount: Number(c.amount).toFixed(2),
          status: c.status,
        }));
      }

      case ReportType.FINANCIAL: {
        const closes = await this.prisma.financialClose.findMany({
          where: {
            companyId,
            ...(dto.referenceMonth && { referenceMonth: dto.referenceMonth }),
            ...(dto.storeId && { storeId: dto.storeId }),
          },
          orderBy: { referenceMonth: 'desc' },
        });
        return closes.map((f) => ({
          month: f.referenceMonth,
          grossRevenue: Number(f.grossRevenue).toFixed(2),
          totalCommissions: Number(f.totalCommissions).toFixed(2),
          totalExpenses: Number(f.totalExpenses).toFixed(2),
          netResult: Number(f.netResult).toFixed(2),
          salesCount: f.salesCount,
        }));
      }

      case ReportType.CLIENTS: {
        const clients = await this.prisma.client.findMany({
          where: { companyId, deletedAt: null },
          orderBy: { name: 'asc' },
        });
        return clients.map((c) => ({
          name: c.name,
          document: c.cpf ?? c.cnpj ?? '',
          phone: c.phone,
          city: c.city ?? '',
          status: c.status,
          fraudScore: c.fraudScore,
        }));
      }

      case ReportType.PRODUCTS: {
        const products = await this.prisma.product.findMany({
          where: { companyId, deletedAt: null },
          include: { _count: { select: { saleItems: true } } },
          orderBy: { name: 'asc' },
        });
        return products.map((p) => ({
          code: p.code,
          name: p.name,
          category: p.category,
          price: Number(p.price).toFixed(2),
          salesCount: (p as any)._count?.saleItems ?? 0,
        }));
      }

      default:
        return [];
    }
  }

  // ─── PDF (PDFKit) ──────────────────────────────────────────────────────

  private buildPdf(
    meta: { title: string; columns: any[] },
    rows: Record<string, any>[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Cabeçalho
        doc.fontSize(20).fillColor('#003087').text('TELECEL', { continued: true });
        doc.fillColor('#000000').fontSize(20).text('  ' + meta.title);
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#666666')
          .text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${rows.length} registro(s)`);
        doc.moveDown(0.8);

        // Tabela
        const startX = doc.x;
        let y = doc.y;
        const colWidth = (doc.page.width - 80) / meta.columns.length;
        const rowHeight = 20;

        // Cabeçalho da tabela
        doc.fontSize(9).fillColor('#FFFFFF');
        doc.rect(startX, y, doc.page.width - 80, rowHeight).fill('#003087');
        meta.columns.forEach((col, i) => {
          doc.fillColor('#FFFFFF').text(col.header, startX + i * colWidth + 4, y + 6, {
            width: colWidth - 8,
            ellipsis: true,
          });
        });
        y += rowHeight;

        // Linhas
        doc.fontSize(8);
        rows.forEach((row, idx) => {
          if (y > doc.page.height - 50) {
            doc.addPage();
            y = 40;
          }
          // Zebra
          if (idx % 2 === 0) {
            doc.rect(startX, y, doc.page.width - 80, rowHeight).fill('#F2F5FA');
          }
          meta.columns.forEach((col, i) => {
            doc.fillColor('#222222').text(
              String(row[col.key] ?? ''),
              startX + i * colWidth + 4,
              y + 6,
              { width: colWidth - 8, ellipsis: true },
            );
          });
          y += rowHeight;
        });

        // Rodapé
        doc.fontSize(7).fillColor('#999999')
          .text('TELECEL System · Documento confidencial', 40, doc.page.height - 30);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ─── EXCEL (ExcelJS) ───────────────────────────────────────────────────

  private async buildExcel(
    meta: { title: string; columns: any[] },
    rows: Record<string, any>[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TELECEL System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(meta.title, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Definir colunas
    sheet.columns = meta.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width ?? 18,
    }));

    // Estilizar cabeçalho
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003087' },
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
    });
    headerRow.height = 22;

    // Inserir dados
    rows.forEach((row) => sheet.addRow(row));

    // Zebra striping
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F5FA' },
          };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ─── CSV ───────────────────────────────────────────────────────────────

  private buildCsv(
    meta: { title: string; columns: any[] },
    rows: Record<string, any>[],
  ): Buffer {
    const csvStringifier = createObjectCsvStringifier({
      header: meta.columns.map((col) => ({ id: col.key, title: col.header })),
    });

    const content =
      '\uFEFF' + // BOM para Excel reconhecer UTF-8
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(rows);

    return Buffer.from(content, 'utf-8');
  }
}
