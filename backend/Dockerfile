# =============================================================================
# TELECEL SYSTEM — Dockerfile Backend (NestJS)
# Multi-stage: development → builder → production
# =============================================================================

# ─── STAGE 1: BASE ────────────────────────────────────────────────────────────
# Imagem base com Node.js 20 LTS (Alpine para menor tamanho)
FROM node:20-alpine AS base

# Metadados da imagem
LABEL maintainer="TELECEL Dev Team"
LABEL description="TELECEL Backend API — NestJS"
LABEL version="1.0.0"

# Variáveis de ambiente base
ENV NODE_ENV=production \
    PORT=3001 \
    PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH"

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    curl \
    openssl \
    ca-certificates \
    tzdata \
    && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && echo "America/Sao_Paulo" > /etc/timezone \
    && apk del tzdata

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 -G nodejs

# Diretório de trabalho
WORKDIR /app

# ─── STAGE 2: DEPENDÊNCIAS ────────────────────────────────────────────────────
FROM base AS deps

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS as dependências (incluindo devDependencies para build)
RUN npm ci --include=dev \
    && npm cache clean --force

# Gerar Prisma Client
RUN npx prisma generate

# ─── STAGE 3: DESENVOLVIMENTO ─────────────────────────────────────────────────
FROM deps AS development

ENV NODE_ENV=development

# Copiar código fonte
COPY . .

# Permissões
RUN chown -R nestjs:nodejs /app

# Trocar para usuário não-root
USER nestjs

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Comando de desenvolvimento com hot-reload
CMD ["npm", "run", "start:dev"]

# ─── STAGE 4: BUILD ───────────────────────────────────────────────────────────
FROM deps AS builder

ENV NODE_ENV=production

# Copiar código fonte completo
COPY . .

# Compilar TypeScript para JavaScript
RUN npm run build

# Remover devDependencies para produção
RUN npm ci --omit=dev \
    && npm cache clean --force

# ─── STAGE 5: PRODUÇÃO ────────────────────────────────────────────────────────
FROM base AS production

ENV NODE_ENV=production \
    PORT=3001

# Copiar dependências de produção
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copiar build compilado
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copiar schema Prisma (necessário em runtime)
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copiar node_modules/.prisma (client gerado)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Criar diretório de uploads local (fallback do S3)
RUN mkdir -p /app/uploads /app/logs \
    && chown -R nestjs:nodejs /app/uploads /app/logs

# Trocar para usuário não-root
USER nestjs

# Expor porta da API
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Comando de produção
CMD ["node", "dist/main"]
