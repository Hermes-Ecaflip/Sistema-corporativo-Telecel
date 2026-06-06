// =============================================================================
// TELECEL SYSTEM — config/redis.config.ts
// =============================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  // TTLs em segundos
  ttl: {
    refreshToken: 7 * 24 * 60 * 60,         // 7 dias
    bruteForce: 15 * 60,                     // 15 minutos
    passwordReset: 60 * 60,                  // 1 hora
    twoFactor: 5 * 60,                       // 5 minutos
    cache: 5 * 60,                           // 5 minutos (cache geral)
  },
}));
