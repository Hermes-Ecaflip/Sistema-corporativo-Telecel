// =============================================================================
// TELECEL SYSTEM — auth/strategies/jwt.strategy.ts
// Estratégia JWT: valida access token e verifica blacklist no Redis
// =============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: string;
  companyId: string;
  storeId?: string;
  jti: string;        // JWT ID único (para blacklist)
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      // Extrai token do header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      issuer: 'telecel-system',
      audience: 'telecel-app',
      // Passa o request inteiro para validate() — necessário para blacklist check
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    // 1. Verificar se token está na blacklist (logout)
    if (payload.jti) {
      const isBlacklisted = await this.redis.isTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }
    }

    // 2. Verificar se usuário ainda existe e está ativo
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        companyId: true,
        storeId: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        `Conta ${user.status === UserStatus.SUSPENDED ? 'suspensa' : 'inativa'}. Contate o administrador.`,
      );
    }

    // 3. Retornar payload que ficará disponível via @CurrentUser()
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
      storeId: user.storeId,
      twoFactorEnabled: user.twoFactorEnabled,
      jti: payload.jti,
    };
  }
}
