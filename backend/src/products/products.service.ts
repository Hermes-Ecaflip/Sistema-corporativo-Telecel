// =============================================================================
// TELECEL SYSTEM — products/products.service.ts
// CRUD de Produtos TIM: catálogo, categorias, preços e regras de comissão
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
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
  UpdateProductStatusDto,
} from './dto/product.dto';
import {
  AuditAction,
  Prisma,
  ProductStatus,
  CommissionType,
} from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── CRIAR ─────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto, companyId: string, createdBy: string) {
    // Código único por empresa
    const existing = await this.prisma.product.findFirst({
      where: { code: dto.code, companyId, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Já existe produto com o código ${dto.code}`);
    }

    // Validar preço promocional menor que preço normal
    if (dto.promoPrice != null && dto.promoPrice >= dto.price) {
      throw new BadRequestException(
        'Preço promocional deve ser menor que o preço normal',
      );
    }

    // Validar comissão percentual <= 100%
    if (dto.commissionType === CommissionType.PERCENTAGE && dto.commissionValue > 100) {
      throw new BadRequestException('Comissão percentual não pode exceder 100%');
    }

    const product = await this.prisma.product.create({
      data: {
        companyId,
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
        category: dto.category,
        price: dto.price,
        promoPrice: dto.promoPrice ?? null,
        commissionType: dto.commissionType,
        commissionValue: dto.commissionValue,
        dataGb: dto.dataGb ?? null,
        loyaltyMonths: dto.loyaltyMonths ?? null,
        includesDevice: dto.includesDevice ?? false,
        includedApps: dto.includedApps ?? [],
        status: dto.status ?? ProductStatus.ACTIVE,
      },
    });

    await this.audit.log({
      userId: createdBy,
      companyId,
      action: AuditAction.CREATE,
      entity: 'Product',
      entityId: product.id,
      newValues: { name: product.name, code: product.code, price: product.price },
      description: `Produto cadastrado: ${product.name} (${product.code})`,
    });

    return product;
  }

  // ─── LISTAR ────────────────────────────────────────────────────────────

  async findAll(companyId: string, query: QueryProductDto) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      minPrice,
      maxPrice,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const where: Prisma.ProductWhereInput = {
      companyId,
      deletedAt: null,
      ...(category && { category }),
      ...(status && { status }),
      ...((minPrice != null || maxPrice != null) && {
        price: {
          ...(minPrice != null && { gte: minPrice }),
          ...(maxPrice != null && { lte: maxPrice }),
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const allowedSortFields = ['name', 'code', 'price', 'category', 'createdAt'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';

    return this.prisma.paginate(this.prisma.product, {
      where,
      orderBy: { [safeSortBy]: sortOrder },
      page,
      limit,
    });
  }

  // ─── BUSCAR POR ID ─────────────────────────────────────────────────────

  async findOne(id: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async findByCode(code: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { code: code.toUpperCase(), companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  // ─── ATUALIZAR ─────────────────────────────────────────────────────────

  async update(
    id: string,
    companyId: string,
    dto: UpdateProductDto,
    updatedBy: string,
  ) {
    const existing = await this.findOne(id, companyId);

    // Verificar código duplicado se mudou
    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.product.findFirst({
        where: { code: dto.code, companyId, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictException(`Já existe produto com o código ${dto.code}`);
    }

    const finalPrice = dto.price ?? Number(existing.price);
    const finalPromo = dto.promoPrice ?? (existing.promoPrice ? Number(existing.promoPrice) : null);
    if (finalPromo != null && finalPromo >= finalPrice) {
      throw new BadRequestException('Preço promocional deve ser menor que o preço normal');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { ...dto },
    });

    const diff = this.audit.createDiff(existing as any, updated as any);
    await this.audit.log({
      userId: updatedBy,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Product',
      entityId: id,
      oldValues: diff.old,
      newValues: diff.new,
      description: `Produto atualizado: ${updated.name}`,
    });

    return updated;
  }

  // ─── ALTERAR STATUS ────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    companyId: string,
    dto: UpdateProductStatusDto,
    updatedBy: string,
  ) {
    const product = await this.findOne(id, companyId);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.audit.log({
      userId: updatedBy,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Product',
      entityId: id,
      oldValues: { status: product.status },
      newValues: { status: dto.status },
      description: `Status do produto alterado para ${dto.status}`,
    });

    return updated;
  }

  // ─── SOFT DELETE ───────────────────────────────────────────────────────

  async remove(id: string, companyId: string, deletedBy: string) {
    const product = await this.findOne(id, companyId);

    // Não permitir remover produto com vendas vinculadas
    const salesCount = await this.prisma.saleItem.count({
      where: { productId: id },
    });
    if (salesCount > 0) {
      throw new BadRequestException(
        `Produto possui ${salesCount} venda(s) vinculada(s). Inative-o em vez de remover.`,
      );
    }

    await this.prisma.product.delete({ where: { id } });

    await this.audit.log({
      userId: deletedBy,
      companyId,
      action: AuditAction.DELETE,
      entity: 'Product',
      entityId: id,
      oldValues: { name: product.name, code: product.code },
      description: `Produto removido: ${product.name}`,
    });

    return { message: 'Produto removido com sucesso' };
  }

  // ─── CÁLCULO DE COMISSÃO (helper p/ módulo de Vendas) ───────────────────

  /**
   * Calcula a comissão de um produto com base no tipo e valor configurados.
   * PERCENTAGE: comissão = preço * (commissionValue / 100)
   * FIXED:      comissão = commissionValue
   */
  calculateCommission(
    price: number,
    commissionType: CommissionType,
    commissionValue: number,
  ): number {
    if (commissionType === CommissionType.PERCENTAGE) {
      return Math.round(price * (commissionValue / 100) * 100) / 100;
    }
    return commissionValue;
  }

  // ─── ESTATÍSTICAS ──────────────────────────────────────────────────────

  async getStats(companyId: string) {
    const [total, byCategory, byStatus, priceStats] = await Promise.all([
      this.prisma.product.count({ where: { companyId, deletedAt: null } }),

      this.prisma.product.groupBy({
        by: ['category'],
        where: { companyId, deletedAt: null },
        _count: { category: true },
      }),

      this.prisma.product.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: { status: true },
      }),

      this.prisma.product.aggregate({
        where: { companyId, deletedAt: null },
        _avg: { price: true },
        _min: { price: true },
        _max: { price: true },
      }),
    ]);

    return {
      total,
      byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count.category])),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.status])),
      priceRange: {
        avg: priceStats._avg.price ? Number(priceStats._avg.price).toFixed(2) : 0,
        min: priceStats._min.price ? Number(priceStats._min.price) : 0,
        max: priceStats._max.price ? Number(priceStats._max.price) : 0,
      },
    };
  }
}
