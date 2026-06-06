// =============================================================================
// TELECEL SYSTEM — commissions/dto/commission.dto.ts
// DTOs de Comissões: filtros, aprovação, pagamento e resposta
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsUUID, IsInt,
  Min, Max, Matches, MaxLength, IsArray, ArrayMinSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CommissionStatus } from '@prisma/client';

// =============================================================================
// QUERY / FILTROS
// =============================================================================
export class QueryCommissionDto {
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

  @ApiPropertyOptional({ enum: CommissionStatus })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiPropertyOptional({ description: 'UUID do vendedor' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    example: '2025-08',
    description: 'Mês de referência (formato AAAA-MM)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato inválido. Use AAAA-MM' })
  referenceMonth?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'amount', 'referenceMonth'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// =============================================================================
// APROVAR COMISSÕES EM LOTE
// =============================================================================
export class ApproveCommissionsDto {
  @ApiProperty({
    type: [String],
    description: 'UUIDs das comissões a aprovar',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos uma comissão' })
  @IsUUID('4', { each: true })
  commissionIds: string[];
}

// =============================================================================
// MARCAR COMO PAGA
// =============================================================================
export class PayCommissionsDto {
  @ApiProperty({
    type: [String],
    description: 'UUIDs das comissões a marcar como pagas',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  commissionIds: string[];

  @ApiPropertyOptional({ example: 'Pagamento via folha — agosto/2025' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  paymentNote?: string;
}

// =============================================================================
// FECHAMENTO MENSAL POR VENDEDOR
// =============================================================================
export class CloseMonthDto {
  @ApiProperty({ example: '2025-08', description: 'Mês de referência (AAAA-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato inválido. Use AAAA-MM' })
  referenceMonth: string;
}

// =============================================================================
// RESPOSTA
// =============================================================================
export class CommissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: CommissionStatus }) status: CommissionStatus;
  @ApiProperty() referenceMonth: string;
  @ApiProperty() saleId: string;
  @ApiProperty() userId: string;
  @ApiProperty() companyId: string;
  @ApiPropertyOptional() approvedAt?: Date;
  @ApiPropertyOptional() paidAt?: Date;
  @ApiPropertyOptional() paymentNote?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
