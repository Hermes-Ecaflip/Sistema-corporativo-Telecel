// =============================================================================
// TELECEL SYSTEM — sales/sales.service.ts
// CRUD de Vendas: criação transacional, cálculo de comissão, workflow aprovação
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProductsService } from '../products/products.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateSaleDto,
  QuerySaleDto,
  ReviewSaleDto,
  CancelSaleDto,
} from './dto/sale.dto';
import {
  AuditAction,
  Prisma,
  SaleStatus,
  ClientStatus,
  ProductStatus,
  UserRole,
  CommissionStatus,
} from '@prisma/client';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly products: ProductsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── CRIAR VENDA (transacional) ────────────────────────────────────────

  async create(dto: CreateSaleDto, companyId: string, sellerId: string) {
    // 1. Validar cliente
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, companyId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    if (client.status === ClientStatus.BLOCKED) {
      throw new BadRequestException('Cliente bloqueado — venda não permitida');
    }
    if (client.status === ClientStatus.FRAUD_SUSPECT) {
      throw new BadRequestException(
        'Cliente com suspeita de fraude — necessária liberação do supervisor',
      );
    }

    // 2. Validar e carregar produtos
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId, deletedAt: null },
    });

    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('Um ou mais produtos não foram encontrados');
    }

    const inactiveProduct = products.find((p) => p.status !== ProductStatus.ACTIVE);
    if (inactiveProduct) {
      throw new BadRequestException(
        `Produto "${inactiveProduct.name}" não está ativo para venda`,
      );
    }

    // 3. Calcular totais e comissões por item
    let totalAmount = 0;
    let totalCommission = 0;

    const itemsData = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;

      // Preço: usa o negociado ou o promocional ou o padrão
      const unitPrice =
        item.unitPrice ??
        (product.promoPrice ? Number(product.promoPrice) : Number(product.price));

      const subtotal = unitPrice * item.quantity;

      const commission = this.products.calculateCommission(
        subtotal,
        product.commissionType,
        Number(product.commissionValue),
      );

      totalAmount += subtotal;
      totalCommission += commission;

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        commission,
        notes: item.notes ?? null,
      };
    });

    // 4. Gerar número sequencial da venda
    const saleNumber = await this.generateSaleNumber(companyId);

    // 5. Criar venda + itens em transação atômica
    const sale = await this.prisma.runInTransaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          saleNumber,
          companyId,
          clientId: dto.clientId,
          sellerId,
          storeId: dto.storeId ?? null,
          channel: dto.channel,
          paymentMethod: dto.paymentMethod,
          status: SaleStatus.PENDING,
          totalAmount,
          totalCommission,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          observations: dto.observations ?? null,
          items: {
            create: itemsData,
          },
        },
        include: { items: true },
      });
      return created;
    });

    await this.audit.log({
      userId: sellerId,
      companyId,
      action: AuditAction.CREATE,
      entity: 'Sale',
      entityId: sale.id,
      newValues: { saleNumber, totalAmount, totalCommission, status: SaleStatus.PENDING },
      description: `Venda ${saleNumber} criada (R$ ${totalAmount.toFixed(2)})`,
    });

    // Notificar supervisores sobre venda pendente (fire-and-forget)
    this.notifications
      .notifySupervisorsNewSale(companyId, sale.id, saleNumber)
      .catch((e) => this.logger.warn(`Falha ao notificar supervisores: ${e.message}`));

    return sale;
  }

  // ─── LISTAR ────────────────────────────────────────────────────────────

  async findAll(
    companyId: string,
    query: QuerySaleDto,
    requester: { id: string; role: UserRole },
  ) {
    const {
      page = 1, limit = 20, status, channel, sellerId, clientId, storeId,
      startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc',
    } = query;

    const where: Prisma.SaleWhereInput = {
      companyId,
      deletedAt: null,
      ...(status && { status }),
      ...(channel && { channel }),
      ...(clientId && { clientId }),
      ...(storeId && { storeId }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(`${endDate}T23:59:59`) }),
        },
      }),
    };

    // Vendedor só enxerga as próprias vendas
    if (requester.role === UserRole.VENDEDOR) {
      where.sellerId = requester.id;
    } else if (sellerId) {
      where.sellerId = sellerId;
    }

    const allowedSortFields = ['createdAt', 'totalAmount', 'status', 'saleNumber'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    return this.prisma.paginate(this.prisma.sale, {
      where,
      orderBy: { [safeSortBy]: sortOrder },
      include: {
        client: { select: { id: true, name: true, cpf: true, cnpj: true } },
        seller: { select: { id: true, name: true } },
        items: true,
      },
      page,
      limit,
    });
  }

  // ─── BUSCAR POR ID ─────────────────────────────────────────────────────

  async findOne(
    id: string,
    companyId: string,
    requester: { id: string; role: UserRole },
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        client: true,
        seller: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { name: true, category: true } } } },
        documents: true,
      },
    });

    if (!sale) throw new NotFoundException('Venda não encontrada');

    // Vendedor só acessa as próprias vendas
    if (requester.role === UserRole.VENDEDOR && sale.sellerId !== requester.id) {
      throw new ForbiddenException('Você não tem acesso a esta venda');
    }

    return sale;
  }

  // ─── APROVAR / REJEITAR (workflow) ─────────────────────────────────────

  async review(
    id: string,
    companyId: string,
    dto: ReviewSaleDto,
    reviewerId: string,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!sale) throw new NotFoundException('Venda não encontrada');

    if (sale.status !== SaleStatus.PENDING) {
      throw new BadRequestException(
        `Venda não está pendente (status atual: ${sale.status})`,
      );
    }

    const isApproved = dto.decision === 'APPROVED';
    const newStatus = isApproved ? SaleStatus.APPROVED : SaleStatus.REJECTED;

    if (!isApproved && !dto.reason) {
      throw new BadRequestException('Motivo é obrigatório ao rejeitar uma venda');
    }

    // Atualizar venda + gerar comissão se aprovada (transação)
    const updated = await this.prisma.runInTransaction(async (tx) => {
      const result = await tx.sale.update({
        where: { id },
        data: {
          status: newStatus,
          reviewerId,
          reviewReason: dto.reason ?? null,
          ...(isApproved
            ? { approvedAt: new Date() }
            : { rejectedAt: new Date() }),
        },
      });

      // Se aprovada, criar registro de comissão pendente para o vendedor
      if (isApproved) {
        await tx.commission.create({
          data: {
            companyId,
            saleId: id,
            userId: sale.sellerId,
            amount: sale.totalCommission,
            status: CommissionStatus.PENDING,
            referenceMonth: new Date().toISOString().slice(0, 7), // "2025-08"
          },
        });
      }

      return result;
    });

    await this.audit.log({
      userId: reviewerId,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Sale',
      entityId: id,
      oldValues: { status: SaleStatus.PENDING },
      newValues: { status: newStatus, reason: dto.reason },
      description: `Venda ${sale.saleNumber} ${isApproved ? 'aprovada' : 'rejeitada'}`,
    });

    // Notificar vendedor
    this.notifications
      .notifySellerSaleReviewed(sale.sellerId, sale.saleNumber, isApproved, dto.reason)
      .catch((e) => this.logger.warn(`Falha ao notificar vendedor: ${e.message}`));

    return updated;
  }

  // ─── CANCELAR ──────────────────────────────────────────────────────────

  async cancel(
    id: string,
    companyId: string,
    dto: CancelSaleDto,
    userId: string,
    role: UserRole,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!sale) throw new NotFoundException('Venda não encontrada');

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Venda já está cancelada');
    }

    // Vendedor só cancela as próprias vendas pendentes
    if (role === UserRole.VENDEDOR) {
      if (sale.sellerId !== userId) {
        throw new ForbiddenException('Você só pode cancelar suas próprias vendas');
      }
      if (sale.status !== SaleStatus.PENDING) {
        throw new ForbiddenException('Vendedores só podem cancelar vendas pendentes');
      }
    }

    const updated = await this.prisma.runInTransaction(async (tx) => {
      const result = await tx.sale.update({
        where: { id },
        data: {
          status: SaleStatus.CANCELLED,
          cancelledAt: new Date(),
          reviewReason: dto.reason,
        },
      });

      // Estornar comissão se existia
      await tx.commission.updateMany({
        where: { saleId: id, status: CommissionStatus.PENDING },
        data: { status: CommissionStatus.CANCELLED },
      });

      return result;
    });

    await this.audit.log({
      userId,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Sale',
      entityId: id,
      oldValues: { status: sale.status },
      newValues: { status: SaleStatus.CANCELLED, reason: dto.reason },
      description: `Venda ${sale.saleNumber} cancelada: ${dto.reason}`,
    });

    return updated;
  }

  // ─── ESTATÍSTICAS ──────────────────────────────────────────────────────

  async getStats(
    companyId: string,
    requester: { id: string; role: UserRole },
  ) {
    const baseWhere: Prisma.SaleWhereInput = { companyId, deletedAt: null };
    if (requester.role === UserRole.VENDEDOR) {
      baseWhere.sellerId = requester.id;
    }

    const [total, byStatus, revenue, monthSales] = await Promise.all([
      this.prisma.sale.count({ where: baseWhere }),

      this.prisma.sale.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),

      this.prisma.sale.aggregate({
        where: { ...baseWhere, status: SaleStatus.APPROVED },
        _sum: { totalAmount: true, totalCommission: true },
      }),

      this.prisma.sale.count({
        where: {
          ...baseWhere,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.status])),
      approvedRevenue: Number(revenue._sum.totalAmount ?? 0),
      totalCommissions: Number(revenue._sum.totalCommission ?? 0),
      salesThisMonth: monthSales,
    };
  }

  // ─── Geração de número de venda ────────────────────────────────────────

  private async generateSaleNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `VND-${year}-`;

    // Contar vendas do ano para gerar sequencial
    const count = await this.prisma.sale.count({
      where: {
        companyId,
        saleNumber: { startsWith: prefix },
      },
    });

    const sequential = String(count + 1).padStart(6, '0');
    return `${prefix}${sequential}`; // ex: VND-2025-000001
  }
}
