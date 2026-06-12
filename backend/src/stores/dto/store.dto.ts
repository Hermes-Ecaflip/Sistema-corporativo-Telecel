// =============================================================================
// TELECEL SYSTEM — stores/dto/store.dto.ts
// DTOs de criação/edição de loja e consulta.
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsArray, IsBoolean, Length, MinLength,
} from 'class-validator';
import { StoreBrand, Sector } from '@prisma/client';

export class CreateStoreDto {
  @ApiProperty({ description: 'Nome da loja', example: 'TIM Planaltina' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'Código interno único', example: 'TIM-PLAN-DF' })
  @IsString()
  @Length(2, 20)
  code: string;

  @ApiProperty({ enum: StoreBrand, description: 'Marca da loja' })
  @IsEnum(StoreBrand)
  brand: StoreBrand;

  @ApiProperty({
    enum: Sector, isArray: true,
    description: 'Setores que a loja opera',
    example: [Sector.VENDAS, Sector.ESTOQUE],
  })
  @IsArray()
  @IsEnum(Sector, { each: true })
  sectors: Sector[];

  // Endereço
  @ApiPropertyOptional({ example: '73000-000' })
  @IsOptional() @IsString() zipCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional({ example: 'Planaltina' }) @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional({ example: 'DF' }) @IsOptional() @IsString() @Length(2, 2) state?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
}

export class UpdateStoreDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: StoreBrand }) @IsOptional() @IsEnum(StoreBrand) brand?: StoreBrand;
  @ApiPropertyOptional({ enum: Sector, isArray: true })
  @IsOptional() @IsArray() @IsEnum(Sector, { each: true }) sectors?: Sector[];

  @ApiPropertyOptional() @IsOptional() @IsString() zipCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 2) state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QueryStoreDto {
  @ApiPropertyOptional({ enum: StoreBrand })
  @IsOptional() @IsEnum(StoreBrand) brand?: StoreBrand;

  @ApiPropertyOptional({ description: 'Filtrar por UF' })
  @IsOptional() @IsString() state?: string;
}
