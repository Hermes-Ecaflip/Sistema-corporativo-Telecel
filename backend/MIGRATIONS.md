# TELECEL System — Guia de Migrations & Setup do Banco

Guia completo para inicializar, migrar e popular o banco de dados PostgreSQL do TELECEL System.

---

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 20 LTS (apenas para desenvolvimento local sem Docker)
- Arquivo `backend/.env` configurado (copie de `.env.example`)

---

## Setup completo (Docker — recomendado)

```bash
# 1. Clonar e entrar no projeto
git clone https://github.com/Hermes-Ecaflip/telecel-system.git
cd telecel-system

# 2. Configurar variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env e preencha JWT_SECRET, JWT_REFRESH_SECRET (mín. 32 chars), etc.

# 3. Subir a infraestrutura (PostgreSQL + Redis + Backend)
docker-compose up -d

# 4. Aguardar o PostgreSQL ficar saudável (~10s) e aplicar as migrations
docker-compose exec backend npx prisma migrate deploy

# 5. Popular o banco com dados iniciais
docker-compose exec backend npm run prisma:seed
```

Pronto! A API estará disponível em `http://localhost:3001/api/v1` e o Swagger em `http://localhost:3001/api/docs`.

---

## Comandos Prisma essenciais

| Comando | Descrição |
|---------|-----------|
| `npx prisma migrate dev --name <nome>` | Cria e aplica nova migration (desenvolvimento) |
| `npx prisma migrate deploy` | Aplica migrations pendentes (produção) |
| `npx prisma migrate reset` | **Apaga tudo** e recria o banco do zero + seed |
| `npx prisma generate` | Regenera o Prisma Client após alterar o schema |
| `npx prisma studio` | Abre interface visual do banco (porta 5555) |
| `npm run prisma:seed` | Executa o `prisma/seed.ts` |

---

## Fluxo de alteração do schema

```bash
# 1. Editar backend/prisma/schema.prisma (adicionar campo, model, etc.)

# 2. Criar a migration (gera SQL e aplica em dev)
docker-compose exec backend npx prisma migrate dev --name add_campo_x

# 3. O Prisma Client é regenerado automaticamente
#    Em produção, aplicar com:
docker-compose exec backend npx prisma migrate deploy
```

---

## Scripts no `package.json`

```json
{
  "scripts": {
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:reset": "prisma migrate reset --force",
    "prisma:studio": "prisma studio"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## Dados criados pelo seed

| Recurso | Quantidade | Detalhe |
|---------|-----------|---------|
| Empresa | 1 | TELECEL Telecomunicações LTDA |
| Lojas | 2 | Matriz (Av. Paulista) + Filial (Shopping) |
| Usuários | 5 | Um por papel (Admin, Supervisor, Vendedor, Financeiro, Auditor) |
| Produtos | 5 | Planos TIM (Black 50/100GB, Controle, Pré, Fibra) |
| Clientes | 3 | 2 PF + 1 PJ (demo) |
| Metas | 2 | Meta de loja + meta de vendedor (mês atual) |

### Credenciais (senha: `Telecel@2025`)

```
admin@telecel.com.br        → ADMIN
supervisor@telecel.com.br   → SUPERVISOR
vendedor@telecel.com.br     → VENDEDOR
financeiro@telecel.com.br   → FINANCEIRO
auditor@telecel.com.br      → AUDITOR
```

> ⚠️ **Produção:** altere todas as senhas e nunca rode o seed com dados demo em ambiente real.

---

## Troubleshooting

**Erro `P1001: Can't reach database server`**
O PostgreSQL ainda não está pronto. Aguarde alguns segundos e tente novamente, ou verifique com `docker-compose ps`.

**Erro `Migration failed to apply`**
Use `npx prisma migrate reset` em desenvolvimento para recriar o banco do zero (apaga todos os dados).

**Seed falha com erro de CPF/CNPJ duplicado**
O seed já foi executado. Use `npx prisma migrate reset` para limpar antes de rodar de novo.

**Prisma Client desatualizado após mudar o schema**
Rode `npx prisma generate` para regenerar os tipos.
