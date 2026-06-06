// =============================================================================
// TELECEL SYSTEM — financial/financial.service.ts
// Financeiro: fechamento mensal consolidado, movimentos, balanço
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateFinancialCloseDto,
  CreateMovementDto,
  QueryFinancialDto,
} from './dto/financial.dto';
import {
  AuditAction,
  Prisma,
  SaleStatus,
  CommissionStatus,
  FinancialCloseStatus,
  MovementType,
} from '@prisma/client';

@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── EXECUTAR FECHAMENTO MENSAL ────────────────────────────────────────

  async createClose(
    dto: CreateFinancialCloseDto,
    companyId: string,
    closedBy: string,
  ) {
    // Evitar fechamento duplicado para o mesmo mês/loja
    const existing = await this.prisma.financialClose.findFirst({
      where: {
        companyId,
        referenceMonth: dto.referenceMonth,
        storeId: dto.storeId ?? null,
        status: { not: FinancialCloseStatus.REOPENED },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Já existe fechamento para ${dto.referenceMonth}${dto.storeId ? ' nesta loja' : ''}`,
      );
    }

    // Filtro base para vendas/comissões do mês
    const dateFilter = this.monthDateRange(dto.referenceMonth);
    const saleWhere: Prisma.SaleWhereInput = {
      companyId,
      deletedAt: null,
      status: SaleStatus.APPROVED,
      approvedAt: dateFilter,
      ...(dto.storeId && { storeId: dto.storeId }),
    };

    // 1. Receita bruta + quantidade de vendas aprovadas
    const salesAgg = await this.prisma.sale.aggregate({
      where: saleWhere,
      _sum: { totalAmount: true },
      _count: { id: true },
    });
    const grossRevenue = Number(salesAgg._sum.totalAmount ?? 0);
    const salesCount = salesAgg._count.id;

    // 2. Total de comissões do mês de referência
    const commissionAgg = await this.prisma.commission.aggregate({
      where: {
        companyId,
        referenceMonth: dto.referenceMonth,
        status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] },
      },
      _sum: { amount: true },
    });
    const totalCommissions = Number(commissionAgg._sum.amount ?? 0);

    // 3. Outras despesas lançadas no mês
    const expenseAgg = await this.prisma.financialMovement.aggregate({
      where: {
        companyId,
        referenceMonth: dto.referenceMonth,
        type: MovementType.EXPENSE,
        ...(dto.storeId && { storeId: dto.storeId }),
      },
      _sum: { amount: true },
    });
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

    // 4. Receitas avulsas adicionais
    const incomeAgg = await this.prisma.financialMovement.aggregate({
      where: {
        companyId,
        referenceMonth: dto.referenceMonth,
        type: MovementType.INCOME,
        ...(dto.storeId && { storeId: dto.storeId }),
      },
      _sum: { amount: true },
    });
    const otherIncome = Number(incomeAgg._sum.amount ?? 0);

    // 5. Resultado líquido = receita + outras receitas - comissões - despesas
    const netResult = grossRevenue + otherIncome - totalCommissions - totalExpenses;

    const close = await this.prisma.financialClose.create({
      data: {
        companyId,
        storeId: dto.storeId ?? null,
        referenceMonth: dto.referenceMonth,
        status: FinancialCloseStatus.CLOSED,
        grossRevenue,
        totalCommissions,
        totalExpenses,
        netResult,
        salesCount,
        notes: dto.notes ?? null,
        closedById: closedBy,
        closedAt: new Date(),
      },
    });

    await this.audit.log({
      userId: closedBy,
      companyId,
      action: AuditAction.CREATE,
      entity: 'FinancialClose',
      entityId: close.id,
      newValues: { referenceMonth: dto.referenceMonth, grossRevenue, netResult },
      description: `Fechamento ${dto.referenceMonth}: receita R$ ${grossRevenue.toFixed(2)}, líquido R$ ${netResult.toFixed(2)}`,
    });

    return close;
  }

  // ─── REABRIR FECHAMENTO ────────────────────────────────────────────────

  async reopenClose(id: string, companyId: string, userId: string) {
    const close = await this.prisma.financialClose.findFirst({
      where: { id, companyId },
    });
    if (!close) throw new NotFoundException('Fechamento não encontrado');
    if (close.status === FinancialCloseStatus.REOPENED) {
      throw new BadRequestException('Fechamento já está reaberto');
    }

    const updated = await this.prisma.financialClose.update({
      where: { id },
      data: { status: FinancialCloseStatus.REOPENED },
    });

    await this.audit.log({
      userId,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'FinancialClose',
      entityId: id,
      description: `Fechamento ${close.referenceMonth} reaberto`,
    });

    return updated;
  }

  // ─── LISTAR FECHAMENTOS ────────────────────────────────────────────────

  async findAllCloses(companyId: string, query: QueryFinancialDto) {
    const { page = 1, limit = 12, status, year, storeId } = query;

    const where: Prisma.FinancialCloseWhereInput = {
      companyId,
      ...(status && { status }),
      ...(storeId && { storeId }),
      ...(year && { referenceMonth: { startsWith: year } }),
    };

    return this.prisma.paginate(this.prisma.financialClose, {
      where,
      orderBy: { referenceMonth: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
      page,
      limit,
    });
  }

  // ─── DETALHE DE UM FECHAMENTO ──────────────────────────────────────────

  async findOneClose(id: string, companyId: string) {
    const close = await this.prisma.financialClose.findFirst({
      where: { id, companyId },
      include: {
        store: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });
    if (!close) throw new NotFoundException('Fechamento não encontrado');
    return close;
  }

  // ─── LANÇAR MOVIMENTO MANUAL ───────────────────────────────────────────

  async createMovement(
    dto: CreateMovementDto,
    companyId: string,
    createdBy: string,
  ) {
    const movement = await this.prisma.financialMovement.create({
      data: {
        companyId,
        type: dto.type,
        description: dto.description,
        amount: dto.amount,
        referenceMonth: dto.referenceMonth,
        category: dto.category ?? null,
        storeId: dto.storeId ?? null,
        createdById: createdBy,
      },
    });

    await this.audit.log({
      userId: createdBy,
      companyId,
      action: AuditAction.CREATE,
      entity: 'FinancialMovement',
      entityId: movement.id,
      newValues: { type: dto.type, amount: dto.amount, description: dto.description },
      description: `Movimento ${dto.type}: ${dto.description} (R$ ${dto.amount.toFixed(2)})`,
    });

    return movement;
  }

  async findMovements(companyId: string, referenceMonth: string) {
    return this.prisma.financialMovement.findMany({
      where: { companyId, referenceMonth },
      include: { store: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── BALANÇO / VISÃO GERAL ─────────────────────────────────────────────

  /**
   * Calcula o balanço de um mês SEM gravar fechamento (preview).
   * Útil para conferência antes de fechar o mês oficialmente.
   */
  async getMonthBalance(companyId: string, referenceMonth: string) {
    const dateFilter = this.monthDateRange(referenceMonth);

    const [sales, commissions, expenses, income] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          companyId, deletedAt: null,
          status: SaleStatus.APPROVED, approvedAt: dateFilter,
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.commission.aggregate({
        where: {
          companyId, referenceMonth,
          status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] },
        },
        _sum: { amount: true },
      }),
      this.prisma.financialMovement.aggregate({
        where: { companyId, referenceMonth, type: MovementType.EXPENSE },
        _sum: { amount: true },
      }),
      this.prisma.financialMovement.aggregate({
        where: { companyId, referenceMonth, type: MovementType.INCOME },
        _sum: { amount: true },
      }),
    ]);

    const grossRevenue = Number(sales._sum.totalAmount ?? 0);
    const otherIncome = Number(income._sum.amount ?? 0);
    const totalCommissions = Number(commissions._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    const netResult = grossRevenue + otherIncome - totalCommissions - totalExpenses;

    return {
      referenceMonth,
      grossRevenue,
      otherIncome,
      totalCommissions,
      totalExpenses,
      netResult,
      salesCount: sales._count.id,
      margin: grossRevenue > 0 ? Number(((netResult / grossRevenue) * 100).toFixed(2)) : 0,
    };
  }

  /**
   * Evolução dos últimos N meses (para gráficos do dashboard).
   */
  async getYearlyEvolution(companyId: string, year: string) {
    const closes = await this.prisma.financialClose.findMany({
      where: {
        companyId,
        referenceMonth: { startsWith: year },
        status: { not: FinancialCloseStatus.REOPENED },
      },
      orderBy: { referenceMonth: 'asc' },
      select: {
        referenceMonth: true,
        grossRevenue: true,
        totalCommissions: true,
        totalExpenses: true,
        netResult: true,
        salesCount: true,
      },
    });

    return {
      year,
      months: closes.map((c) => ({
        month: c.referenceMonth,
        grossRevenue: Number(c.grossRevenue),
        totalCommissions: Number(c.totalCommissions),
        totalExpenses: Number(c.totalExpenses),
        netResult: Number(c.netResult),
        salesCount: c.salesCount,
      })),
      totals: {
        grossRevenue: closes.reduce((s, c) => s + Number(c.grossRevenue), 0),
        netResult: closes.reduce((s, c) => s + Number(c.netResult), 0),
        salesCount: closes.reduce((s, c) => s + c.salesCount, 0),
      },
    };
  }

  // ─── Utilitário: intervalo de datas do mês ─────────────────────────────

  private monthDateRange(referenceMonth: string): Prisma.DateTimeFilter {
    const [year, month] = referenceMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59); // último dia do mês
    return { gte: start, lte: end };
  }
}
