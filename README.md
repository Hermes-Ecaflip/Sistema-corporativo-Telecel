<div align="center">

<img src="https://img.shields.io/badge/GRUPO-TELECEL-FF5A1F?style=for-the-badge&logoColor=white" />
<img src="https://img.shields.io/badge/Parceiro%20Credenciado-TIM-003DA5?style=for-the-badge&logoColor=white" />

<br /><br />

# TELECEL SYSTEM

**Plataforma corporativa enterprise para gestão de vendas, clientes, comissões e financeiro**<br/>
Desenvolvido para o **Grupo TELECEL** — parceiro credenciado TIM

<br/>

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![JWT](https://img.shields.io/badge/Auth-JWT%20%2B%202FA-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![AWS S3](https://img.shields.io/badge/Storage-AWS%20S3-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com/s3)

<br/>

[![Backend](https://img.shields.io/badge/Backend-13%20Módulos%20✅-28a745?style=flat-square)]()
[![Frontend](https://img.shields.io/badge/Frontend-9%20Telas%20✅-28a745?style=flat-square)]()
[![Database](https://img.shields.io/badge/Database-17%20Models%20%7C%2018%20Enums-4169E1?style=flat-square)]()
[![API](https://img.shields.io/badge/API-70%2B%20Endpoints-FF5A1F?style=flat-square)]()

</div>

---

## 📋 Visão Geral

O **TELECEL System** é uma plataforma corporativa completa desenvolvida para o Grupo TELECEL, que opera lojas de **três marcas** — **TIM, Motorola e Samsung** — espalhadas pelo Brasil. O sistema centraliza toda a operação comercial e permite **monitorar vendas e comissões por marca, por loja específica e por vendedor**, deixando sempre claro a qual marca e loja cada venda/vendedor pertence. Inclui cadastro de clientes com validação de CPF/CNPJ e score anti-fraude, gestão de vendas com workflow de aprovação, comissões automáticas, fechamento financeiro mensal e relatórios em PDF/Excel/CSV.

A arquitetura é **multi-tenant**, com isolamento por empresa, RBAC com 5 papéis distintos e auditoria automática e imutável de todas as operações sensíveis.

<br/>

<div align="center">

```
index.html → 2fa.html → dashboard.html
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        clientes.html    vendas.html    financeiro.html
        usuarios.html   comissoes.html  auditoria.html
```

</div>

---

## 🗂️ Estrutura do Repositório

```
telecel-system/                        ← raiz do repositório (GitHub Pages ready)
│
├── 📄 index.html                      ← Login (página inicial)
├── 📄 2fa.html                        ← Verificação 2FA
├── 📄 dashboard.html                  ← Dashboard principal (KPIs, gráficos, metas)
├── 📄 clientes.html                   ← Gestão de clientes
├── 📄 vendas.html                     ← Pipeline de vendas
├── 📄 comissoes.html                  ← Comissões por vendedor
├── 📄 financeiro.html                 ← Fechamento financeiro
├── 📄 auditoria.html                  ← Logs de auditoria
├── 📄 usuarios.html                   ← Gestão de usuários
│
├── 📁 assets/
│   ├── css/                           ← app.css · login.css · 2fa.css
│   └── js/                            ← shell.js · login.js · 2fa.js
│
├── 📁 backend/                        ← API NestJS
│   ├── src/
│   │   ├── auth/                      ← JWT · 2FA TOTP · Refresh Rotation
│   │   ├── users/                     ← CRUD · Avatar S3 · CSV export
│   │   ├── clients/                   ← CPF/CNPJ · Score anti-fraude
│   │   ├── products/                  ← Catálogo TIM · Regras de comissão
│   │   ├── sales/                     ← Workflow aprovação · Comissão automática
│   │   ├── commissions/               ← Aprovação/pagamento em lote · Fechamento
│   │   ├── financial/                 ← Fechamento mensal · Balanço · Movimentos
│   │   ├── reports/                   ← PDF (PDFKit) · Excel (ExcelJS) · CSV
│   │   ├── notifications/             ← E-mail (Nodemailer) · In-app
│   │   ├── dashboard/                 ← KPIs · Ranking · Metas · Gráficos
│   │   ├── uploads/                   ← AWS S3 · Sharp (WebP) · Presigned URLs
│   │   ├── audit/                     ← Logs imutáveis · Interceptor automático
│   │   └── common/                    ← Guards · Decorators · Filters · Interceptors
│   │
│   ├── prisma/
│   │   ├── schema.prisma              ← 17 models · 18 enums (fonte da verdade)
│   │   ├── schema.sql                 ← Estrutura SQL (visualização no GitHub)
│   │   └── seeds/seed.ts              ← Dados iniciais completos
│   │
│   ├── .env.example
│   ├── Dockerfile
│   └── MIGRATIONS.md
│
├── 📁 .github/workflows/ci.yml        ← CI/CD (build · test · deploy)
├── 🐳 docker-compose.yml              ← PostgreSQL · Redis · Backend · Frontend
├── 📖 README.md
└── 🔒 .gitignore
```

---

## 🚀 Como Executar

### Docker (recomendado)

```bash
# 1. Clonar o repositório
git clone https://github.com/Hermes-Ecaflip/telecel-system.git
cd telecel-system

# 2. Configurar variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env: preencha JWT_SECRET, JWT_REFRESH_SECRET (mín. 32 chars)

# 3. Subir toda a infraestrutura
docker-compose up -d

# 4. Aplicar migrations e popular o banco
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run prisma:seed
```

### Local (sem Docker)

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

### Frontend

Abra `index.html` diretamente no navegador — **não precisa de servidor**.
Ou ative o **GitHub Pages**: `Settings → Pages → Source: main / root`.

---

## 🌐 Serviços e Acessos

| Serviço | URL | Descrição |
|---------|-----|-----------|
| 🖥️ Frontend | http://localhost | Login + Telas do sistema |
| ⚡ Backend API | http://localhost:3001/api/v1 | API REST NestJS |
| 📚 Swagger | http://localhost:3001/api/docs | Documentação interativa |
| 📊 Grafana | http://localhost:3003 | Dashboards de monitoramento |
| 📈 Prometheus | http://localhost:9090 | Métricas |
| 🗄️ Adminer | http://localhost:8080 | Interface do banco (profile tools) |
| 🔴 Redis Commander | http://localhost:8081 | Interface do Redis (profile tools) |

> Para ferramentas de dev: `docker-compose --profile tools up -d`

---

## 🌱 Credenciais de Acesso (Seed)

> Criadas automaticamente pelo `npm run prisma:seed`

| Papel | E-mail | Senha |
|-------|--------|-------|
| 👑 Admin | admin@telecel.com.br | `Telecel@2025` |
| 🔍 Supervisor | supervisor@telecel.com.br | `Telecel@2025` |
| 💼 Vendedor | vendedor@telecel.com.br | `Telecel@2025` |
| 💰 Financeiro | financeiro@telecel.com.br | `Telecel@2025` |
| 🔎 Auditor | auditor@telecel.com.br | `Telecel@2025` |

> ⚠️ **Produção:** altere todas as senhas imediatamente após o primeiro acesso.

### Dados do Seed

O seed também cria:
- 🏢 **1 empresa** — TELECEL Telecomunicações LTDA (CNPJ: 12.345.678/0001-95)
- 🏪 **7 lojas** em 3 marcas e vários estados — TIM (Planaltina-DF, JK Shopping-DF, Corumbá-MS) · Motorola (SP, RJ) · Samsung (MG, DF)
- 📱 **8 produtos** — Planos TIM (Black 50/100GB, Controle, Ultra Fibra) + aparelhos Motorola (Edge 50 Ultra, Moto G84) e Samsung (Galaxy S24 Ultra, A55)
- 👥 **3 clientes demo** — 2 PF + 1 PJ
- 🎯 **2 metas** — meta da loja (R$ 50.000) + meta do vendedor (R$ 15.000)

---

## 🔐 Fluxo de Autenticação

```
POST /auth/login  (email + senha)
        │
        ├─ 2FA desativado ──────────────────► Emite access + refresh token ──► ✅ Acesso
        │
        └─ 2FA ativado ──► Retorna twoFactorSessionToken
                                    │
                          POST /auth/2fa/verify  (código TOTP 6 dígitos)
                                    │
                          Emite access + refresh token ──► ✅ Acesso
```

| Token | Duração | Armazenamento | Rotação |
|-------|---------|---------------|---------|
| Access Token | 15 min | Header Bearer | JTI único + blacklist Redis |
| Refresh Token | 7 dias | Cookie httpOnly | Automática (revoga usado) |
| 2FA Secret | — | AES-256-GCM | A cada desativação |

---

## 🏗️ Stack Técnica

### Backend
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| Node.js | 20 LTS | Runtime |
| NestJS | 10 | Framework modular |
| TypeScript | 5 | Linguagem |
| Prisma | 5 | ORM + Migrations |
| PostgreSQL | 16 | Banco de dados principal |
| Redis | 7 | Cache · Sessões · Brute Force · Blacklist |
| JWT + otplib | — | Autenticação + 2FA TOTP |
| bcryptjs | — | Hash de senhas (12 rounds) |
| Sharp | — | Compressão e resize de imagens (→ WebP) |
| AWS S3 | — | Armazenamento de documentos e avatares |
| Nodemailer | — | Envio de e-mails transacionais |
| PDFKit | — | Geração de relatórios PDF |
| ExcelJS | — | Geração de planilhas Excel |
| Winston | — | Logs rotativos com retenção de 90 dias |
| Swagger | — | Documentação automática da API |
| Helmet | — | Headers de segurança (CSP, HSTS) |

### Frontend
| Tecnologia | Função |
|-----------|--------|
| HTML5 / CSS3 | Estrutura e estilo |
| JavaScript (ES6+) | Interações e lógica |
| Plus Jakarta Sans | Tipografia |
| SVG | Logo oficial e ícones |
| CSS Custom Properties | Tema dinâmico |

---

## 🔒 Segurança

| Camada | Implementação |
|--------|--------------|
| 🔑 Senhas | bcrypt 12 rounds |
| 🎫 Access Token | JWT 15min, JTI único, blacklist no Redis |
| 🔄 Refresh Token | JWT 7d, Rotation automática, cookie httpOnly + Secure + SameSite Strict |
| 📱 2FA | TOTP 6 dígitos ±30s, secret criptografado AES-256-GCM |
| 🛡️ Brute Force | Bloqueio por e-mail + IP após 5 tentativas (15min de lock) |
| ⚡ Rate Limiting | 3 níveis: 10/s · 100/min · 500/15min |
| 🍪 Cookies | httpOnly · Secure · SameSite Strict · path restrito |
| 🪖 Headers | Helmet: CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| 🌐 CORS | Allowlist dinâmica via variável de ambiente |
| 📁 Uploads | Validação MIME type + tamanho + compressão automática WebP |
| 📋 Auditoria | Log imutável no banco: ação, diff, IP, user-agent |
| 🗑️ Soft Delete | Middleware Prisma: `delete → update(deletedAt)` |

---

## 👥 RBAC — Controle de Acesso por Papel

| Módulo | 👑 Admin | 🔍 Supervisor | 💼 Vendedor | 💰 Financeiro | 🔎 Auditor |
|--------|:-------:|:------------:|:-----------:|:-------------:|:---------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Usuários | ✅ | 👁 | ❌ | ❌ | 👁 |
| Clientes | ✅ | ✅ | ✅ | ❌ | 👁 |
| Produtos | ✅ | ✅ | 👁 | ❌ | 👁 |
| Vendas | ✅ | ✅ | ✅ | 👁 | 👁 |
| Aprovações | ✅ | ✅ | ❌ | ❌ | ❌ |
| Comissões | ✅ | ✅ | 👁 | ✅ | 👁 |
| Financeiro | ✅ | 👁 | ❌ | ✅ | 👁 |
| Relatórios | ✅ | ✅ | ❌ | ✅ | 👁 |
| Configurações | ✅ | ❌ | ❌ | ❌ | ❌ |

> ✅ Acesso total · 👁 Somente leitura · ❌ Sem acesso

---

## 🗄️ Banco de Dados

17 models · 18 enums · PostgreSQL 16 · Prisma ORM

> Cada **loja** tem uma marca (`StoreBrand`: TIM, MOTOROLA ou SAMSUNG), cidade e estado — permitindo monitorar vendas e comissões por marca, por loja e por vendedor individualmente.

```
companies ──┬── stores ──┬── users ──────┬── sales ──────┬── sale_items
            │            │               ├── clients      ├── commissions
            │            │               ├── products     └── documents
            │            │               ├── notifications
            │            │               ├── audit_logs
            │            │               └── refresh_tokens
            │            ├── financial_closes
            │            ├── financial_movements
            │            └── goals
```

Cada **loja** tem uma marca (`StoreBrand`: TIM · MOTOROLA · SAMSUNG), localização (cidade/estado) e código próprio. Vendas, comissões, metas e fechamentos são vinculados à loja, permitindo filtrar e consolidar por marca, loja ou vendedor.

> A estrutura completa está em [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) (fonte da verdade)
> e em [`backend/prisma/schema.sql`](backend/prisma/schema.sql) (visualização SQL no GitHub).

---

## 📡 API — Endpoints Principais

<details>
<summary><strong>🔐 Autenticação</strong> <code>/api/v1/auth</code> — 10 endpoints</summary>

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/login` | Login com e-mail e senha |
| `POST` | `/2fa/verify` | Verificar código TOTP |
| `POST` | `/refresh` | Renovar access token (cookie) |
| `POST` | `/logout` | Encerrar sessão |
| `GET` | `/me` | Dados do usuário logado |
| `POST` | `/forgot-password` | Solicitar reset de senha |
| `POST` | `/reset-password` | Redefinir senha com token |
| `GET` | `/2fa/setup` | Gerar QR Code 2FA |
| `POST` | `/2fa/confirm` | Ativar 2FA |
| `POST` | `/2fa/disable` | Desativar 2FA |

</details>

<details>
<summary><strong>👥 Usuários</strong> <code>/api/v1/users</code> — 11 endpoints</summary>

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| `GET` | `/` | Admin, Supervisor, Auditor | Listar com filtros e paginação |
| `POST` | `/` | Admin | Criar usuário |
| `GET` | `/me` | Todos | Meu perfil |
| `GET` | `/stats` | Admin, Supervisor | Estatísticas por papel/status |
| `GET` | `/export/csv` | Admin | Exportar CSV |
| `GET` | `/:id` | Admin, Supervisor, Auditor | Buscar por ID |
| `PATCH` | `/:id` | Admin, Supervisor | Atualizar dados |
| `PATCH` | `/me/profile` | Todos | Atualizar próprio perfil |
| `POST` | `/:id/avatar` | Todos | Upload de avatar (max 2MB) |
| `PATCH` | `/:id/status` | Admin | Ativar / Suspender / Bloquear |
| `DELETE` | `/:id` | Admin | Soft delete |

</details>

<details>
<summary><strong>👤 Clientes</strong> <code>/api/v1/clients</code> — 10 endpoints</summary>

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| `POST` | `/` | Admin, Supervisor, Vendedor | Cadastrar cliente |
| `GET` | `/` | Admin, Supervisor, Vendedor, Auditor | Listar com filtros avançados |
| `GET` | `/stats` | Admin, Supervisor, Auditor | Estatísticas e clientes de risco |
| `GET` | `/export/csv` | Admin, Supervisor | Exportar CSV |
| `GET` | `/:id` | Admin, Supervisor, Vendedor, Auditor | Buscar por ID |
| `GET` | `/cpf-cnpj/:document` | Admin, Supervisor, Vendedor | Buscar por CPF ou CNPJ |
| `GET` | `/:id/sales` | Admin, Supervisor, Vendedor, Auditor | Histórico de vendas |
| `PATCH` | `/:id` | Admin, Supervisor, Vendedor | Atualizar dados |
| `PATCH` | `/:id/status` | Admin, Supervisor | Alterar status (incl. suspeita de fraude) |
| `DELETE` | `/:id` | Admin | Soft delete (bloqueado se houver vendas) |

</details>

<details>
<summary><strong>📦 Produtos</strong> <code>/api/v1/products</code> — 8 endpoints</summary>

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| `POST` | `/` | Admin, Supervisor | Cadastrar produto/plano TIM |
| `GET` | `/` | Todos (exceto Financeiro) | Listar com filtros |
| `GET` | `/stats` | Admin, Supervisor | Estatísticas do catálogo |
| `GET` | `/code/:code` | Admin, Supervisor, Vendedor | Buscar por código |
| `GET` | `/:id` | Todos (exceto Financeiro) | Buscar por ID |
| `PATCH` | `/:id` | Admin, Supervisor | Atualizar produto |
| `PATCH` | `/:id/status` | Admin, Supervisor | Ativar/Inativar/Descontinuar |
| `DELETE` | `/:id` | Admin | Soft delete |

</details>

<details>
<summary><strong>🛒 Vendas</strong> <code>/api/v1/sales</code> — 6 endpoints</summary>

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| `POST` | `/` | Admin, Supervisor, Vendedor | Criar venda (calcula total e comissão) |
| `GET` | `/` | Todos | Listar (vendedor vê só as próprias) |
| `GET` | `/stats` | Admin, Supervisor, Vendedor, Financeiro | Receita, comissões, por status |
| `GET` | `/:id` | Todos | Detalhes (itens, cliente, documentos) |
| `PATCH` | `/:id/review` | Admin, Supervisor | Aprovar/Rejeitar (gera comissão) |
| `PATCH` | `/:id/cancel` | Admin, Supervisor, Vendedor | Cancelar (estorna comissão) |

</details>

<details>
<summary><strong>💰 Comissões</strong> <code>/api/v1/commissions</code> — 7 endpoints</summary>

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| `GET` | `/` | Todos | Listar (vendedor vê só as próprias) |
| `GET` | `/stats` | Admin, Supervisor, Vendedor, Financeiro | Totais por status |
| `GET` | `/summary/:month` | Admin, Supervisor, Financeiro | Resumo por vendedor no mês |
| `GET` | `/:id` | Todos | Detalhes da comissão |
| `PATCH` | `/approve` | Admin, Supervisor, Financeiro | Aprovar em lote |
| `PATCH` | `/pay` | Admin, Financeiro | Marcar como pagas |
| `POST` | `/close-month` | Admin, Financeiro | Fechar mês (aprovar pendentes) |

</details>

<details>
<summary><strong>🏦 Financeiro</strong> <code>/api/v1/financial</code> — 8 endpoints</summary>

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| `GET` | `/balance/:month` | Admin, Financeiro, Supervisor, Auditor | Balanço prévio (preview) |
| `GET` | `/evolution/:year` | Admin, Financeiro, Supervisor, Auditor | Evolução anual |
| `POST` | `/close` | Admin, Financeiro | Executar fechamento mensal |
| `GET` | `/closes` | Admin, Financeiro, Supervisor, Auditor | Listar fechamentos |
| `GET` | `/closes/:id` | Admin, Financeiro, Supervisor, Auditor | Detalhe do fechamento |
| `PATCH` | `/closes/:id/reopen` | Admin | Reabrir fechamento |
| `POST` | `/movements` | Admin, Financeiro | Lançar receita/despesa manual |
| `GET` | `/movements/:month` | Admin, Financeiro, Auditor | Listar movimentos do mês |

</details>

<details>
<summary><strong>📊 Dashboard</strong> <code>/api/v1/dashboard</code> — 7 endpoints</summary>

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| `GET` | `/overview` | Todos | KPIs do período |
| `GET` | `/ranking` | Admin, Supervisor, Financeiro | Top 10 vendedores por receita |
| `GET` | `/sales-trend` | Todos | Vendas/receita por dia (gráfico linha) |
| `GET` | `/sales-by-category` | Admin, Supervisor, Financeiro | Distribuição por categoria |
| `GET` | `/goals/:month` | Todos | Progresso das metas do mês |
| `POST` | `/goals` | Admin, Supervisor | Definir meta |
| `PATCH` | `/goals/:id` | Admin, Supervisor | Atualizar meta |

</details>

<details>
<summary><strong>📄 Relatórios · 📤 Uploads · 🔔 Notificações</strong></summary>

**Relatórios** `POST /api/v1/reports/generate` — Gera PDF/Excel/CSV para: SALES, COMMISSIONS, FINANCIAL, CLIENTS, PRODUCTS

**Uploads** `/api/v1/uploads` — Upload de documentos (PDF/imagem, max 10MB), presigned URLs para download seguro

**Notificações** `/api/v1/notifications` — In-app com badge de não lidas, marcar como lida em lote, e-mails transacionais automáticos

</details>

> 📚 Documentação completa e interativa: **http://localhost:3001/api/docs**

---

## 📦 Módulos Implementados

### ✅ Backend (13 módulos)

| # | Módulo | Destaques |
|---|--------|-----------|
| 1 | **Fundação** | Docker Compose · Prisma Schema · Dockerfiles multi-stage |
| 2 | **Backend Core** | Bootstrap · Throttling 3 níveis · Winston · Joi validation |
| 3 | **Autenticação** | JWT + 2FA TOTP · Refresh Rotation · Brute Force · AES-256-GCM |
| 4 | **Usuários + Uploads** | CRUD · RBAC · Avatar S3 (Sharp/WebP) · CSV export |
| 5 | **Clientes** | CPF/CNPJ algorítmico · Score anti-fraude 0-100 · Busca avançada |
| 6 | **Produtos** | Catálogo TIM · Regras de comissão (% ou fixo) · Fidelização |
| 7 | **Vendas** | Criação transacional · Comissão automática · Workflow aprovação |
| 8 | **Comissões** | Aprovação/pagamento em lote · Fechamento mensal · Resumo por vendedor |
| 9 | **Financeiro** | Fechamento consolidado · Balanço prévio · Movimentos manuais |
| 10 | **Relatórios** | PDF (PDFKit) · Excel estilizado (ExcelJS) · CSV com BOM UTF-8 |
| 11 | **Notificações** | E-mail HTML (Nodemailer) · In-app · Templates transacionais |
| 12 | **Dashboard** | KPIs por papel · Ranking · Tendência diária · Metas com progresso |
| 13 | **Seeds & Migrations** | Dados iniciais · app.module.ts · Guia de migrations |

### ✅ Frontend (9 telas)

| Tela | Arquivo | Descrição |
|------|---------|-----------|
| Login | `index.html` | Formulário com validação · Toggle senha · Painel TIM |
| 2FA | `2fa.html` | 6 inputs OTP · QR Code · Contagem regressiva |
| Dashboard | `dashboard.html` | KPIs · Gráfico linha · Donut status · Ranking · Metas |
| Clientes | `clientes.html` | Tabela · Score bars · Filtros · Paginação |
| Vendas | `vendas.html` | Pipeline kanban · Status · Aprovação |
| Comissões | `comissoes.html` | Ranking vendedores · Totais · Status |
| Financeiro | `financeiro.html` | Receita × Despesas · Gráficos · Fechamento |
| Auditoria | `auditoria.html` | Logs de auditoria · Filtros · Paginação |
| Usuários | `usuarios.html` | CRUD · Papéis · Status · Avatar |

---

## 📊 Roadmap

| # | Módulo | Status |
|---|--------|:------:|
| 1 | Fundação (Docker, Prisma, Schema) | ✅ |
| 2 | Backend Core (main, configs, middleware) | ✅ |
| 3 | Autenticação (JWT, 2FA, Brute Force) | ✅ |
| 4 | Usuários + Uploads (CRUD, S3, avatar) | ✅ |
| 5 | Clientes (CPF/CNPJ, anti-fraude) | ✅ |
| 6 | Produtos (catálogo TIM) | ✅ |
| 7 | Vendas (workflow de aprovação) | ✅ |
| 8 | Comissões (cálculo automático) | ✅ |
| 9 | Financeiro (fechamento mensal) | ✅ |
| 10 | Relatórios (PDF, Excel, CSV) | ✅ |
| 11 | Notificações (Email, in-app) | ✅ |
| 12 | Dashboard (KPIs, metas, gráficos) | ✅ |
| 13 | Seeds & Migrations | ✅ |
| 14 | Frontend — Login + 2FA | ✅ |
| 15 | Frontend — Dashboard | ✅ |
| 16 | Frontend — Clientes + Vendas | ✅ |
| 17 | Frontend — Financeiro + Comissões | ✅ |
| 18 | Frontend — Auditoria + Usuários | ✅ |
| 19 | Testes (unitários, E2E) | ✅ |
| 20 | Nginx + SSL | ✅ |
| 21 | CI/CD GitHub Actions | ✅ |
| 22 | Deploy VPS Ubuntu | ✅ (guia) |
| 23 | Grafana Dashboards | ⏳ |

---

## 🧪 Testes

```bash
npm test            # Unitários (15 testes — CPF/CNPJ + DashboardService)
npm run test:cov    # Cobertura
npm run test:e2e    # E2E (fluxo de autenticação — requer banco de teste)
```

Os testes unitários rodam sem precisar de banco (Prisma é mockado). Os E2E sobem a aplicação real e exigem `DATABASE_URL` configurado.

---

## 📚 Documentação da API

Após subir o backend, acesse o Swagger UI:

```
http://localhost:3001/api/docs
```

Todos os endpoints estão documentados com exemplos de request/response, autenticação JWT e roles necessárias.

---

## 📄 Licença

Proprietária — Grupo TELECEL. Uso interno exclusivo.

---

<div align="center">

<img src="https://img.shields.io/badge/GRUPO-TELECEL-FF5A1F?style=for-the-badge&logoColor=white" />
<img src="https://img.shields.io/badge/Parceiro%20Credenciado-TIM-003DA5?style=for-the-badge&logoColor=white" />

<br/><br/>

**Desenvolvido com dedicação para o Grupo TELECEL**

[github.com/Hermes-Ecaflip/telecel-system](https://github.com/Hermes-Ecaflip/telecel-system)

</div>
