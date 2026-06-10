// =============================================================================
// TELECEL SYSTEM — stock/stock.service.ts
// Estoque: itens (IMEI/código de barras), transferências entre lojas (mesma
// marca) com geração de PDF assinado, e registro de aparelhos danificados.
// =============================================================================

import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateStockItemDto, UpdateStockItemDto, QueryStockDto,
  CreateTransferDto, ApproveTransferDto, CreateDamageReportDto,
} from './dto/stock.dto';
import {
  Prisma, StockStatus, TransferStatus, DamageStatus,
  AuditAction, UserRole,
} from '@prisma/client';
import PDFDocument from 'pdfkit';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // ITENS DE ESTOQUE
  // ═══════════════════════════════════════════════════════════════════════

  async createItem(dto: CreateStockItemDto, companyId: string, userId: string) {
    // IMEI único (se informado)
    if (dto.imei) {
      const existing = await this.prisma.stockItem.findUnique({ where: { imei: dto.imei } });
      if (existing) throw new ConflictException(`Já existe um item com o IMEI ${dto.imei}`);
    }

    // Produto e loja precisam existir e pertencer à empresa
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const store = await this.prisma.store.findFirst({
      where: { id: dto.storeId, companyId, deletedAt: null },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');

    const item = await this.prisma.stockItem.create({
      data: {
        companyId,
        productId: dto.productId,
        storeId: dto.storeId,
        brand: dto.brand,
        imei: dto.imei,
        barcode: dto.barcode,
        serialNumber: dto.serialNumber,
        costPrice: dto.costPrice,
        notes: dto.notes,
        status: StockStatus.AVAILABLE,
      },
      include: { product: { select: { name: true } }, store: { select: { name: true } } },
    });

    await this.audit.log({
      userId, companyId, action: AuditAction.CREATE, entity: 'StockItem', entityId: item.id,
      description: `Item adicionado ao estoque: ${product.name} (${dto.imei ?? dto.barcode ?? 's/ id'})`,
    });

    return item;
  }

  async findAllItems(companyId: string, query: QueryStockDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StockItemWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.brand && { brand: query.brand }),
      ...(query.storeId && { storeId: query.storeId }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { imei: { contains: query.search } },
          { barcode: { contains: query.search } },
          { serialNumber: { contains: query.search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockItem.findMany({
        where,
        include: {
          product: { select: { name: true, category: true } },
          store: { select: { name: true, brand: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockItem.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStockStats(companyId: string) {
    const [byBrand, byStatus, total] = await Promise.all([
      this.prisma.stockItem.groupBy({
        by: ['brand'],
        where: { companyId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.stockItem.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.stockItem.count({ where: { companyId, deletedAt: null } }),
    ]);

    return {
      total,
      byBrand: byBrand.map((b) => ({ brand: b.brand, count: b._count.id })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    };
  }

  async updateItem(id: string, dto: UpdateStockItemDto, companyId: string, userId: string) {
    const item = await this.prisma.stockItem.findFirst({ where: { id, companyId } });
    if (!item) throw new NotFoundException('Item de estoque não encontrado');

    const updated = await this.prisma.stockItem.update({ where: { id }, data: dto });

    await this.audit.log({
      userId, companyId, action: AuditAction.UPDATE, entity: 'StockItem', entityId: id,
      description: `Item de estoque atualizado`,
    });
    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRANSFERÊNCIA ENTRE LOJAS (mesma marca obrigatória)
  // ═══════════════════════════════════════════════════════════════════════

  async createTransfer(dto: CreateTransferDto, companyId: string, userId: string) {
    if (dto.fromStoreId === dto.toStoreId) {
      throw new BadRequestException('Loja de origem e destino não podem ser a mesma');
    }

    const [fromStore, toStore] = await Promise.all([
      this.prisma.store.findFirst({ where: { id: dto.fromStoreId, companyId } }),
      this.prisma.store.findFirst({ where: { id: dto.toStoreId, companyId } }),
    ]);
    if (!fromStore || !toStore) throw new NotFoundException('Loja de origem ou destino não encontrada');

    // REGRA: só transfere entre lojas da MESMA marca (TIM→TIM, Motorola→Motorola, etc.)
    if (fromStore.brand !== toStore.brand) {
      throw new BadRequestException(
        `Transferência não permitida: ${fromStore.brand} → ${toStore.brand}. ` +
        `Só é possível transferir entre lojas da mesma marca.`,
      );
    }

    // Validar itens: precisam existir, estar na loja de origem, disponíveis e da mesma marca
    const items = await this.prisma.stockItem.findMany({
      where: { id: { in: dto.stockItemIds }, companyId, storeId: dto.fromStoreId, deletedAt: null },
    });
    if (items.length !== dto.stockItemIds.length) {
      throw new BadRequestException('Um ou mais itens não estão disponíveis na loja de origem');
    }
    const wrongBrand = items.find((i) => i.brand !== fromStore.brand);
    if (wrongBrand) {
      throw new BadRequestException('Todos os itens devem ser da mesma marca da loja');
    }
    const notAvailable = items.find((i) => i.status !== StockStatus.AVAILABLE);
    if (notAvailable) {
      throw new BadRequestException('Todos os itens devem estar com status DISPONÍVEL');
    }

    // Gerar código sequencial da transferência
    const count = await this.prisma.stockTransfer.count({ where: { companyId } });
    const transferCode = `TRF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Criar transferência + itens + marcar itens como IN_TRANSIT (transação)
    const transfer = await this.prisma.$transaction(async (tx) => {
      const t = await tx.stockTransfer.create({
        data: {
          companyId,
          transferCode,
          fromStoreId: dto.fromStoreId,
          toStoreId: dto.toStoreId,
          brand: fromStore.brand,
          reason: dto.reason,
          requestedById: userId,
          status: TransferStatus.PENDING,
          items: { create: dto.stockItemIds.map((sid) => ({ stockItemId: sid })) },
        },
        include: {
          fromStore: { select: { name: true, brand: true } },
          toStore: { select: { name: true } },
          items: { include: { stockItem: { include: { product: { select: { name: true } } } } } },
        },
      });

      await tx.stockItem.updateMany({
        where: { id: { in: dto.stockItemIds } },
        data: { status: StockStatus.IN_TRANSIT },
      });

      return t;
    });

    await this.audit.log({
      userId, companyId, action: AuditAction.CREATE, entity: 'StockTransfer', entityId: transfer.id,
      description: `Transferência ${transferCode} criada: ${fromStore.name} → ${toStore.name} (${items.length} itens)`,
    });

    return transfer;
  }

  async approveTransfer(id: string, dto: ApproveTransferDto, companyId: string, userId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transferência não encontrada');
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Apenas transferências pendentes podem ser aprovadas');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.COMPLETED,
          approvedById: userId,
          managerSignature: dto.managerSignature,
          sentAt: new Date(),
          receivedAt: new Date(),
        },
      });

      // Mover itens para a loja de destino e voltar a ficarem disponíveis
      const itemIds = transfer.items.map((i) => i.stockItemId);
      await tx.stockItem.updateMany({
        where: { id: { in: itemIds } },
        data: { storeId: transfer.toStoreId, status: StockStatus.AVAILABLE },
      });

      return t;
    });

    await this.audit.log({
      userId, companyId, action: AuditAction.APPROVE, entity: 'StockTransfer', entityId: id,
      description: `Transferência ${transfer.transferCode} aprovada e assinada por ${dto.managerSignature}`,
    });

    return updated;
  }

  async findAllTransfers(companyId: string, query: QueryStockDto) {
    const where: Prisma.StockTransferWhereInput = {
      companyId,
      ...(query.brand && { brand: query.brand }),
      ...(query.status && { status: query.status as unknown as TransferStatus }),
    };
    return this.prisma.stockTransfer.findMany({
      where,
      include: {
        fromStore: { select: { name: true, city: true, state: true } },
        toStore: { select: { name: true, city: true, state: true } },
        requestedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        items: { include: { stockItem: { include: { product: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── PDF do remanejamento de estoque ──────────────────────────────────
  async generateTransferPdf(id: string, companyId: string): Promise<Buffer> {
    const t = await this.prisma.stockTransfer.findFirst({
      where: { id, companyId },
      include: {
        fromStore: true,
        toStore: true,
        requestedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        items: { include: { stockItem: { include: { product: { select: { name: true } } } } } },
      },
    });
    if (!t) throw new NotFoundException('Transferência não encontrada');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const ORANGE = '#ff5a1f';

      // Cabeçalho
      doc.fillColor(ORANGE).fontSize(22).text('GRUPO TELECEL', { align: 'left' });
      doc.fillColor('#1f2430').fontSize(14).text('Documento de Remanejamento de Estoque', { align: 'left' });
      doc.moveDown(0.5);
      doc.strokeColor(ORANGE).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      // Dados da transferência
      doc.fillColor('#1f2430').fontSize(11);
      doc.font('Helvetica-Bold').text(`Código: `, { continued: true }).font('Helvetica').text(t.transferCode);
      doc.font('Helvetica-Bold').text(`Marca: `, { continued: true }).font('Helvetica').text(t.brand);
      doc.font('Helvetica-Bold').text(`Data: `, { continued: true }).font('Helvetica').text(new Date(t.createdAt).toLocaleString('pt-BR'));
      doc.moveDown();

      // Origem / Destino
      doc.font('Helvetica-Bold').text('Loja de Origem:');
      doc.font('Helvetica').text(`${t.fromStore.name} — ${t.fromStore.city ?? ''}/${t.fromStore.state ?? ''}`);
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Loja de Destino:');
      doc.font('Helvetica').text(`${t.toStore.name} — ${t.toStore.city ?? ''}/${t.toStore.state ?? ''}`);
      doc.moveDown();

      if (t.reason) {
        doc.font('Helvetica-Bold').text('Motivo:');
        doc.font('Helvetica').text(t.reason);
        doc.moveDown();
      }

      // Itens
      doc.font('Helvetica-Bold').fontSize(12).text(`Itens transferidos (${t.items.length}):`);
      doc.moveDown(0.3);
      doc.fontSize(10);
      t.items.forEach((it, idx) => {
        const si = it.stockItem;
        doc.font('Helvetica').text(
          `${idx + 1}. ${si.product?.name ?? 'Produto'} — IMEI/Cód: ${si.imei ?? si.barcode ?? si.serialNumber ?? 'N/A'}`,
        );
      });
      doc.moveDown(2);

      // Assinaturas
      const y = doc.y + 30;
      doc.strokeColor('#1f2430').lineWidth(1);
      doc.moveTo(60, y).lineTo(260, y).stroke();
      doc.moveTo(320, y).lineTo(520, y).stroke();
      doc.fontSize(10).font('Helvetica');
      doc.text(t.requestedBy?.name ?? 'Solicitante', 60, y + 5, { width: 200, align: 'center' });
      doc.text('Solicitante', 60, y + 20, { width: 200, align: 'center' });
      doc.text(t.managerSignature ?? t.approvedBy?.name ?? '____________', 320, y + 5, { width: 200, align: 'center' });
      doc.text('Gerente Responsável', 320, y + 20, { width: 200, align: 'center' });

      doc.fontSize(8).fillColor('#8b93a4').text(
        `Documento gerado eletronicamente pelo TELECEL System em ${new Date().toLocaleString('pt-BR')}`,
        50, 780, { align: 'center', width: 495 },
      );

      doc.end();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // APARELHO DANIFICADO
  // ═══════════════════════════════════════════════════════════════════════

  async createDamageReport(
    dto: CreateDamageReportDto,
    imageUrls: string[],
    companyId: string,
    userId: string,
  ) {
    const store = await this.prisma.store.findFirst({ where: { id: dto.storeId, companyId } });
    if (!store) throw new NotFoundException('Loja não encontrada');

    const count = await this.prisma.damageReport.count({ where: { companyId } });
    const reportCode = `DAN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const report = await this.prisma.$transaction(async (tx) => {
      const r = await tx.damageReport.create({
        data: {
          companyId,
          storeId: dto.storeId,
          stockItemId: dto.stockItemId,
          reportCode,
          imei: dto.imei,
          productName: dto.productName,
          brand: dto.brand,
          severity: dto.severity,
          description: dto.description,
          estimatedLoss: dto.estimatedLoss,
          imageUrls,
          reportedById: userId,
          status: DamageStatus.REPORTED,
        },
      });

      // Se vinculado a um item de estoque, marca como DANIFICADO
      if (dto.stockItemId) {
        await tx.stockItem.update({
          where: { id: dto.stockItemId },
          data: { status: StockStatus.DAMAGED },
        });
      }
      return r;
    });

    await this.audit.log({
      userId, companyId, action: AuditAction.CREATE, entity: 'DamageReport', entityId: report.id,
      description: `Registro de dano ${reportCode}: ${dto.productName} (${dto.severity})`,
    });

    return report;
  }

  async findAllDamageReports(companyId: string, query: QueryStockDto) {
    const where: Prisma.DamageReportWhereInput = {
      companyId,
      ...(query.brand && { brand: query.brand }),
      ...(query.storeId && { storeId: query.storeId }),
    };
    return this.prisma.damageReport.findMany({
      where,
      include: {
        store: { select: { name: true } },
        reportedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateDamagePdf(id: string, companyId: string): Promise<Buffer> {
    const r = await this.prisma.damageReport.findFirst({
      where: { id, companyId },
      include: { store: true, reportedBy: { select: { name: true } } },
    });
    if (!r) throw new NotFoundException('Registro de dano não encontrado');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const ORANGE = '#ff5a1f';
      doc.fillColor(ORANGE).fontSize(22).text('GRUPO TELECEL');
      doc.fillColor('#1f2430').fontSize(14).text('Registro de Aparelho Danificado');
      doc.moveDown(0.5);
      doc.strokeColor(ORANGE).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      doc.fillColor('#1f2430').fontSize(11);
      doc.font('Helvetica-Bold').text('Código: ', { continued: true }).font('Helvetica').text(r.reportCode);
      doc.font('Helvetica-Bold').text('Loja: ', { continued: true }).font('Helvetica').text(r.store.name);
      doc.font('Helvetica-Bold').text('Aparelho: ', { continued: true }).font('Helvetica').text(`${r.productName} (${r.brand})`);
      if (r.imei) doc.font('Helvetica-Bold').text('IMEI: ', { continued: true }).font('Helvetica').text(r.imei);
      doc.font('Helvetica-Bold').text('Severidade: ', { continued: true }).font('Helvetica').text(r.severity);
      doc.font('Helvetica-Bold').text('Data: ', { continued: true }).font('Helvetica').text(new Date(r.createdAt).toLocaleString('pt-BR'));
      doc.moveDown();

      doc.font('Helvetica-Bold').text('Descrição do dano:');
      doc.font('Helvetica').text(r.description);
      doc.moveDown();

      if (r.estimatedLoss) {
        doc.font('Helvetica-Bold').text('Prejuízo estimado: ', { continued: true })
          .font('Helvetica').text(`R$ ${Number(r.estimatedLoss).toFixed(2)}`);
        doc.moveDown();
      }

      doc.font('Helvetica-Bold').text(`Imagens anexadas: ${r.imageUrls.length}`);
      r.imageUrls.forEach((u, i) => doc.font('Helvetica').fontSize(9).fillColor('#5a6172').text(`  ${i + 1}. ${u}`));
      doc.moveDown(2);

      const y = doc.y + 30;
      doc.strokeColor('#1f2430').lineWidth(1).moveTo(180, y).lineTo(400, y).stroke();
      doc.fillColor('#1f2430').fontSize(10).font('Helvetica');
      doc.text(r.reportedBy?.name ?? 'Responsável', 180, y + 5, { width: 220, align: 'center' });
      doc.text('Responsável pelo registro', 180, y + 20, { width: 220, align: 'center' });

      doc.fontSize(8).fillColor('#8b93a4').text(
        `Documento gerado eletronicamente pelo TELECEL System em ${new Date().toLocaleString('pt-BR')}`,
        50, 780, { align: 'center', width: 495 },
      );
      doc.end();
    });
  }
}
