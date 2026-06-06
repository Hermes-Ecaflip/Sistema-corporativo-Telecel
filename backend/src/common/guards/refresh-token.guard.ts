// =============================================================================
// TELECEL SYSTEM — common/guards/refresh-token.guard.ts
// Guard para o endpoint de refresh (usa estratégia jwt-refresh)
// =============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException(
        'Refresh token inválido ou expirado. Faça login novamente.',
      );
    }
    return user;
  }
}
