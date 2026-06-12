// =============================================================================
// TELECEL SYSTEM — stores/stores.service.ts
// Gestão de lojas: criação, edição e monitoramento (vendas, funcionários,
// contas/financeiro e estoque por loja).
// =============================================================================

import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStoreDto, UpdateStoreDto, QueryStoreDto } from './dto/store.dto';
import { Prisma, AuditAction, SaleStatus } from '@prisma/client';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateStoreDto, companyId: string, userId: string) {
    const exists = await this.prisma.store.findFirst({
      where: { companyId, code: dto.code },
    });
    if (exists) throw new ConflictException(`Já existe uma loja com o código ${dto.code}`);

    const store = await this.prisma.store.create({
      data: { companyId, ...dto },
    });

    await this.audit.log({
      userId, companyId, action: AuditAction.CREATE, entity: 'Store', entityId: store.id,
      description: `Loja criada: ${store.name} (${store.brand})`,
    });
    return store;
  }

  async findAll(companyId: string, query: QueryStoreDto) {
    const where: Prisma.StoreWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.brand && { brand: query.brand }),
      ...(query.state && { state: query.state.toUpperCase() }),
    };

    const stores = await this.prisma.store.findMany({
      where,
      orderBy: [{ brand: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { users: true } } },
    });

    return stores.map((s) => ({
      ...s,
      employeeCount: s._count.users,
    }));
  }

  async findOne(id: string, companyId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true, name: true, role: true, sector: true, status: true },
        },
        _count: { select: { users: true, stockItems: true } },
      },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    return store;
  }

  async update(id: string, dto: UpdateStoreDto, companyId: string, userId: string) {
    const store = await this.prisma.store.findFirst({ where: { id, companyId } });
    if (!store) throw new NotFoundException('Loja não encontrada');

    const updated = await this.prisma.store.update({ where: { id }, data: dto });

    await this.audit.log({
      userId, companyId, action: AuditAction.UPDATE, entity: 'Store', entityId: id,
      description: `Loja atualizada: ${updated.name}`,
    });
    return updated;
  }

  async remove(id: string, companyId: string, userId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, companyId },
      include: { _count: { select: { users: true } } },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    if (store._count.users > 0) {
      throw new ConflictException('Não é possível excluir uma loja com funcionários vinculados');
    }

    const updated = await this.prisma.store.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.log({
      userId, companyId, action: AuditAction.DELETE, entity: 'Store', entityId: id,
      description: `Loja desativada: ${store.name}`,
    });
    return updated;
  }

  /**
   * Monitoramento consolidado de uma loja: vendas, funcionários, estoque,
   * financeiro e metas do mês.
   */
  async getStoreMonitoring(id: string, companyId: string, month?: string) {
    const store = await this.prisma.store.findFirst({ where: { id, companyId } });
    if (!store) throw new NotFoundException('Loja não encontrada');

    const refMonth = month ?? new Date().toISOString().slice(0, 7);
    const [year, m] = refMonth.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);

    const [
      employeeCount, sectorBreakdown, salesAgg, salesCount,
      stockCount, goal,
    ] = await Promise.all([
      this.prisma.user.count({ where: { storeId: id, deletedAt: null } }),
      this.prisma.user.groupBy({
        by: ['sector'],
        where: { storeId: id, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: { storeId: id, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      }),
      this.prisma.sale.count({
        where: { storeId: id, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.stockItem.count({ where: { storeId: id, deletedAt: null } }),
      this.prisma.goal.findFirst({
        where: { storeId: id, referenceMonth: refMonth, userId: null },
      }),
    ]);

    const revenue = Number(salesAgg._sum.totalAmount ?? 0);
    const target = Number(goal?.targetValue ?? 0);

    return {
      store: { id: store.id, name: store.name, brand: store.brand, sectors: store.sectors },
      month: refMonth,
      employees: {
        total: employeeCount,
        bySector: sectorBreakdown.map((s) => ({ sector: s.sector, count: s._count.id })),
      },
      sales: { count: salesCount, revenue },
      stock: { items: stockCount },
      goal: {
        target,
        achieved: revenue,
        progress: target > 0 ? Math.min(100, Math.round((revenue / target) * 100)) : null,
      },
    };
  }
}
