// =============================================================================
// TELECEL SYSTEM — auth/auth.service.ts
// Serviço de autenticação: login, logout, 2FA, tokens, reset de senha
// =============================================================================

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { TwoFactorService } from './two-factor.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  Verify2FADto,
} from './dto/auth.dto';
import { UserRole, UserStatus, AuditAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Constantes de segurança
const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_SECONDS = 900; // 15 minutos

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends AuthTokens {
  requiresTwoFactor?: boolean;
  twoFactorSessionToken?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
    storeId?: string;
    twoFactorEnabled: boolean;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly twoFactor: TwoFactorService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── LOGIN ─────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ip: string,
    userAgent: string,
  ): Promise<LoginResponse> {
    const { email, password, rememberMe } = dto;

    // 1. Verificar bloqueio por brute force (por IP + por e-mail)
    await this.checkBruteForce(email, ip);

    // 2. Buscar usuário
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      // Incrementar contador mesmo para e-mails inexistentes (evitar user enumeration)
      await this.handleFailedLogin(email, ip);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 3. Verificar status da conta
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Conta suspensa. Contate o administrador.');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Conta inativa. Verifique seu e-mail ou contate o suporte.');
    }

    // 4. Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const attempts = await this.handleFailedLogin(email, ip);
      const remaining = MAX_FAILED_ATTEMPTS - attempts;

      if (remaining <= 0) {
        throw new UnauthorizedException(
          `Conta bloqueada por ${LOCK_DURATION_SECONDS / 60} minutos após múltiplas tentativas falhas.`,
        );
      }

      throw new UnauthorizedException(
        `Credenciais inválidas. ${remaining} tentativa(s) restante(s) antes do bloqueio.`,
      );
    }

    // 5. Reset do contador de tentativas após sucesso
    await this.redis.resetFailedLogin(email);
    await this.redis.resetFailedLogin(ip);

    // 6. Verificar 2FA
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Criar sessão temporária antes do 2FA
      const sessionToken = randomBytes(32).toString('hex');
      await this.redis.store2FASession(user.id, sessionToken);

      await this.audit.log({
        userId: user.id,
        companyId: user.companyId,
        action: AuditAction.LOGIN,
        entity: 'User',
        entityId: user.id,
        description: 'Login com senha válida — aguardando 2FA',
        ip,
        userAgent,
      });

      return {
        requiresTwoFactor: true,
        twoFactorSessionToken: sessionToken,
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          storeId: user.storeId ?? undefined,
          twoFactorEnabled: true,
        },
      };
    }

    // 7. Gerar tokens JWT
    const tokens = await this.generateTokens(user, rememberMe);

    // 8. Atualizar lastLogin
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, failedLoginCount: 0 },
    });

    await this.audit.log({
      userId: user.id,
      companyId: user.companyId,
      action: AuditAction.LOGIN,
      entity: 'User',
      entityId: user.id,
      description: 'Login realizado com sucesso',
      ip,
      userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        storeId: user.storeId ?? undefined,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  // ─── VERIFICAÇÃO 2FA ───────────────────────────────────────────────────

  async verifyTwoFactor(
    userId: string,
    dto: Verify2FADto,
    ip: string,
    userAgent: string,
  ): Promise<LoginResponse> {
    // 1. Verificar sessão temporária
    const storedToken = await this.redis.get2FASession(userId);
    if (!storedToken || storedToken !== dto.twoFactorSessionToken) {
      throw new UnauthorizedException('Sessão 2FA inválida ou expirada. Faça login novamente.');
    }

    // 2. Buscar usuário e secret
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // 3. Validar código TOTP
    this.twoFactor.validateCodeOrThrow(user.twoFactorSecret, dto.code);

    // 4. Remover sessão temporária
    await this.redis.delete2FASession(userId);

    // 5. Gerar tokens finais
    const tokens = await this.generateTokens(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    await this.audit.log({
      userId: user.id,
      companyId: user.companyId,
      action: AuditAction.LOGIN,
      entity: 'User',
      entityId: user.id,
      description: 'Login 2FA concluído com sucesso',
      ip,
      userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        storeId: user.storeId ?? undefined,
        twoFactorEnabled: true,
      },
    };
  }

  // ─── REFRESH TOKEN ─────────────────────────────────────────────────────

  async refreshTokens(user: any): Promise<AuthTokens> {
    // O RefreshTokenStrategy já revogou o token usado (Rotation)
    // Aqui apenas geramos um novo par
    const freshUser = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
    });

    if (!freshUser) throw new UnauthorizedException('Usuário não encontrado');

    return this.generateTokens(freshUser);
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────

  async logout(userId: string, jti: string, ip: string, userAgent: string): Promise<void> {
    // 1. Adicionar access token à blacklist até ele expirar naturalmente
    const expiresIn = this.configService.get<number>('jwt.expiresIn', 900);
    await this.redis.blacklistToken(jti, expiresIn);

    // 2. Revogar TODOS os refresh tokens do usuário (sessão atual)
    // Para logout somente da sessão atual, revogar apenas o token específico
    await this.redis.revokeAllRefreshTokens(userId);

    await this.audit.log({
      userId,
      companyId: '',
      action: AuditAction.LOGOUT,
      entity: 'User',
      entityId: userId,
      description: 'Logout realizado',
      ip,
      userAgent,
    });
  }

  // ─── REGISTRO ──────────────────────────────────────────────────────────

  async register(dto: RegisterDto, companyId: string): Promise<{ message: string }> {
    const { email, password, passwordConfirm, name, phone } = dto;

    if (password !== passwordConfirm) {
      throw new BadRequestException('As senhas não coincidem');
    }

    // Verificar duplicidade de e-mail
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verificationToken = randomBytes(32).toString('hex');

    await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        companyId,
        role: UserRole.VENDEDOR,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerificationToken: verificationToken,
      },
    });

    // Enviar e-mail de verificação
    await this.notifications.sendEmailVerification(email, name, verificationToken);

    return { message: 'Cadastro realizado. Verifique seu e-mail para ativar a conta.' };
  }

  // ─── RECUPERAÇÃO DE SENHA ──────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    // Resposta genérica — não revelar se e-mail existe
    const genericResponse = {
      message: 'Se este e-mail estiver cadastrado, você receberá as instruções em instantes.',
    };

    if (!user) return genericResponse;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hora

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expiresAt },
    });

    await this.redis.storePasswordResetToken(user.id, token);
    await this.notifications.sendPasswordResetEmail(user.email, user.name, token);

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, password, passwordConfirm } = dto;

    if (password !== passwordConfirm) {
      throw new BadRequestException('As senhas não coincidem');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Revogar todas as sessões por segurança
    await this.redis.revokeAllRefreshTokens(user.id);
    await this.redis.deletePasswordResetToken(user.id);

    return { message: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword, newPasswordConfirm } = dto;

    if (newPassword !== newPasswordConfirm) {
      throw new BadRequestException('As senhas não coincidem');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Senha atual incorreta');

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Revogar refresh tokens por segurança (força novo login)
    await this.redis.revokeAllRefreshTokens(userId);

    return { message: 'Senha alterada com sucesso. Faça login novamente.' };
  }

  // ─── ATIVAÇÃO 2FA ──────────────────────────────────────────────────────

  async enable2FA(userId: string): Promise<{ qrCode: string; secret: string; backupCodes: string[] }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA já está ativado');
    }

    const secret = this.twoFactor.generateSecret();
    const encryptedSecret = this.twoFactor.encryptSecret(secret);
    const qrCode = await this.twoFactor.generateQRCode(user.email, secret);
    const backupCodes = this.twoFactor.generateBackupCodes();

    // Salvar secret encriptado (ainda não ativado — aguarda confirmação)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encryptedSecret },
    });

    return { qrCode, secret, backupCodes };
  }

  async confirm2FA(userId: string, dto: Verify2FADto): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Inicie o processo de ativação do 2FA primeiro');
    }

    this.twoFactor.validateCodeOrThrow(user.twoFactorSecret, dto.code);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: '2FA ativado com sucesso!' };
  }

  async disable2FA(userId: string, dto: Verify2FADto): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA não está ativado');
    }

    this.twoFactor.validateCodeOrThrow(user.twoFactorSecret, dto.code);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return { message: '2FA desativado com sucesso' };
  }

  // ─── Utilitários privados ──────────────────────────────────────────────

  private async generateTokens(user: any, rememberMe = false): Promise<AuthTokens> {
    const jti = uuidv4(); // ID único do access token
    const refreshJti = uuidv4(); // ID único do refresh token

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      storeId: user.storeId,
      jti,
    };

    const accessExpiresIn = 15 * 60; // 15 minutos em segundos
    const refreshExpiresIn = rememberMe
      ? 30 * 24 * 60 * 60  // 30 dias
      : 7 * 24 * 60 * 60;  // 7 dias padrão

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: accessExpiresIn,
        jwtid: jti,
      }),
      this.jwtService.signAsync(
        { sub: user.id, jti: refreshJti },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: refreshExpiresIn,
          issuer: 'telecel-system',
          audience: 'telecel-app',
          jwtid: refreshJti,
        },
      ),
    ]);

    // Armazenar refresh token no Redis
    await this.redis.storeRefreshToken(user.id, refreshJti, refreshExpiresIn);

    return { accessToken, refreshToken, expiresIn: accessExpiresIn };
  }

  private async checkBruteForce(email: string, ip: string): Promise<void> {
    const emailAttempts = await this.redis.getFailedLoginCount(email);
    const ipAttempts = await this.redis.getFailedLoginCount(ip);

    if (emailAttempts >= MAX_FAILED_ATTEMPTS || ipAttempts >= MAX_FAILED_ATTEMPTS) {
      const ttl = await this.redis.getLockTTL(
        emailAttempts >= MAX_FAILED_ATTEMPTS ? email : ip,
      );
      const minutes = Math.ceil(ttl / 60);
      throw new UnauthorizedException(
        `Muitas tentativas falhas. Tente novamente em ${minutes} minuto(s).`,
      );
    }
  }

  private async handleFailedLogin(email: string, ip: string): Promise<number> {
    const [emailCount] = await Promise.all([
      this.redis.incrementFailedLogin(email),
      this.redis.incrementFailedLogin(ip),
    ]);
    return emailCount;
  }
}
