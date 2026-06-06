// =============================================================================
// TELECEL SYSTEM — financial/dto/financial.dto.ts
// DTOs do Financeiro: fechamento mensal, movimentos, consultas e resposta
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsUUID, IsInt,
  Min, Max, Matches, MaxLength, IsNumber, IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { FinancialCloseStatus, MovementType } from '@prisma/client';

// =============================================================================
// EXECUTAR FECHAMENTO MENSAL
// =============================================================================
export class CreateFinancialCloseDto {
  @ApiProperty({ example: '2025-08', description: 'Mês de referência (AAAA-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato inválido. Use AAAA-MM' })
  referenceMonth: string;

  @ApiPropertyOptional({ description: 'UUID da loja (omitir = consolidado geral)' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ example: 'Fechamento referente a agosto/2025' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// =============================================================================
// LANÇAMENTO MANUAL DE MOVIMENTO (despesa/receita avulsa)
// =============================================================================
export class CreateMovementDto {
  @ApiProperty({ enum: MovementType, example: MovementType.EXPENSE })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ example: 'Aluguel da loja matriz' })
  @IsString()
  @MaxLength(300)
  description: string;

  @ApiProperty({ example: 4500.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Valor deve ser maior que zero' })
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({ example: '2025-08', description: 'Mês de referência (AAAA-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato inválido. Use AAAA-MM' })
  referenceMonth: string;

  @ApiPropertyOptional({ example: 'Despesas Operacionais' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'UUID da loja relacionada' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

// =============================================================================
// QUERY / FILTROS DE FECHAMENTOS
// =============================================================================
export class QueryFinancialDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 12;

  @ApiPropertyOptional({ enum: FinancialCloseStatus })
  @IsOptional()
  @IsEnum(FinancialCloseStatus)
  status?: FinancialCloseStatus;

  @ApiPropertyOptional({ example: '2025', description: 'Filtrar por ano (AAAA)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Ano inválido. Use AAAA' })
  year?: string;

  @ApiPropertyOptional({ description: 'UUID da loja' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

// =============================================================================
// RESPOSTA DO FECHAMENTO
// =============================================================================
export class FinancialCloseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() referenceMonth: string;
  @ApiProperty({ enum: FinancialCloseStatus }) status: FinancialCloseStatus;
  @ApiProperty({ description: 'Receita bruta aprovada (R$)' }) grossRevenue: number;
  @ApiProperty({ description: 'Total de comissões (R$)' }) totalCommissions: number;
  @ApiProperty({ description: 'Outras despesas (R$)' }) totalExpenses: number;
  @ApiProperty({ description: 'Resultado líquido (R$)' }) netResult: number;
  @ApiProperty({ description: 'Qtd. de vendas aprovadas' }) salesCount: number;
  @ApiPropertyOptional() storeId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() closedAt?: Date;
  @ApiProperty() companyId: string;
  @ApiProperty() createdAt: Date;
}
