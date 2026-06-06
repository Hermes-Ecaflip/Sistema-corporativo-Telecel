// =============================================================================
// TELECEL SYSTEM — clients/dto/client.dto.ts
// DTOs de Clientes: criação, atualização, endereço, filtros e resposta
// =============================================================================

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsEmail, IsEnum, IsOptional, IsBoolean,
  IsDateString, MaxLength, MinLength, Matches,
  ValidateNested, IsArray, IsInt, Min, Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PersonType, ClientStatus } from '@prisma/client';
import { IsCpf, IsCnpj } from '../../common/utils/cpf-cnpj.util';

// =============================================================================
// ENDEREÇO
// =============================================================================
export class AddressDto {
  @ApiProperty({ example: '01310-100' })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido. Formato: 00000-000' })
  zipCode: string;

  @ApiProperty({ example: 'Avenida Paulista' })
  @IsString()
  @MaxLength(200)
  street: string;

  @ApiProperty({ example: '1578' })
  @IsString()
  @MaxLength(20)
  number: string;

  @ApiPropertyOptional({ example: 'Apto 42' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @ApiProperty({ example: 'Bela Vista' })
  @IsString()
  @MaxLength(100)
  district: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  state: string;

  @ApiPropertyOptional({ example: 'Residencial' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;
}

// =============================================================================
// CRIAR CLIENTE
// =============================================================================
export class CreateClientDto {
  @ApiProperty({ enum: PersonType, example: PersonType.PF })
  @IsEnum(PersonType)
  personType: PersonType;

  @ApiProperty({ example: 'Maria Oliveira' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  // ── Pessoa Física ─────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: '123.456.789-09', description: 'Obrigatório para PF' })
  @IsOptional()
  @IsString()
  @IsCpf({ message: 'CPF inválido' })
  @Transform(({ value }) => value?.replace(/\D/g, '')
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'))
  cpf?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-95', description: 'Obrigatório para PJ' })
  @IsOptional()
  @IsString()
  @IsCnpj({ message: 'CNPJ inválido' })
  @Transform(({ value }) => value?.replace(/\D/g, '')
    .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'))
  cnpj?: string;

  @ApiPropertyOptional({ example: '12.345.678-X' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rg?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  // ── Contato ───────────────────────────────────────────────────────────────
  @ApiProperty({ example: '(11) 99999-9999' })
  @IsString()
  @Matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, { message: 'Telefone inválido' })
  phone: string;

  @ApiPropertyOptional({ example: '(11) 98888-8888' })
  @IsOptional()
  @IsString()
  @Matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, { message: 'Telefone inválido' })
  phone2?: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'maria.oliveira@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  // ── Endereço principal ────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  // ── TIM ───────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: '11999999999', description: 'Linha TIM atual' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  timLine?: string;

  @ApiPropertyOptional({ example: '8991234567890123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  iccid?: string;

  @ApiPropertyOptional({ example: 'Cliente indicado por João Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string;
}

// =============================================================================
// ATUALIZAR CLIENTE
// =============================================================================
export class UpdateClientDto extends PartialType(CreateClientDto) {}

// =============================================================================
// QUERY / FILTROS
// =============================================================================
export class QueryClientDto {
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

  @ApiPropertyOptional({
    example: 'Maria',
    description: 'Busca por nome, CPF, CNPJ, telefone, e-mail ou linha TIM',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: PersonType })
  @IsOptional()
  @IsEnum(PersonType)
  personType?: PersonType;

  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional({ example: 'SP', description: 'Filtrar por estado' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    example: 'name',
    enum: ['name', 'createdAt', 'fraudScore', 'phone'],
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
// ALTERAR STATUS DO CLIENTE
// =============================================================================
export class UpdateClientStatusDto {
  @ApiProperty({ enum: ClientStatus })
  @IsEnum(ClientStatus)
  status: ClientStatus;

  @ApiPropertyOptional({ example: 'Suspeita de fraude detectada' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// =============================================================================
// RESPOSTA PÚBLICA DO CLIENTE
// =============================================================================
export class ClientResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: PersonType }) personType: PersonType;
  @ApiPropertyOptional() cpf?: string;
  @ApiPropertyOptional() cnpj?: string;
  @ApiPropertyOptional() rg?: string;
  @ApiPropertyOptional() birthDate?: Date;
  @ApiProperty() phone: string;
  @ApiPropertyOptional() phone2?: string;
  @ApiPropertyOptional() whatsapp?: string;
  @ApiPropertyOptional() email?: string;
  @ApiProperty({ enum: ClientStatus }) status: ClientStatus;
  @ApiProperty() fraudScore: number;
  @ApiPropertyOptional() zipCode?: string;
  @ApiPropertyOptional() street?: string;
  @ApiPropertyOptional() number?: string;
  @ApiPropertyOptional() complement?: string;
  @ApiPropertyOptional() district?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() state?: string;
  @ApiPropertyOptional() timLine?: string;
  @ApiPropertyOptional() iccid?: string;
  @ApiPropertyOptional() observations?: string;
  @ApiProperty() companyId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
