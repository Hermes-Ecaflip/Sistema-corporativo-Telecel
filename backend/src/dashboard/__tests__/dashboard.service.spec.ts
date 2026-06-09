// =============================================================================
// TELECEL SYSTEM — dashboard/__tests__/dashboard.service.spec.ts
// Testes unitários do DashboardService (Prisma e Audit mockados)
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
// UserRole resolvido como string literal (evita depender de `prisma generate` nos testes)
import { DashboardPeriod } from '../dto/dashboard.dto';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;

  beforeEach(async () => {
    // Mock do Prisma com as operações usadas pelo overview
    prisma = {
      sale: {
        count: jest.fn().mockResolvedValue(10),
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 50000 } }),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      commission: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 7500 } }),
      },
      client: {
        count: jest.fn().mockResolvedValue(3),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('retorna KPIs agregados para um ADMIN', async () => {
      const result = await service.getOverview(
        'company-1',
        { period: DashboardPeriod.MONTH },
        { id: 'user-1', role: 'ADMIN' as any },
      );

      expect(result.kpis).toBeDefined();
      expect(result.kpis.revenue).toBe(50000);
      expect(result.kpis.commissions).toBe(7500);
      // Admin vê novos clientes
      expect(result.kpis.newClients).toBe(3);
    });

    it('vendedor NÃO vê novos clientes e filtra pelas próprias vendas', async () => {
      const result = await service.getOverview(
        'company-1',
        { period: DashboardPeriod.MONTH },
        { id: 'seller-1', role: 'VENDEDOR' as any },
      );

      expect(result.kpis.newClients).toBeUndefined();
      // Verifica que o filtro por sellerId foi aplicado em alguma chamada de count
      const callArgs = prisma.sale.count.mock.calls[0][0];
      expect(callArgs.where.sellerId).toBe('seller-1');
    });

    it('aplica filtro por marca (brand) via relação store', async () => {
      await service.getOverview(
        'company-1',
        { period: DashboardPeriod.MONTH, brand: 'TIM' as any },
        { id: 'user-1', role: 'ADMIN' as any },
      );
      const callArgs = prisma.sale.count.mock.calls[0][0];
      expect(callArgs.where.store).toEqual({ brand: 'TIM' });
    });
  });

  describe('getSellerRanking', () => {
    it('retorna lista vazia quando não há vendas', async () => {
      const ranking = await service.getSellerRanking('company-1', {
        period: DashboardPeriod.MONTH,
      });
      expect(Array.isArray(ranking)).toBe(true);
      expect(ranking).toHaveLength(0);
    });
  });
});
