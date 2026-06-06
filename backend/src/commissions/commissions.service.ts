// =============================================================================
// TELECEL SYSTEM — commissions/commissions.service.ts
// Gestão de Comissões: aprovação, pagamento, fechamento mensal por vendedor
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  QueryCommissionDto,
  ApproveCommissionsDto,
  PayCommissionsDto,
  CloseMonthDto,
} from './dto/commission.dto';
import {
  AuditAction,
  Prisma,
  CommissionStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── LISTAR ────────────────────────────────────────────────────────────

  async findAll(
    companyId: string,
    query: QueryCommissionDto,
    requester: { id: string; role: UserRole },
  ) {
    const {
      page = 1, limit = 20, status, userId, referenceMonth,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = query;

    const where: Prisma.CommissionWhereInput = {
      companyId,
      ...(status && { status }),
      ...(referenceMonth && { referenceMonth }),
    };

    // Vendedor só vê as próprias comissões
    if (requester.role === UserRole.VENDEDOR) {
      where.userId = requester.id;
    } else if (userId) {
      where.userId = userId;
    }

    const allowedSortFields = ['createdAt', 'amount', 'referenceMonth'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    return this.prisma.paginate(this.prisma.commission, {
      where,
      orderBy: { [safeSortBy]: sortOrder },
      include: {
        user: { select: { id: true, name: true, email: true } },
        sale: { select: { id: true, saleNumber: true, totalAmount: true } },
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
    const commission = await this.prisma.commission.findFirst({
      where: { id, companyId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        sale: { select: { saleNumber: true, totalAmount: true, items: true } },
      },
    });

    if (!commission) throw new NotFoundException('Comissão não encontrada');

    if (requester.role === UserRole.VENDEDOR && commission.userId !== requester.id) {
      throw new BadRequestException('Você não tem acesso a esta comissão');
    }

    return commission;
  }

  // ─── APROVAR EM LOTE ───────────────────────────────────────────────────

  async approve(
    dto: ApproveCommissionsDto,
    companyId: string,
    approvedBy: string,
  ) {
    // Buscar somente comissões pendentes
    const commissions = await this.prisma.commission.findMany({
      where: {
        id: { in: dto.commissionIds },
        companyId,
        status: CommissionStatus.PENDING,
      },
    });

    if (commissions.length === 0) {
      throw new BadRequestException('Nenhuma comissão pendente encontrada para aprovar');
    }

    const result = await this.prisma.commission.updateMany({
      where: {
        id: { in: commissions.map((c) => c.id) },
        status: CommissionStatus.PENDING,
      },
      data: {
        status: CommissionStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    const total = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

    await this.audit.log({
      userId: approvedBy,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Commission',
      description: `${result.count} comissões aprovadas (total R$ ${total.toFixed(2)})`,
    });

    return {
      message: `${result.count} comissão(ões) aprovada(s)`,
      approvedCount: result.count,
      totalAmount: total,
    };
  }

  // ─── MARCAR COMO PAGA ──────────────────────────────────────────────────

  async pay(dto: PayCommissionsDto, companyId: string, paidBy: string) {
    // Somente comissões aprovadas podem ser pagas
    const commissions = await this.prisma.commission.findMany({
      where: {
        id: { in: dto.commissionIds },
        companyId,
        status: CommissionStatus.APPROVED,
      },
    });

    if (commissions.length === 0) {
      throw new BadRequestException(
        'Nenhuma comissão aprovada encontrada. Aprove antes de pagar.',
      );
    }

    const result = await this.prisma.commission.updateMany({
      where: {
        id: { in: commissions.map((c) => c.id) },
        status: CommissionStatus.APPROVED,
      },
      data: {
        status: CommissionStatus.PAID,
        paidAt: new Date(),
        paymentNote: dto.paymentNote ?? null,
      },
    });

    const total = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

    await this.audit.log({
      userId: paidBy,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Commission',
      description: `${result.count} comissões pagas (total R$ ${total.toFixed(2)})`,
    });

    return {
      message: `${result.count} comissão(ões) marcada(s) como paga(s)`,
      paidCount: result.count,
      totalAmount: total,
    };
  }

  // ─── RESUMO POR VENDEDOR (mês de referência) ───────────────────────────

  async getSummaryByMonth(companyId: string, referenceMonth: string) {
    const commissions = await this.prisma.commission.groupBy({
      by: ['userId', 'status'],
      where: { companyId, referenceMonth },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Agrupar por vendedor
    const summaryMap = new Map<string, any>();
    for (const c of commissions) {
      if (!summaryMap.has(c.userId)) {
        summaryMap.set(c.userId, {
          userId: c.userId,
          pending: 0, approved: 0, paid: 0, cancelled: 0,
          totalCount: 0, totalAmount: 0,
        });
      }
      const entry = summaryMap.get(c.userId);
      const amount = Number(c._sum.amount ?? 0);
      entry[c.status.toLowerCase()] = amount;
      entry.totalCount += c._count.id;
      if (c.status !== CommissionStatus.CANCELLED) {
        entry.totalAmount += amount;
      }
    }

    // Enriquecer com nome dos vendedores
    const userIds = Array.from(summaryMap.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userNameMap = new Map(users.map((u) => [u.id, u]));

    return {
      referenceMonth,
      sellers: Array.from(summaryMap.values()).map((s) => ({
        ...s,
        name: userNameMap.get(s.userId)?.name ?? 'Desconhecido',
        email: userNameMap.get(s.userId)?.email ?? '',
      })),
    };
  }

  // ─── FECHAMENTO MENSAL ─────────────────────────────────────────────────

  /**
   * Aprova automaticamente todas as comissões pendentes do mês de referência.
   * Usado no fechamento financeiro mensal.
   */
  async closeMonth(dto: CloseMonthDto, companyId: string, closedBy: string) {
    const pendingCount = await this.prisma.commission.count({
      where: {
        companyId,
        referenceMonth: dto.referenceMonth,
        status: CommissionStatus.PENDING,
      },
    });

    if (pendingCount === 0) {
      throw new BadRequestException(
        `Nenhuma comissão pendente em ${dto.referenceMonth}`,
      );
    }

    const result = await this.prisma.commission.updateMany({
      where: {
        companyId,
        referenceMonth: dto.referenceMonth,
        status: CommissionStatus.PENDING,
      },
      data: { status: CommissionStatus.APPROVED, approvedAt: new Date() },
    });

    await this.audit.log({
      userId: closedBy,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Commission',
      description: `Fechamento de ${dto.referenceMonth}: ${result.count} comissões aprovadas`,
    });

    return {
      message: `Fechamento de ${dto.referenceMonth} concluído`,
      referenceMonth: dto.referenceMonth,
      approvedCount: result.count,
    };
  }

  // ─── TOTAIS GERAIS ─────────────────────────────────────────────────────

  async getStats(
    companyId: string,
    requester: { id: string; role: UserRole },
  ) {
    const where: Prisma.CommissionWhereInput = { companyId };
    if (requester.role === UserRole.VENDEDOR) {
      where.userId = requester.id;
    }

    const byStatus = await this.prisma.commission.groupBy({
      by: ['status'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    const result = {
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    };

    for (const s of byStatus) {
      const key = s.status.toLowerCase() as keyof typeof result;
      if (result[key]) {
        result[key] = {
          count: s._count.id,
          amount: Number(s._sum.amount ?? 0),
        };
      }
    }

    return result;
  }
}
