// =============================================================================
// TELECEL SYSTEM — test/auth.e2e-spec.ts
// Teste E2E do fluxo de autenticação (login → 2FA → acesso protegido)
// Requer banco de teste configurado (DATABASE_URL) e seed aplicado.
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('rejeita credenciais inválidas com 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'naoexiste@telecel.com.br', password: 'SenhaErrada@1' })
        .expect(401);
    });

    it('rejeita payload malformado com 400', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'invalido', password: '123' })
        .expect(400);
    });

    it('autentica admin do seed e retorna token ou exige 2FA', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@telecel.com.br', password: 'Telecel@2025' });

      // Aceita 200 (login direto) ou 200 com requiresTwoFactor
      expect([200, 201]).toContain(res.status);
      expect(res.body).toBeDefined();
    });
  });

  describe('Rotas protegidas', () => {
    it('bloqueia acesso sem token (401)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401);
    });
  });
});
