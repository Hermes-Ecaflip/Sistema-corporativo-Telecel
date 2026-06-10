// =============================================================================
// TELECEL SYSTEM — stock/dto/stock.dto.ts
// DTOs do módulo de Estoque: itens, transferências e aparelhos danificados
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsUUID, IsArray, IsNumber,
  IsPositive, Length, ArrayNotEmpty, MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { StoreBrand, StockStatus, DamageSeverity } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────
// ITENS DE ESTOQUE
// ─────────────────────────────────────────────────────────────────────────
export class CreateStockItemDto {
  @ApiProperty({ description: 'UUID do produto' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'UUID da loja onde o item entra' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ enum: StoreBrand, description: 'Setor/marca: TIM, MOTOROLA ou SAMSUNG' })
  @IsEnum(StoreBrand)
  brand: StoreBrand;

  @ApiPropertyOptional({ description: 'IMEI do aparelho (15 dígitos)', example: '356938035643809' })
  @IsOptional()
  @IsString()
  @Length(14, 20)
  imei?: string;

  @ApiPropertyOptional({ description: 'Código de barras / EAN' })
  @IsOptional()
  @IsString()
  @Length(6, 60)
  barcode?: string;

  @ApiPropertyOptional({ description: 'Número de série' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Preço de custo' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => (value !== undefined ? parseFloat(value) : undefined))
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateStockItemDto {
  @ApiPropertyOptional({ enum: StockStatus })
  @IsOptional()
  @IsEnum(StockStatus)
  status?: StockStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryStockDto {
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number;

  @ApiPropertyOptional({ enum: StoreBrand })
  @IsOptional() @IsEnum(StoreBrand) brand?: StoreBrand;

  @ApiPropertyOptional({ description: 'UUID da loja' })
  @IsOptional() @IsUUID() storeId?: string;

  @ApiPropertyOptional({ enum: StockStatus })
  @IsOptional() @IsEnum(StockStatus) status?: StockStatus;

  @ApiPropertyOptional({ description: 'Busca por IMEI, código de barras ou série' })
  @IsOptional() @IsString() search?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// TRANSFERÊNCIA ENTRE LOJAS
// ─────────────────────────────────────────────────────────────────────────
export class CreateTransferDto {
  @ApiProperty({ description: 'UUID da loja de origem' })
  @IsUUID()
  fromStoreId: string;

  @ApiProperty({ description: 'UUID da loja de destino (mesma marca da origem)' })
  @IsUUID()
  toStoreId: string;

  @ApiProperty({
    description: 'UUIDs dos itens de estoque a transferir',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  stockItemIds: string[];

  @ApiPropertyOptional({ description: 'Motivo da transferência' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveTransferDto {
  @ApiProperty({ description: 'Nome/assinatura do gerente que autoriza', example: 'Carlos Gerente' })
  @IsString()
  @MinLength(3)
  managerSignature: string;
}

// ─────────────────────────────────────────────────────────────────────────
// APARELHO DANIFICADO
// ─────────────────────────────────────────────────────────────────────────
export class CreateDamageReportDto {
  @ApiProperty({ description: 'UUID da loja' })
  @IsUUID()
  storeId: string;

  @ApiPropertyOptional({ description: 'UUID do item de estoque (se aplicável)' })
  @IsOptional()
  @IsUUID()
  stockItemId?: string;

  @ApiPropertyOptional({ description: 'IMEI do aparelho' })
  @IsOptional()
  @IsString()
  @Length(14, 20)
  imei?: string;

  @ApiProperty({ description: 'Nome do produto/aparelho', example: 'Samsung Galaxy S24 Ultra' })
  @IsString()
  productName: string;

  @ApiProperty({ enum: StoreBrand })
  @IsEnum(StoreBrand)
  brand: StoreBrand;

  @ApiProperty({ enum: DamageSeverity, default: DamageSeverity.MODERATE })
  @IsEnum(DamageSeverity)
  severity: DamageSeverity;

  @ApiProperty({ description: 'Descrição detalhada do dano' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({ description: 'Prejuízo estimado (R$)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => (value !== undefined ? parseFloat(value) : undefined))
  estimatedLoss?: number;
}
