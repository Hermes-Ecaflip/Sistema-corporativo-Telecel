// =============================================================================
// TELECEL SYSTEM — auth/strategies/refresh-token.strategy.ts
// Estratégia de Refresh Token: valida via cookie httpOnly + Redis
// =============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface RefreshTokenPayload {
  sub: string;    // userId
  jti: string;    // Token ID único
  iat?: number;
  exp?: number;
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Extrair refresh token do cookie httpOnly
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Prioridade: cookie httpOnly → body (fallback para testes)
          return (
            request?.cookies?.['refresh_token'] ||
            request?.body?.refreshToken ||
            null
          );
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      issuer: 'telecel-system',
      audience: 'telecel-app',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshTokenPayload) {
    const { sub: userId, jti } = payload;

    // 1. Verificar se o token ID ainda está válido no Redis
    // (rotation: após uso, o token é removido e um novo é gerado)
    const isValid = await this.redis.isRefreshTokenValid(userId, jti);
    if (!isValid) {
      throw new UnauthorizedException(
        'Refresh token inválido, expirado ou já utilizado. Faça login novamente.',
      );
    }

    // 2. Verificar usuário no banco
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
        storeId: true,
      },
    });

    if (!user) {
      // Possível token de usuário deletado — revogar tudo
      await this.redis.revokeAllRefreshTokens(userId);
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // 3. Revogação imediata do token usado (Refresh Token Rotation)
    // O AuthService emitirá um novo par de tokens
    await this.redis.revokeRefreshToken(userId, jti);

    return { ...user, currentRefreshJti: jti };
  }
}
