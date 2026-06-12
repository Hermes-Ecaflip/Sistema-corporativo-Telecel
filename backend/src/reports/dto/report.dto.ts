// =============================================================================
// TELECEL SYSTEM — reports/dto/report.dto.ts
// DTOs de Relatórios: tipo, formato e filtros de período
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsUUID, IsDateString, Matches,
} from 'class-validator';

// Tipos de relatório disponíveis
export enum ReportType {
  SALES = 'SALES',                 // Vendas detalhadas
  COMMISSIONS = 'COMMISSIONS',     // Comissões por vendedor
  FINANCIAL = 'FINANCIAL',         // Resultado financeiro mensal
  CLIENTS = 'CLIENTS',             // Carteira de clientes
  PRODUCTS = 'PRODUCTS',           // Desempenho de produtos
}

// Formatos de exportação
export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  JPG = 'JPG',
}

// =============================================================================
// GERAR RELATÓRIO
// =============================================================================
export class GenerateReportDto {
  @ApiProperty({ enum: ReportType, example: ReportType.SALES })
  @IsEnum(ReportType, {
    message: `Tipo inválido. Válidos: ${Object.values(ReportType).join(', ')}`,
  })
  type: ReportType;

  @ApiProperty({ enum: ReportFormat, example: ReportFormat.PDF })
  @IsEnum(ReportFormat, {
    message: `Formato inválido. Válidos: ${Object.values(ReportFormat).join(', ')}`,
  })
  format: ReportFormat;

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Data inicial (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Data final (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: '2025-08',
    description: 'Mês de referência (AAAA-MM) — para relatórios mensais',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato inválido. Use AAAA-MM' })
  referenceMonth?: string;

  @ApiPropertyOptional({ description: 'UUID do vendedor (filtro opcional)' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional({ description: 'UUID da loja (filtro opcional)' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}
