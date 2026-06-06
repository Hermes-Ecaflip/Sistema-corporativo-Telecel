// =============================================================================
// TELECEL SYSTEM — auth/auth.controller.ts
// Controller de autenticação: login, logout, 2FA, tokens, senha
// =============================================================================

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  Verify2FADto,
} from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';
import { ConfigService } from '@nestjs/config';

// TTL do cookie de refresh token em ms
const REFRESH_COOKIE_OPTIONS = (maxAge: number) => ({
  httpOnly: true,         // Não acessível via JS (proteção XSS)
  secure: process.env.NODE_ENV === 'production', // HTTPS em produção
  sameSite: 'strict' as const, // Proteção CSRF
  path: '/api/v1/auth',  // Cookie restrito ao path de auth
  maxAge,
});

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── LOGIN ───────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // Throttle extra em login
  @ApiOperation({ summary: 'Autenticar usuário (Login)' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas — conta bloqueada' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.login(dto, ip, userAgent ?? '');

    // Se requer 2FA, não definir cookie ainda
    if (result.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        twoFactorSessionToken: result.twoFactorSessionToken,
        user: { id: result.user.id, email: result.user.email },
      };
    }

    // Definir refresh token em cookie httpOnly
    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  // ─── VERIFICAR CÓDIGO 2FA ─────────────────────────────────────────────────

  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verificar código 2FA após login com senha' })
  @ApiResponse({ status: 200, description: 'Autenticação 2FA concluída' })
  @ApiResponse({ status: 401, description: 'Código inválido ou sessão expirada' })
  async verifyTwoFactor(
    @Body() dto: Verify2FADto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Body('userId') userId: string,
  ) {
    const result = await this.authService.verifyTwoFactor(
      userId,
      dto,
      ip,
      userAgent ?? '',
    );

    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────────────────

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token via refresh token (cookie)' })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({ status: 200, description: 'Tokens renovados (rotation automática)' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  async refresh(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(user);
    this.setRefreshCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Encerrar sessão atual' })
  @ApiResponse({ status: 200, description: 'Logout realizado' })
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.authService.logout(user.id, user.jti, ip, userAgent ?? '');

    // Limpar cookie de refresh token
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });

    return { message: 'Logout realizado com sucesso' };
  }

  // ─── PERFIL DO USUÁRIO AUTENTICADO ────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retornar dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado' })
  me(@CurrentUser() user: any) {
    return user;
  }

  // ─── CADASTRO ─────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ medium: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Cadastrar novo usuário (requer convite ou companyId)' })
  @ApiResponse({ status: 201, description: 'Cadastro realizado — verifique o e-mail' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  async register(
    @Body() dto: RegisterDto,
    @Headers('x-company-id') companyId: string,
  ) {
    return this.authService.register(dto, companyId);
  }

  // ─── RECUPERAÇÃO DE SENHA ─────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Solicitar link de recuperação de senha' })
  @ApiResponse({ status: 200, description: 'Se o e-mail existir, um link será enviado' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinir senha com token recebido por e-mail' })
  @ApiResponse({ status: 200, description: 'Senha redefinida' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Patch('change-password')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Alterar senha (usuário autenticado)' })
  @ApiResponse({ status: 200, description: 'Senha alterada — será necessário novo login' })
  changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  // ─── GESTÃO 2FA ───────────────────────────────────────────────────────────

  @Get('2fa/setup')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Iniciar configuração do 2FA — gera QR Code' })
  @ApiResponse({ status: 200, description: 'QR Code e backup codes gerados' })
  enable2FA(@CurrentUser() user: any) {
    return this.authService.enable2FA(user.id);
  }

  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Confirmar e ativar 2FA com primeiro código válido' })
  @ApiResponse({ status: 200, description: '2FA ativado com sucesso' })
  confirm2FA(@CurrentUser() user: any, @Body() dto: Verify2FADto) {
    return this.authService.confirm2FA(user.id, dto);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Desativar 2FA (requer código válido)' })
  @ApiResponse({ status: 200, description: '2FA desativado' })
  disable2FA(@CurrentUser() user: any, @Body() dto: Verify2FADto) {
    return this.authService.disable2FA(user.id, dto);
  }

  // ─── Utilitário privado ───────────────────────────────────────────────────

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const refreshTTLDays = 7;
    res.cookie(
      'refresh_token',
      refreshToken,
      REFRESH_COOKIE_OPTIONS(refreshTTLDays * 24 * 60 * 60 * 1000),
    );
  }
}
