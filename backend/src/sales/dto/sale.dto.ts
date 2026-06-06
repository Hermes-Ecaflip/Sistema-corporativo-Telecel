// =============================================================================
// TELECEL SYSTEM — sales/dto/sale.dto.ts
// DTOs de Vendas: criação com itens, filtros, aprovação/rejeição e resposta
// =============================================================================

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsArray, IsUUID,
  IsNumber, IsInt, Min, Max, MaxLength, IsDateString,
  ValidateNested, ArrayMinSize, IsPositive,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SaleStatus, SaleChannel, PaymentMethod } from '@prisma/client';

// =============================================================================
// ITEM DE VENDA
// =============================================================================
export class SaleItemDto {
  @ApiProperty({ description: 'UUID do produto' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;

  @ApiPropertyOptional({
    example: 79.90,
    description: 'Preço unitário negociado (usa preço do produto se omitido)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => (value != null ? parseFloat(value) : value))
  unitPrice?: number;

  @ApiPropertyOptional({ example: 'Portabilidade inclusa' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

// =============================================================================
// CRIAR VENDA
// =============================================================================
export class CreateSaleDto {
  @ApiProperty({ description: 'UUID do cliente' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ type: [SaleItemDto], description: 'Itens da venda (mín. 1)' })
  @IsArray()
  @ArrayMinSize(1, { message: 'A venda deve ter pelo menos um item' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiProperty({ enum: SaleChannel, example: SaleChannel.LOJA })
  @IsEnum(SaleChannel)
  channel: SaleChannel;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.DEBITO_AUTOMATICO })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'uuid-da-loja' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ example: '2025-08-01', description: 'Data de instalação/ativação' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: 'Cliente veio por indicação do João' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string;
}

// =============================================================================
// APROVAR / REJEITAR VENDA
// =============================================================================
export class ReviewSaleDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Documentação incompleta' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// =============================================================================
// CANCELAR VENDA
// =============================================================================
export class CancelSaleDto {
  @ApiProperty({ example: 'Cliente desistiu da portabilidade' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

// =============================================================================
// QUERY / FILTROS
// =============================================================================
export class QuerySaleDto {
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

  @ApiPropertyOptional({ enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ enum: SaleChannel })
  @IsOptional()
  @IsEnum(SaleChannel)
  channel?: SaleChannel;

  @ApiPropertyOptional({ description: 'UUID do vendedor' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional({ description: 'UUID do cliente' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'UUID da loja' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Data inicial (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Data final (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'totalAmount', 'status'],
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// =============================================================================
// RESPOSTA
// =============================================================================
export class SaleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() saleNumber: string;
  @ApiProperty({ enum: SaleStatus }) status: SaleStatus;
  @ApiProperty({ enum: SaleChannel }) channel: SaleChannel;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @ApiProperty() totalAmount: number;
  @ApiProperty() totalCommission: number;
  @ApiPropertyOptional() scheduledAt?: Date;
  @ApiPropertyOptional() approvedAt?: Date;
  @ApiPropertyOptional() rejectedAt?: Date;
  @ApiPropertyOptional() cancelledAt?: Date;
  @ApiPropertyOptional() reviewReason?: string;
  @ApiPropertyOptional() observations?: string;
  @ApiProperty() clientId: string;
  @ApiProperty() sellerId: string;
  @ApiProperty() companyId: string;
  @ApiPropertyOptional() storeId?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
