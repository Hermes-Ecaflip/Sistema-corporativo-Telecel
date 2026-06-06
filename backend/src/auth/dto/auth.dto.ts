// =============================================================================
// TELECEL SYSTEM — auth/dto/login.dto.ts
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    example: 'vendedor@telecel.com.br',
    description: 'E-mail do usuário',
  })
  @IsEmail({}, { message: 'E-mail inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'Telecel@2025', description: 'Senha do usuário' })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(128)
  password: string;

  @ApiProperty({
    example: false,
    description: 'Manter sessão por 7 dias',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

// =============================================================================
// auth/dto/register.dto.ts
// =============================================================================

import { IsNotEmpty, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'joao.silva@telecel.com.br' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: '+5511999999999' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'Telecel@2025',
    description:
      'Mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Senha deve conter maiúscula, minúscula, número e caractere especial',
    },
  )
  password: string;

  @ApiProperty({ example: 'Telecel@2025' })
  @IsString()
  passwordConfirm: string;
}

// =============================================================================
// auth/dto/refresh-token.dto.ts
// =============================================================================

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token JWT' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// =============================================================================
// auth/dto/forgot-password.dto.ts
// =============================================================================

export class ForgotPasswordDto {
  @ApiProperty({ example: 'joao.silva@telecel.com.br' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}

// =============================================================================
// auth/dto/reset-password.dto.ts
// =============================================================================

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recebido por e-mail' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NovaSenha@2025' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    { message: 'Senha deve conter maiúscula, minúscula, número e especial' },
  )
  password: string;

  @ApiProperty()
  @IsString()
  passwordConfirm: string;
}

// =============================================================================
// auth/dto/verify-2fa.dto.ts
// =============================================================================

export class Verify2FADto {
  @ApiProperty({
    example: '123456',
    description: 'Código TOTP de 6 dígitos do authenticator',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'Código deve ter exatamente 6 dígitos' })
  code: string;

  @ApiProperty({
    description: 'Token temporário de sessão pré-2FA',
    required: false,
  })
  @IsOptional()
  @IsString()
  twoFactorSessionToken?: string;
}

// =============================================================================
// auth/dto/change-password.dto.ts
// =============================================================================

export class ChangePasswordDto {
  @ApiProperty({ example: 'SenhaAtual@2025' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NovaSenha@2025' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    { message: 'Senha deve conter maiúscula, minúscula, número e especial' },
  )
  newPassword: string;

  @ApiProperty()
  @IsString()
  newPasswordConfirm: string;
}
