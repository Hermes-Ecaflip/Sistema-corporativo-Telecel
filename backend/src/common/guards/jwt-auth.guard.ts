// =============================================================================
// TELECEL SYSTEM — common/guards/jwt-auth.guard.ts
// Guard JWT global: protege todas as rotas, exceto as marcadas com @Public()
// =============================================================================

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Verificar se a rota tem o decorator @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const message =
        info?.message === 'jwt expired'
          ? 'Token expirado. Faça login novamente.'
          : info?.message === 'No auth token'
            ? 'Token de autenticação obrigatório'
            : 'Token de autenticação inválido';

      throw err || new UnauthorizedException(message);
    }
    return user;
  }
}
