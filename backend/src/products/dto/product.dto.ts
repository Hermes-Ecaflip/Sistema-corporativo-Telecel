// =============================================================================
// TELECEL SYSTEM — products/dto/product.dto.ts
// DTOs de Produtos: planos e produtos TIM, categorias, preços e comissões
// =============================================================================

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsBoolean, IsNumber,
  IsInt, Min, Max, MaxLength, MinLength, IsPositive, IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductCategory, ProductStatus, CommissionType } from '@prisma/client';

// =============================================================================
// CRIAR PRODUTO
// =============================================================================
export class CreateProductDto {
  @ApiProperty({ example: 'TIM Black 50GB', description: 'Nome do plano/produto' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'TIM-BLACK-50', description: 'Código único interno' })
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => value?.toUpperCase().trim())
  code: string;

  @ApiPropertyOptional({ example: 'Plano pós-pago com 50GB + apps ilimitados' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.POS_PAGO })
  @IsEnum(ProductCategory, {
    message: `Categoria inválida. Válidas: ${Object.values(ProductCategory).join(', ')}`,
  })
  category: ProductCategory;

  @ApiProperty({ example: 89.90, description: 'Preço mensal/unitário (R$)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Preço deve ser maior que zero' })
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @ApiPropertyOptional({ example: 79.90, description: 'Preço promocional (R$)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => (value != null ? parseFloat(value) : value))
  promoPrice?: number;

  // ── Regras de comissão ──────────────────────────────────────────────────
  @ApiProperty({ enum: CommissionType, example: CommissionType.PERCENTAGE })
  @IsEnum(CommissionType)
  commissionType: CommissionType;

  @ApiProperty({
    example: 15,
    description: 'Valor da comissão. Se PERCENTAGE = %, se FIXED = R$',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  commissionValue: number;

  // ── Dados TIM ─────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 50, description: 'Franquia de dados em GB' })
  @IsOptional()
  @IsInt()
  @Min(0)
  dataGb?: number;

  @ApiPropertyOptional({ example: 12, description: 'Fidelização em meses' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(48)
  loyaltyMonths?: number;

  @ApiPropertyOptional({ example: true, description: 'Inclui aparelho' })
  @IsOptional()
  @IsBoolean()
  includesDevice?: boolean;

  @ApiPropertyOptional({ example: ['WhatsApp', 'Instagram', 'TikTok'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedApps?: string[];

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

// =============================================================================
// ATUALIZAR PRODUTO
// =============================================================================
export class UpdateProductDto extends PartialType(CreateProductDto) {}

// =============================================================================
// QUERY / FILTROS
// =============================================================================
export class QueryProductDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'Black', description: 'Busca por nome ou código' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: ProductCategory })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 50, description: 'Preço mínimo' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  minPrice?: number;

  @ApiPropertyOptional({ example: 200, description: 'Preço máximo' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  maxPrice?: number;

  @ApiPropertyOptional({
    example: 'name',
    enum: ['name', 'code', 'price', 'category', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'name';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

// =============================================================================
// ALTERAR STATUS
// =============================================================================
export class UpdateProductStatusDto {
  @ApiProperty({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  status: ProductStatus;
}

// =============================================================================
// RESPOSTA
// =============================================================================
export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: ProductCategory }) category: ProductCategory;
  @ApiProperty() price: number;
  @ApiPropertyOptional() promoPrice?: number;
  @ApiProperty({ enum: CommissionType }) commissionType: CommissionType;
  @ApiProperty() commissionValue: number;
  @ApiPropertyOptional() dataGb?: number;
  @ApiPropertyOptional() loyaltyMonths?: number;
  @ApiPropertyOptional() includesDevice?: boolean;
  @ApiPropertyOptional() includedApps?: string[];
  @ApiProperty({ enum: ProductStatus }) status: ProductStatus;
  @ApiProperty() companyId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
