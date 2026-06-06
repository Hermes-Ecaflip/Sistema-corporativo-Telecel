// =============================================================================
// TELECEL SYSTEM — dashboard/dashboard.service.ts
// KPIs em tempo real, ranking de vendedores, metas e agregações por papel
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  DashboardQueryDto,
  DashboardPeriod,
  CreateGoalDto,
  UpdateGoalDto,
} from './dto/dashboard.dto';
import {
  Prisma,
  SaleStatus,
  CommissionStatus,
  UserRole,
  GoalType,
  AuditAction,
} from '@prisma/client';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── VISÃO GERAL (KPIs por papel) ──────────────────────────────────────

  async getOverview(
    companyId: string,
    query: DashboardQueryDto,
    requester: { id: string; role: UserRole },
  ) {
    const range = this.resolvePeriod(query.period ?? DashboardPeriod.MONTH);

    // Vendedor só vê os próprios números
    const sellerFilter =
      requester.role === UserRole.VENDEDOR
        ? requester.id
        : query.sellerId;

    const saleWhere: Prisma.SaleWhereInput = {
      companyId,
      deletedAt: null,
      createdAt: { gte: range.start, lte: range.end },
      ...(sellerFilter && { sellerId: sellerFilter }),
      ...(query.storeId && { storeId: query.storeId }),
    };

    const [
      totalSales,
      approvedSales,
      pendingSales,
      revenue,
      commissions,
      newClients,
    ] = await Promise.all([
      this.prisma.sale.count({ where: saleWhere }),

      this.prisma.sale.count({
        where: { ...saleWhere, status: SaleStatus.APPROVED },
      }),

      this.prisma.sale.count({
        where: { ...saleWhere, status: SaleStatus.PENDING },
      }),

      this.prisma.sale.aggregate({
        where: { ...saleWhere, status: SaleStatus.APPROVED },
        _sum: { totalAmount: true },
      }),

      this.prisma.commission.aggregate({
        where: {
          companyId,
          createdAt: { gte: range.start, lte: range.end },
          ...(sellerFilter && { userId: sellerFilter }),
          status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] },
        },
        _sum: { amount: true },
      }),

      // Novos clientes (apenas para admin/supervisor)
      requester.role === UserRole.VENDEDOR
        ? Promise.resolve(0)
        : this.prisma.client.count({
            where: {
              companyId,
              deletedAt: null,
              createdAt: { gte: range.start, lte: range.end },
            },
          }),
    ]);

    const approvalRate =
      totalSales > 0 ? Number(((approvedSales / totalSales) * 100).toFixed(1)) : 0;

    return {
      period: query.period,
      range: { start: range.start, end: range.end },
      kpis: {
        totalSales,
        approvedSales,
        pendingSales,
        approvalRate,
        revenue: Number(revenue._sum.totalAmount ?? 0),
        commissions: Number(commissions._sum.amount ?? 0),
        ...(requester.role !== UserRole.VENDEDOR && { newClients }),
      },
    };
  }

  // ─── RANKING DE VENDEDORES ─────────────────────────────────────────────

  async getSellerRanking(
    companyId: string,
    query: DashboardQueryDto,
    limit = 10,
  ) {
    const range = this.resolvePeriod(query.period ?? DashboardPeriod.MONTH);

    const grouped = await this.prisma.sale.groupBy({
      by: ['sellerId'],
      where: {
        companyId,
        deletedAt: null,
        status: SaleStatus.APPROVED,
        approvedAt: { gte: range.start, lte: range.end },
        ...(query.storeId && { storeId: query.storeId }),
      },
      _sum: { totalAmount: true, totalCommission: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    });

    // Enriquecer com nome dos vendedores
    const sellerIds = grouped.map((g) => g.sellerId);
    const sellers = await this.prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, name: true, avatarUrl: true, store: { select: { name: true } } },
    });
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));

    return grouped.map((g, index) => ({
      position: index + 1,
      sellerId: g.sellerId,
      name: sellerMap.get(g.sellerId)?.name ?? 'Desconhecido',
      avatarUrl: sellerMap.get(g.sellerId)?.avatarUrl ?? null,
      store: sellerMap.get(g.sellerId)?.store?.name ?? null,
      salesCount: g._count.id,
      revenue: Number(g._sum.totalAmount ?? 0),
      commission: Number(g._sum.totalCommission ?? 0),
    }));
  }

  // ─── VENDAS POR DIA (gráfico de linha) ─────────────────────────────────

  async getSalesTrend(
    companyId: string,
    query: DashboardQueryDto,
    requester: { id: string; role: UserRole },
  ) {
    const range = this.resolvePeriod(query.period ?? DashboardPeriod.MONTH);

    const sellerFilter =
      requester.role === UserRole.VENDEDOR ? requester.id : query.sellerId;

    // Buscar vendas aprovadas no período
    const sales = await this.prisma.sale.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: SaleStatus.APPROVED,
        approvedAt: { gte: range.start, lte: range.end },
        ...(sellerFilter && { sellerId: sellerFilter }),
      },
      select: { approvedAt: true, totalAmount: true },
      orderBy: { approvedAt: 'asc' },
    });

    // Agrupar por dia
    const dailyMap = new Map<string, { count: number; revenue: number }>();
    for (const sale of sales) {
      const day = sale.approvedAt!.toISOString().split('T')[0];
      const entry = dailyMap.get(day) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(sale.totalAmount);
      dailyMap.set(day, entry);
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      salesCount: data.count,
      revenue: data.revenue,
    }));
  }

  // ─── VENDAS POR CATEGORIA DE PRODUTO (gráfico de pizza) ────────────────

  async getSalesByCategory(companyId: string, query: DashboardQueryDto) {
    const range = this.resolvePeriod(query.period ?? DashboardPeriod.MONTH);

    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          companyId,
          deletedAt: null,
          status: SaleStatus.APPROVED,
          approvedAt: { gte: range.start, lte: range.end },
        },
      },
      select: {
        subtotal: true,
        quantity: true,
        product: { select: { category: true } },
      },
    });

    const categoryMap = new Map<string, { count: number; revenue: number }>();
    for (const item of items) {
      const cat = item.product?.category ?? 'OUTROS';
      const entry = categoryMap.get(cat) ?? { count: 0, revenue: 0 };
      entry.count += item.quantity;
      entry.revenue += Number(item.subtotal);
      categoryMap.set(cat, entry);
    }

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      revenue: data.revenue,
    }));
  }

  // =========================================================================
  // METAS
  // =========================================================================

  async createGoal(dto: CreateGoalDto, companyId: string, createdBy: string) {
    // Evitar meta duplicada (mesmo tipo, mês, alvo)
    const existing = await this.prisma.goal.findFirst({
      where: {
        companyId,
        type: dto.type,
        referenceMonth: dto.referenceMonth,
        userId: dto.userId ?? null,
        storeId: dto.storeId ?? null,
      },
    });
    if (existing) {
      throw new ConflictException('Já existe meta para este período e alvo');
    }

    const goal = await this.prisma.goal.create({
      data: {
        companyId,
        type: dto.type,
        referenceMonth: dto.referenceMonth,
        targetValue: dto.targetValue,
        userId: dto.userId ?? null,
        storeId: dto.storeId ?? null,
      },
    });

    await this.audit.log({
      userId: createdBy,
      companyId,
      action: AuditAction.CREATE,
      entity: 'Goal',
      entityId: goal.id,
      newValues: { type: dto.type, targetValue: dto.targetValue, month: dto.referenceMonth },
      description: `Meta definida: ${dto.type} R$ ${dto.targetValue} (${dto.referenceMonth})`,
    });

    return goal;
  }

  async updateGoal(id: string, companyId: string, dto: UpdateGoalDto, userId: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id, companyId } });
    if (!goal) throw new NotFoundException('Meta não encontrada');

    const updated = await this.prisma.goal.update({
      where: { id },
      data: { targetValue: dto.targetValue },
    });

    await this.audit.log({
      userId,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Goal',
      entityId: id,
      oldValues: { targetValue: Number(goal.targetValue) },
      newValues: { targetValue: dto.targetValue },
      description: `Meta atualizada`,
    });

    return updated;
  }

  // ─── PROGRESSO DAS METAS ───────────────────────────────────────────────

  async getGoalsProgress(
    companyId: string,
    referenceMonth: string,
    requester: { id: string; role: UserRole },
  ) {
    const where: Prisma.GoalWhereInput = { companyId, referenceMonth };
    if (requester.role === UserRole.VENDEDOR) {
      where.userId = requester.id;
    }

    const goals = await this.prisma.goal.findMany({
      where,
      include: {
        user: { select: { name: true } },
        store: { select: { name: true } },
      },
    });

    // Calcular progresso de cada meta
    const result = [];
    for (const goal of goals) {
      const achieved = await this.calculateGoalAchievement(companyId, goal);
      const target = Number(goal.targetValue);
      const percentage = target > 0 ? Number(((achieved / target) * 100).toFixed(1)) : 0;

      result.push({
        id: goal.id,
        type: goal.type,
        referenceMonth: goal.referenceMonth,
        target,
        achieved,
        percentage,
        status: percentage >= 100 ? 'COMPLETED' : percentage >= 70 ? 'ON_TRACK' : 'BEHIND',
        scope: goal.userId
          ? { type: 'SELLER', name: goal.user?.name }
          : goal.storeId
            ? { type: 'STORE', name: goal.store?.name }
            : { type: 'COMPANY', name: 'Empresa' },
      });
    }

    return result;
  }

  // ─── Cálculo de quanto foi atingido de uma meta ───────────────────────

  private async calculateGoalAchievement(
    companyId: string,
    goal: { type: GoalType; referenceMonth: string; userId: string | null; storeId: string | null },
  ): Promise<number> {
    const range = this.monthRange(goal.referenceMonth);

    const saleWhere: Prisma.SaleWhereInput = {
      companyId,
      deletedAt: null,
      status: SaleStatus.APPROVED,
      approvedAt: { gte: range.start, lte: range.end },
      ...(goal.userId && { sellerId: goal.userId }),
      ...(goal.storeId && { storeId: goal.storeId }),
    };

    if (goal.type === GoalType.REVENUE) {
      const agg = await this.prisma.sale.aggregate({
        where: saleWhere,
        _sum: { totalAmount: true },
      });
      return Number(agg._sum.totalAmount ?? 0);
    }

    // GoalType.SALES_COUNT
    return this.prisma.sale.count({ where: saleWhere });
  }

  // ─── Utilitários de período ────────────────────────────────────────────

  private resolvePeriod(period: DashboardPeriod): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);

    switch (period) {
      case DashboardPeriod.TODAY:
        start.setHours(0, 0, 0, 0);
        break;
      case DashboardPeriod.WEEK:
        start.setDate(now.getDate() - 7);
        break;
      case DashboardPeriod.MONTH:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case DashboardPeriod.QUARTER:
        start.setMonth(now.getMonth() - 3);
        break;
      case DashboardPeriod.YEAR:
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return { start, end };
  }

  private monthRange(referenceMonth: string): { start: Date; end: Date } {
    const [year, month] = referenceMonth.split('-').map(Number);
    return {
      start: new Date(year, month - 1, 1, 0, 0, 0),
      end: new Date(year, month, 0, 23, 59, 59),
    };
  }
}
