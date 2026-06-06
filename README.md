# Sistema Corporativo TELECEL

Monorepo do **TELECEL System** — plataforma corporativa para a TELECEL (parceira credenciada TIM), com backend NestJS e frontend web.

> **Esta é a versão organizada em pastas.** Todos os arquivos foram movidos da raiz para a estrutura correta, e todos os imports já estão ajustados para funcionar nas novas localizações. É só fazer upload e rodar.

---

## Estrutura do projeto

```
telecel-system/                   # RAIZ DO REPOSITÓRIO
│
├── index.html                    # Login (página inicial do site)
├── 2fa.html                      # Verificação 2FA
├── dashboard.html                # Dashboard principal
├── clientes.html                 # Lista de clientes
├── vendas.html                   # Pipeline de vendas
├── comissoes.html                # Comissões
├── financeiro.html               # Financeiro
├── auditoria.html                # Logs de auditoria
├── usuarios.html                 # Usuários
│
├── assets/                       # Recursos do frontend
│   ├── css/                      # app.css, login.css, 2fa.css
│   └── js/                       # shell.js, login.js, 2fa.js
│
├── backend/                      # API NestJS
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/               # Configurações (app, jwt, redis, s3, mail, db, logger)
│   │   ├── common/               # guards, decorators, filters, interceptors, middleware, utils
│   │   ├── infrastructure/redis/
│   │   ├── prisma/
│   │   ├── auth/  users/  clients/  products/  sales/
│   │   ├── commissions/  financial/  reports/  notifications/
│   │   ├── dashboard/  uploads/  audit/
│   │   └── (cada módulo com seu /dto)
│   ├── prisma/
│   │   ├── schema.prisma         # 17 models (fonte da verdade)
│   │   ├── schema.sql            # Estrutura SQL (visualização no GitHub)
│   │   └── seeds/seed.ts         # Dados iniciais
│   ├── package.json, tsconfig.json, nest-cli.json
│   ├── Dockerfile, .env.example, MIGRATIONS.md
│
├── .github/workflows/ci.yml      # CI/CD
├── docker-compose.yml
├── Dockerfile.frontend           # Container do frontend (nginx)
├── README.md
├── ESTRUTURA.md
└── .gitignore
```

---

## Subir o projeto

```bash
# 1. Configurar variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env e preencha JWT_SECRET e JWT_REFRESH_SECRET (mín. 32 caracteres)

# 2. Subir tudo via Docker
docker-compose up -d

# 3. Aplicar migrations e popular o banco
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run prisma:seed
```

### Rodar o backend localmente (sem Docker)

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

### Frontend

Os arquivos HTML ficam na **raiz do repositório** (junto do README), com os assets em `assets/css/` e `assets/js/`. O `index.html` é a página inicial — ideal para o GitHub Pages servir automaticamente.

Para visualizar: abra `index.html` no navegador, ou ative o **GitHub Pages** nas configurações do repositório (Settings → Pages → Source: branch `main`, pasta `/root`). A navegação entre as telas já está toda linkada.

Fluxo: `index.html` (login) → `2fa.html` → `dashboard.html`, e a sidebar do dashboard navega para todas as demais telas.


---

## Acessos após subir

| Serviço | URL |
|---------|-----|
| Backend API | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |
| Frontend | http://localhost:3000 |

### Credenciais (seed) — senha `Telecel@2025`

```
admin@telecel.com.br        → ADMIN
supervisor@telecel.com.br   → SUPERVISOR
vendedor@telecel.com.br     → VENDEDOR
financeiro@telecel.com.br   → FINANCEIRO
auditor@telecel.com.br      → AUDITOR
```

---

## O que foi ajustado nesta organização

- Todos os arquivos saíram da raiz e foram para suas pastas corretas (padrão NestJS).
- Arquivos que estavam agrupados foram separados nos arquivos individuais que o código espera:
  - `decorators/index.ts` → `public.decorator.ts`, `roles.decorator.ts`, `current-user.decorator.ts`, `api-paginated-response.decorator.ts` (o `index.ts` virou um *barrel* que re-exporta todos).
  - `interceptors/index.ts` → `transform.interceptor.ts`, `logging.interceptor.ts` (+ barrel).
  - `audit.service.ts` → `audit.service.ts`, `audit.module.ts`, `audit.interceptor.ts`.
  - `uploads.service.ts` → `uploads.service.ts` + `uploads.controller.ts`.
  - `RefreshTokenGuard` extraído para `refresh-token.guard.ts`.
- Todos os imports relativos foram verificados (167 imports, 0 quebrados).
- Removido o alias `@prisma/*` do `tsconfig.json`, que conflitava com o pacote `@prisma/client`.
- Adicionadas dependências que faltavam no `package.json`: `csv-writer`, `nest-winston`, `joi`.
- Sintaxe de todos os 78 arquivos TypeScript validada com o compilador.
- `.gitignore` configurado para não commitar `node_modules`, `.env` e builds.

---

GRUPO TELECEL · Parceiro credenciado TIM
