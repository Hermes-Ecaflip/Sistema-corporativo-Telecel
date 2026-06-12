// =============================================================================
// TELECEL SYSTEM — users/dto/user.dto.ts
// DTOs de Usuários: criação, atualização, filtros e resposta
// =============================================================================

import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Exclude, Expose } from 'class-transformer';
import { UserRole, UserStatus, Sector } from '@prisma/client';

// =============================================================================
// CREATE USER DTO
// =============================================================================
export class CreateUserDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'joao.silva@telecel.com.br' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: '+5511999999999' })
  @IsString()
  @Matches(/^\+?[\d\s\-\(\)]{10,20}$/, { message: 'Telefone inválido' })
  phone: string;

  @ApiProperty({
    example: 'Telecel@2025',
    description: 'Mínimo 8 chars, maiúscula, minúscula, número e especial',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Senha deve conter maiúscula, minúscula, número e caractere especial',
  })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.VENDEDOR })
  @IsEnum(UserRole, { message: `Papel inválido. Válidos: ${Object.values(UserRole).join(', ')}` })
  role: UserRole;

  @ApiPropertyOptional({ enum: Sector, example: Sector.VENDAS, description: 'Setor do funcionário' })
  @IsOptional()
  @IsEnum(Sector)
  sector?: Sector;

  @ApiPropertyOptional({ example: 'uuid-da-loja' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ example: '123.456.789-09' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, { message: 'CPF inválido. Formato: 000.000.000-00' })
  cpf?: string;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'Data de nascimento (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}

// =============================================================================
// UPDATE USER DTO — todos os campos opcionais exceto senha (tem fluxo próprio)
// =============================================================================
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'email'] as const),
) {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

// =============================================================================
// QUERY / FILTER DTO — filtros e paginação para listagem
// =============================================================================
export class QueryUserDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'João', description: 'Busca por nome, e-mail ou CPF' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'uuid-da-loja' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    enum: ['name', 'email', 'role', 'status', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// =============================================================================
// RESPONSE DTO — dados seguros retornados ao cliente (sem senha, sem 2FA secret)
// =============================================================================
export class UserResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiProperty()
  phone: string;

  @Expose()
  @ApiPropertyOptional()
  cpf?: string;

  @Expose()
  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @Expose()
  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @Expose()
  @ApiProperty()
  companyId: string;

  @Expose()
  @ApiPropertyOptional()
  storeId?: string;

  @Expose()
  @ApiProperty()
  twoFactorEnabled: boolean;

  @Expose()
  @ApiPropertyOptional()
  avatarUrl?: string;

  @Expose()
  @ApiPropertyOptional()
  lastLoginAt?: Date;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  // Campos sensíveis — nunca expostos na API
  @Exclude()
  password: string;

  @Exclude()
  twoFactorSecret: string;

  @Exclude()
  passwordResetToken: string;

  @Exclude()
  emailVerificationToken: string;
}

// =============================================================================
// ADMIN UPDATE STATUS DTO — exclusivo para Admin alterar status de usuário
// =============================================================================
export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({ example: 'Violação das políticas de uso' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
