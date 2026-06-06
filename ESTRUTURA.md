# TELECEL SYSTEM — Estrutura Completa do Projeto

```
telecel-system/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                         # Pipeline de CI (testes + lint)
│       └── deploy.yml                     # Pipeline de CD (deploy automático)
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.guard.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── refresh-token.strategy.ts
│   │   │   ├── two-factor.service.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       ├── register.dto.ts
│   │   │       ├── refresh-token.dto.ts
│   │   │       └── two-factor.dto.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.module.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── clients/
│   │   │   ├── clients.controller.ts
│   │   │   ├── clients.service.ts
│   │   │   ├── clients.module.ts
│   │   │   └── dto/
│   │   │       ├── create-client.dto.ts
│   │   │       └── update-client.dto.ts
│   │   │
│   │   ├── products/
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   ├── products.module.ts
│   │   │   └── dto/
│   │   │       ├── create-product.dto.ts
│   │   │       └── update-product.dto.ts
│   │   │
│   │   ├── sales/
│   │   │   ├── sales.controller.ts
│   │   │   ├── sales.service.ts
│   │   │   ├── sales.module.ts
│   │   │   ├── sales-validation.service.ts
│   │   │   └── dto/
│   │   │       ├── create-sale.dto.ts
│   │   │       ├── approve-sale.dto.ts
│   │   │       └── reject-sale.dto.ts
│   │   │
│   │   ├── commissions/
│   │   │   ├── commissions.controller.ts
│   │   │   ├── commissions.service.ts
│   │   │   ├── commissions.module.ts
│   │   │   └── dto/
│   │   │       └── commission-rule.dto.ts
│   │   │
│   │   ├── financial/
│   │   │   ├── financial.controller.ts
│   │   │   ├── financial.service.ts
│   │   │   ├── financial.module.ts
│   │   │   └── dto/
│   │   │       └── payment.dto.ts
│   │   │
│   │   ├── reports/
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.service.ts
│   │   │   └── reports.module.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── dashboard.service.ts
│   │   │   └── dashboard.module.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notifications.module.ts
│   │   │   ├── email.service.ts
│   │   │   └── whatsapp.service.ts
│   │   │
│   │   ├── uploads/
│   │   │   ├── uploads.controller.ts
│   │   │   ├── uploads.service.ts
│   │   │   ├── uploads.module.ts
│   │   │   └── s3.service.ts
│   │   │
│   │   ├── websocket/
│   │   │   ├── events.gateway.ts
│   │   │   └── events.module.ts
│   │   │
│   │   ├── audit/
│   │   │   ├── audit.service.ts
│   │   │   ├── audit.module.ts
│   │   │   └── audit.interceptor.ts
│   │   │
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── public.decorator.ts
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   └── transform.interceptor.ts
│   │   │   ├── middleware/
│   │   │   │   └── logger.middleware.ts
│   │   │   └── utils/
│   │   │       ├── cpf-cnpj.util.ts
│   │   │       ├── pagination.util.ts
│   │   │       └── crypto.util.ts
│   │   │
│   │   ├── config/
│   │   │   ├── app.config.ts
│   │   │   ├── database.config.ts
│   │   │   ├── jwt.config.ts
│   │   │   ├── redis.config.ts
│   │   │   ├── s3.config.ts
│   │   │   └── mail.config.ts
│   │   │
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   │
│   │   └── main.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seeds/
│   │       ├── seed.ts
│   │       └── data/
│   │           ├── users.seed.ts
│   │           ├── products.seed.ts
│   │           └── companies.seed.ts
│   │
│   ├── test/
│   │   ├── unit/
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── users.service.spec.ts
│   │   │   ├── sales.service.spec.ts
│   │   │   └── commissions.service.spec.ts
│   │   ├── integration/
│   │   │   ├── auth.e2e-spec.ts
│   │   │   └── sales.e2e-spec.ts
│   │   └── jest.config.ts
│   │
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── nest-cli.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/                           # Next.js App Router
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── forgot-password/
│   │   │   │       └── page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx               # Dashboard principal
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── clients/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── products/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── sales/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── commissions/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── financial/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reports/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   ├── api/
│   │   │   │   └── auth/
│   │   │   │       └── [...nextauth]/
│   │   │   │           └── route.ts
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   └── providers.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                        # ShadCN components
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── TwoFactorForm.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── MetricCard.tsx
│   │   │   │   ├── SalesChart.tsx
│   │   │   │   ├── RankingTable.tsx
│   │   │   │   └── GoalsProgress.tsx
│   │   │   ├── clients/
│   │   │   │   ├── ClientForm.tsx
│   │   │   │   └── ClientTable.tsx
│   │   │   ├── sales/
│   │   │   │   ├── SaleForm.tsx
│   │   │   │   ├── SaleTable.tsx
│   │   │   │   └── DocumentUpload.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Breadcrumb.tsx
│   │   │   └── shared/
│   │   │       ├── DataTable.tsx
│   │   │       ├── Pagination.tsx
│   │   │       ├── SearchInput.tsx
│   │   │       ├── StatusBadge.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useClients.ts
│   │   │   ├── useSales.ts
│   │   │   ├── useCommissions.ts
│   │   │   ├── useDashboard.ts
│   │   │   └── useWebSocket.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── axios.ts
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── clients.service.ts
│   │   │   ├── products.service.ts
│   │   │   ├── sales.service.ts
│   │   │   ├── commissions.service.ts
│   │   │   ├── financial.service.ts
│   │   │   └── reports.service.ts
│   │   │
│   │   ├── store/
│   │   │   └── auth.store.ts
│   │   │
│   │   └── types/
│   │       ├── auth.types.ts
│   │       ├── user.types.ts
│   │       ├── client.types.ts
│   │       ├── sale.types.ts
│   │       ├── product.types.ts
│   │       └── api.types.ts
│   │
│   ├── public/
│   │   └── assets/
│   │       └── logo.svg
│   │
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── components.json            # ShadCN config
│   └── .env.example
│
├── nginx/
│   ├── nginx.conf
│   ├── ssl/
│   │   └── .gitkeep
│   └── conf.d/
│       └── telecel.conf
│
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml
│   └── grafana/
│       ├── datasources/
│       │   └── prometheus.yml
│       └── dashboards/
│           └── telecel.json
│
├── scripts/
│   ├── deploy.sh
│   ├── backup.sh
│   ├── restore.sh
│   └── setup-server.sh
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
└── README.md
```

## Fluxo de Dados

```
[Browser] → [Nginx] → [Next.js Frontend] → [NestJS Backend] → [PostgreSQL]
                                                            → [Redis Cache]
                                                            → [AWS S3]
                                         → [WebSocket Gateway]
                                         → [Prometheus/Grafana]
```

## Roles e Permissões

| Role       | Dashboard | Clientes | Vendas | Financeiro | Usuários | Config |
|------------|-----------|----------|--------|------------|----------|--------|
| ADMIN      | ✅        | ✅       | ✅     | ✅         | ✅       | ✅     |
| SUPERVISOR | ✅        | ✅       | ✅     | ✅         | ❌       | ❌     |
| VENDEDOR   | ✅        | ✅       | ✅     | ❌         | ❌       | ❌     |
| FINANCEIRO | ✅        | ❌       | ✅     | ✅         | ❌       | ❌     |
| AUDITOR    | ✅        | ✅       | ✅     | ✅         | ❌       | ❌     |
