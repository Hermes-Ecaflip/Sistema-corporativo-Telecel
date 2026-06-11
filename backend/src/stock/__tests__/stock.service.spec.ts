// =============================================================================
// TELECEL SYSTEM — stock/__tests__/stock.service.spec.ts
// Testes unitários do StockService: regra de marca nas transferências,
// IMEI único e estatísticas. Prisma e Audit mockados.
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StockService } from '../stock.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

describe('StockService', () => {
  let service: StockService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      stockItem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        groupBy: jest.fn(),
      },
      product: { findFirst: jest.fn() },
      store: { findFirst: jest.fn() },
      stockTransfer: { count: jest.fn(), create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  // ─── IMEI único ─────────────────────────────────────────────────────────
  describe('createItem', () => {
    it('rejeita IMEI duplicado', async () => {
      prisma.stockItem.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createItem(
          { productId: 'p1', storeId: 's1', brand: 'MOTOROLA' as any, imei: '356938035643809' },
          'company-1',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejeita quando o produto não existe', async () => {
      prisma.stockItem.findUnique.mockResolvedValue(null);
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.createItem(
          { productId: 'inexistente', storeId: 's1', brand: 'TIM' as any, imei: '111' },
          'company-1',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cria item quando produto e loja existem e IMEI é único', async () => {
      prisma.stockItem.findUnique.mockResolvedValue(null);
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'Galaxy S24' });
      prisma.store.findFirst.mockResolvedValue({ id: 's1', name: 'Loja' });
      prisma.stockItem.create.mockResolvedValue({ id: 'new', imei: '356938035643809' });

      const result = await service.createItem(
        { productId: 'p1', storeId: 's1', brand: 'SAMSUNG' as any, imei: '356938035643809' },
        'company-1',
        'user-1',
      );
      expect(result.id).toBe('new');
      expect(prisma.stockItem.create).toHaveBeenCalled();
    });
  });

  // ─── REGRA DE MARCA NAS TRANSFERÊNCIAS ────────────────────────────────────
  describe('createTransfer — regra de marca', () => {
    it('rejeita transferência entre marcas diferentes (TIM → Motorola)', async () => {
      prisma.store.findFirst
        .mockResolvedValueOnce({ id: 'from', brand: 'TIM', name: 'TIM Planaltina' })
        .mockResolvedValueOnce({ id: 'to', brand: 'MOTOROLA', name: 'Motorola SP' });

      await expect(
        service.createTransfer(
          { fromStoreId: 'from', toStoreId: 'to', stockItemIds: ['i1'] },
          'company-1',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejeita origem e destino iguais', async () => {
      await expect(
        service.createTransfer(
          { fromStoreId: 'same', toStoreId: 'same', stockItemIds: ['i1'] },
          'company-1',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite transferência entre lojas da MESMA marca (TIM → TIM)', async () => {
      prisma.store.findFirst
        .mockResolvedValueOnce({ id: 'from', brand: 'TIM', name: 'TIM Planaltina' })
        .mockResolvedValueOnce({ id: 'to', brand: 'TIM', name: 'TIM JK Shopping' });
      prisma.stockItem.findMany.mockResolvedValue([
        { id: 'i1', brand: 'TIM', status: 'AVAILABLE' },
      ]);
      prisma.stockTransfer.count.mockResolvedValue(0);
      prisma.stockTransfer.create.mockResolvedValue({
        id: 't1', transferCode: 'TRF-2026-0001',
      });
      prisma.stockItem.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.createTransfer(
        { fromStoreId: 'from', toStoreId: 'to', stockItemIds: ['i1'] },
        'company-1',
        'user-1',
      );
      expect(result.transferCode).toBe('TRF-2026-0001');
    });

    it('rejeita itens indisponíveis na loja de origem', async () => {
      prisma.store.findFirst
        .mockResolvedValueOnce({ id: 'from', brand: 'SAMSUNG', name: 'Samsung MG' })
        .mockResolvedValueOnce({ id: 'to', brand: 'SAMSUNG', name: 'Samsung DF' });
      // findMany retorna menos itens do que o solicitado
      prisma.stockItem.findMany.mockResolvedValue([]);

      await expect(
        service.createTransfer(
          { fromStoreId: 'from', toStoreId: 'to', stockItemIds: ['i1', 'i2'] },
          'company-1',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── ESTATÍSTICAS ─────────────────────────────────────────────────────────
  describe('getStockStats', () => {
    it('agrega por marca e status', async () => {
      prisma.stockItem.groupBy
        .mockResolvedValueOnce([{ brand: 'TIM', _count: { id: 3 } }])
        .mockResolvedValueOnce([{ status: 'AVAILABLE', _count: { id: 2 } }]);
      prisma.stockItem.count.mockResolvedValue(3);

      const stats = await service.getStockStats('company-1');
      expect(stats.total).toBe(3);
      expect(stats.byBrand[0]).toEqual({ brand: 'TIM', count: 3 });
      expect(stats.byStatus[0]).toEqual({ status: 'AVAILABLE', count: 2 });
    });
  });
});
