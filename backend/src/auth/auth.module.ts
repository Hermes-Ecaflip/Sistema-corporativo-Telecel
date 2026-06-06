// =============================================================================
// TELECEL SYSTEM — auth/auth.module.ts
// Módulo de autenticação: JWT, Refresh Token, 2FA, brute force
// =============================================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { RedisService } from '../infrastructure/redis/redis.service';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule registrado de forma assíncrona para injetar ConfigService
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.expiresIn', '15m'),
          issuer: 'telecel-system',
          audience: 'telecel-app',
        },
      }),
    }),

    UsersModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    JwtStrategy,
    RefreshTokenStrategy,
    RedisService,
  ],
  exports: [AuthService, JwtModule, RedisService],
})
export class AuthModule {}
