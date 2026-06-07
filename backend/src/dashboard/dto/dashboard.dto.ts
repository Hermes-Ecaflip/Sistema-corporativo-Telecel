// =============================================================================
// TELECEL SYSTEM — dashboard/dto/dashboard.dto.ts
// DTOs do Dashboard: filtros de período e gestão de metas
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsUUID, IsNumber,
  IsPositive, Matches, IsInt, Min, Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { GoalType, StoreBrand } from '@prisma/client';

// Período pré-definido para os KPIs
export enum DashboardPeriod {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

// =============================================================================
// QUERY DO DASHBOARD
// =============================================================================
export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: DashboardPeriod, default: DashboardPeriod.MONTH })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod = DashboardPeriod.MONTH;

  @ApiPropertyOptional({
    enum: StoreBrand,
    description: 'Filtrar por marca/bandeira (TIM, MOTOROLA, SAMSUNG)',
  })
  @IsOptional()
  @IsEnum(StoreBrand)
  brand?: StoreBrand;

  @ApiPropertyOptional({ description: 'UUID da loja específica (filtro opcional)' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ description: 'UUID do vendedor (filtro opcional)' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;
}

// =============================================================================
// CRIAR / DEFINIR META
// =============================================================================
export class CreateGoalDto {
  @ApiProperty({ enum: GoalType, example: GoalType.REVENUE })
  @IsEnum(GoalType)
  type: GoalType;

  @ApiProperty({ example: '2025-08', description: 'Mês de referência (AAAA-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato inválido. Use AAAA-MM' })
  referenceMonth: string;

  @ApiProperty({ example: 50000, description: 'Valor da meta (R$ ou quantidade)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  targetValue: number;

  @ApiPropertyOptional({ description: 'UUID do vendedor (meta individual)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'UUID da loja (meta da loja)' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

// =============================================================================
// ATUALIZAR META
// =============================================================================
export class UpdateGoalDto {
  @ApiProperty({ example: 60000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  targetValue: number;
}
