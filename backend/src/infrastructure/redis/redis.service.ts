// =============================================================================
// TELECEL SYSTEM — infrastructure/redis/redis.service.ts
// Serviço Redis: brute force, blacklist de tokens, cache geral
// =============================================================================

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  // Prefixos de chaves para organização no Redis
  private readonly PREFIX = {
    REFRESH_TOKEN: 'rt:',
    BLACKLIST: 'bl:',
    BRUTE_FORCE: 'bf:',
    TWO_FACTOR: '2fa:',
    PASSWORD_RESET: 'pr:',
    CACHE: 'cache:',
  };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');
    const db = this.configService.get<number>('redis.db', 0);

    this.client = new Redis({
      host,
      port,
      password,
      db,
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.error('Redis: máximo de tentativas atingido');
          return null;
        }
        return Math.min(times * 200, 3000); // Delay crescente até 3s
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });

    this.client.on('connect', () => this.logger.log('✅ Conectado ao Redis'));
    this.client.on('error', (err) => this.logger.error(`Redis Error: ${err.message}`));
    this.client.on('reconnecting', () => this.logger.warn('Reconectando ao Redis...'));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('🔌 Desconectado do Redis');
  }

  // ─── Primitivas base ────────────────────────────────────────────────────

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  // ─── Refresh Tokens ────────────────────────────────────────────────────

  /** Armazena refresh token com TTL */
  async storeRefreshToken(userId: string, tokenId: string, ttl: number): Promise<void> {
    const key = `${this.PREFIX.REFRESH_TOKEN}${userId}:${tokenId}`;
    await this.set(key, '1', ttl);
  }

  /** Verifica se refresh token ainda é válido (não foi revogado) */
  async isRefreshTokenValid(userId: string, tokenId: string): Promise<boolean> {
    const key = `${this.PREFIX.REFRESH_TOKEN}${userId}:${tokenId}`;
    return this.exists(key);
  }

  /** Revoga um refresh token específico (logout de sessão) */
  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = `${this.PREFIX.REFRESH_TOKEN}${userId}:${tokenId}`;
    await this.del(key);
  }

  /** Revoga TODOS os refresh tokens do usuário (logout de todas as sessões) */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const pattern = `${this.PREFIX.REFRESH_TOKEN}${userId}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // ─── Blacklist de Access Tokens ────────────────────────────────────────

  /** Adiciona access token à blacklist até ele expirar */
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    const key = `${this.PREFIX.BLACKLIST}${jti}`;
    await this.set(key, '1', ttlSeconds);
  }

  /** Verifica se token está na blacklist */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const key = `${this.PREFIX.BLACKLIST}${jti}`;
    return this.exists(key);
  }

  // ─── Brute Force Protection ────────────────────────────────────────────

  /**
   * Incrementa contador de tentativas falhas de login.
   * Retorna o número atual de tentativas.
   */
  async incrementFailedLogin(identifier: string): Promise<number> {
    const key = `${this.PREFIX.BRUTE_FORCE}${identifier}`;
    const count = await this.incr(key);

    // Só define TTL na primeira tentativa
    if (count === 1) {
      await this.expire(key, this.configService.get<number>('redis.ttl.bruteForce', 900));
    }

    return count;
  }

  /** Retorna número de tentativas falhas */
  async getFailedLoginCount(identifier: string): Promise<number> {
    const key = `${this.PREFIX.BRUTE_FORCE}${identifier}`;
    const value = await this.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /** Reseta contador após login bem-sucedido */
  async resetFailedLogin(identifier: string): Promise<void> {
    const key = `${this.PREFIX.BRUTE_FORCE}${identifier}`;
    await this.del(key);
  }

  /** Tempo restante de bloqueio em segundos */
  async getLockTTL(identifier: string): Promise<number> {
    const key = `${this.PREFIX.BRUTE_FORCE}${identifier}`;
    return this.ttl(key);
  }

  // ─── 2FA Temporário ────────────────────────────────────────────────────

  /** Armazena código 2FA temporário (após login com senha válida) */
  async store2FASession(userId: string, sessionToken: string): Promise<void> {
    const key = `${this.PREFIX.TWO_FACTOR}${userId}`;
    const ttl = this.configService.get<number>('redis.ttl.twoFactor', 300); // 5 min
    await this.set(key, sessionToken, ttl);
  }

  /** Verifica sessão temporária 2FA */
  async get2FASession(userId: string): Promise<string | null> {
    const key = `${this.PREFIX.TWO_FACTOR}${userId}`;
    return this.get(key);
  }

  /** Remove sessão 2FA após validação */
  async delete2FASession(userId: string): Promise<void> {
    const key = `${this.PREFIX.TWO_FACTOR}${userId}`;
    await this.del(key);
  }

  // ─── Reset de Senha ────────────────────────────────────────────────────

  async storePasswordResetToken(userId: string, token: string): Promise<void> {
    const key = `${this.PREFIX.PASSWORD_RESET}${userId}`;
    const ttl = this.configService.get<number>('redis.ttl.passwordReset', 3600);
    await this.set(key, token, ttl);
  }

  async getPasswordResetToken(userId: string): Promise<string | null> {
    const key = `${this.PREFIX.PASSWORD_RESET}${userId}`;
    return this.get(key);
  }

  async deletePasswordResetToken(userId: string): Promise<void> {
    const key = `${this.PREFIX.PASSWORD_RESET}${userId}`;
    await this.del(key);
  }

  // ─── Cache genérico ────────────────────────────────────────────────────

  async setCache<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const cacheKey = `${this.PREFIX.CACHE}${key}`;
    const ttl = ttlSeconds ?? this.configService.get<number>('redis.ttl.cache', 300);
    await this.set(cacheKey, JSON.stringify(value), ttl);
  }

  async getCache<T>(key: string): Promise<T | null> {
    const cacheKey = `${this.PREFIX.CACHE}${key}`;
    const value = await this.get(cacheKey);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async deleteCache(key: string): Promise<void> {
    const cacheKey = `${this.PREFIX.CACHE}${key}`;
    await this.del(cacheKey);
  }

  // ─── Health check ──────────────────────────────────────────────────────

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
