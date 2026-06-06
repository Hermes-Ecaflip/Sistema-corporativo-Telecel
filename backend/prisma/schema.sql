-- =============================================================================
-- TELECEL SYSTEM — Estrutura do Banco de Dados (PostgreSQL 16)
-- =============================================================================
-- Este arquivo é uma REPRESENTAÇÃO da estrutura para visualização no GitHub.
-- A criação real das tabelas é feita pelo Prisma via:
--     npx prisma migrate deploy
-- a partir de backend/prisma/schema.prisma (fonte da verdade).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TYPE "UserRole"            AS ENUM ('ADMIN','SUPERVISOR','VENDEDOR','FINANCEIRO','AUDITOR');
CREATE TYPE "UserStatus"          AS ENUM ('ACTIVE','INACTIVE','SUSPENDED','PENDING_VERIFICATION');
CREATE TYPE "PersonType"          AS ENUM ('PF','PJ');
CREATE TYPE "ClientStatus"        AS ENUM ('ACTIVE','INACTIVE','BLOCKED','FRAUD_SUSPECT');
CREATE TYPE "ProductCategory"     AS ENUM ('POS_PAGO','PRE_PAGO','CONTROLE','INTERNET_FIXA','TV','COMBO','ACESSORIO');
CREATE TYPE "ProductStatus"       AS ENUM ('ACTIVE','INACTIVE','DISCONTINUED');
CREATE TYPE "SaleStatus"          AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED');
CREATE TYPE "SaleChannel"         AS ENUM ('LOJA','TELEVENDAS','ONLINE','PARCEIRO');
CREATE TYPE "PaymentMethod"       AS ENUM ('DEBITO_AUTOMATICO','BOLETO','CARTAO_CREDITO','PIX');
CREATE TYPE "CommissionType"      AS ENUM ('PERCENTAGE','FIXED');
CREATE TYPE "CommissionStatus"    AS ENUM ('PENDING','APPROVED','PAID','CANCELLED');
CREATE TYPE "PaymentStatus"       AS ENUM ('PENDING','PROCESSING','PAID','FAILED');
CREATE TYPE "NotificationType"    AS ENUM ('SALE_PENDING','SALE_APPROVED','SALE_REJECTED','SYSTEM','COMMISSION','GOAL');
CREATE TYPE "NotificationStatus"  AS ENUM ('UNREAD','READ');
CREATE TYPE "AuditAction"         AS ENUM ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','APPROVE','REJECT');
CREATE TYPE "GoalType"            AS ENUM ('REVENUE','SALES_COUNT');
CREATE TYPE "FinancialCloseStatus" AS ENUM ('OPEN','CLOSED','REOPENED');
CREATE TYPE "MovementType"        AS ENUM ('INCOME','EXPENSE');

-- ─────────────────────────────────────────────────────────────────────────
-- EMPRESAS E LOJAS (multi-tenant)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "companies" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"         VARCHAR(200) NOT NULL,
  "trade_name"   VARCHAR(200),
  "cnpj"         VARCHAR(14) UNIQUE NOT NULL,
  "email"        VARCHAR(255),
  "phone"        VARCHAR(20),
  "partner_code" VARCHAR(50),
  "created_at"   TIMESTAMP DEFAULT now(),
  "updated_at"   TIMESTAMP DEFAULT now(),
  "deleted_at"   TIMESTAMP
);

CREATE TABLE "stores" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL REFERENCES "companies"("id"),
  "code"       VARCHAR(50) UNIQUE NOT NULL,
  "name"       VARCHAR(200) NOT NULL,
  "city"       VARCHAR(100),
  "state"      VARCHAR(2),
  "phone"      VARCHAR(20),
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now(),
  "deleted_at" TIMESTAMP
);
CREATE INDEX ON "stores"("company_id");

-- ─────────────────────────────────────────────────────────────────────────
-- USUÁRIOS (RBAC, 2FA, soft delete)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "users" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"               UUID NOT NULL REFERENCES "companies"("id"),
  "store_id"                 UUID REFERENCES "stores"("id"),
  "name"                     VARCHAR(200) NOT NULL,
  "email"                    VARCHAR(255) UNIQUE NOT NULL,
  "phone"                    VARCHAR(20),
  "cpf"                      VARCHAR(14),
  "password"                 VARCHAR(255) NOT NULL,
  "role"                     "UserRole" DEFAULT 'VENDEDOR',
  "status"                   "UserStatus" DEFAULT 'ACTIVE',
  "avatar_url"               TEXT,
  "birth_date"               DATE,
  "two_factor_enabled"       BOOLEAN DEFAULT false,
  "two_factor_secret"        TEXT,
  "email_verification_token" TEXT,
  "password_reset_token"     TEXT,
  "password_reset_expires"   TIMESTAMP,
  "last_login_at"            TIMESTAMP,
  "last_login_ip"            VARCHAR(45),
  "failed_login_count"       INT DEFAULT 0,
  "created_at"               TIMESTAMP DEFAULT now(),
  "updated_at"               TIMESTAMP DEFAULT now(),
  "deleted_at"               TIMESTAMP
);
CREATE INDEX ON "users"("company_id");
CREATE INDEX ON "users"("email");
CREATE INDEX ON "users"("cpf");
CREATE INDEX ON "users"("status");
CREATE INDEX ON "users"("role");

-- ─────────────────────────────────────────────────────────────────────────
-- CLIENTES (CPF/CNPJ, score anti-fraude)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "clients" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"   UUID NOT NULL REFERENCES "companies"("id"),
  "person_type"  "PersonType" NOT NULL,
  "name"         VARCHAR(200) NOT NULL,
  "cpf"          VARCHAR(14),
  "cnpj"         VARCHAR(14),
  "rg"           VARCHAR(20),
  "birth_date"   DATE,
  "phone"        VARCHAR(20) NOT NULL,
  "phone2"       VARCHAR(20),
  "whatsapp"     VARCHAR(20),
  "email"        VARCHAR(255),
  "status"       "ClientStatus" DEFAULT 'ACTIVE',
  "fraud_score"  INT DEFAULT 0,
  "zip_code"     VARCHAR(9),
  "street"       VARCHAR(200),
  "number"       VARCHAR(20),
  "complement"   VARCHAR(100),
  "district"     VARCHAR(100),
  "city"         VARCHAR(100),
  "state"        VARCHAR(2),
  "tim_line"     VARCHAR(20),
  "iccid"        VARCHAR(30),
  "observations" TEXT,
  "created_at"   TIMESTAMP DEFAULT now(),
  "updated_at"   TIMESTAMP DEFAULT now(),
  "deleted_at"   TIMESTAMP
);
CREATE INDEX ON "clients"("company_id");
CREATE INDEX ON "clients"("cpf");
CREATE INDEX ON "clients"("cnpj");
CREATE INDEX ON "clients"("phone");
CREATE INDEX ON "clients"("status");

-- ─────────────────────────────────────────────────────────────────────────
-- PRODUTOS / PLANOS TIM
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "products" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"       UUID NOT NULL REFERENCES "companies"("id"),
  "name"             VARCHAR(200) NOT NULL,
  "code"             VARCHAR(50) NOT NULL,
  "description"      TEXT,
  "category"         "ProductCategory" NOT NULL,
  "price"            DECIMAL(10,2) NOT NULL,
  "promo_price"      DECIMAL(10,2),
  "commission_type"  "CommissionType" NOT NULL,
  "commission_value" DECIMAL(10,2) NOT NULL,
  "data_gb"          INT,
  "loyalty_months"   INT,
  "includes_device"  BOOLEAN DEFAULT false,
  "included_apps"    TEXT[],
  "status"           "ProductStatus" DEFAULT 'ACTIVE',
  "created_at"       TIMESTAMP DEFAULT now(),
  "updated_at"       TIMESTAMP DEFAULT now(),
  "deleted_at"       TIMESTAMP,
  UNIQUE ("company_id","code")
);
CREATE INDEX ON "products"("company_id");
CREATE INDEX ON "products"("category");

-- ─────────────────────────────────────────────────────────────────────────
-- VENDAS E ITENS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "sales" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sale_number"      VARCHAR(30) NOT NULL,
  "company_id"       UUID NOT NULL REFERENCES "companies"("id"),
  "client_id"        UUID NOT NULL REFERENCES "clients"("id"),
  "seller_id"        UUID NOT NULL REFERENCES "users"("id"),
  "reviewer_id"      UUID REFERENCES "users"("id"),
  "store_id"         UUID REFERENCES "stores"("id"),
  "channel"          "SaleChannel" NOT NULL,
  "payment_method"   "PaymentMethod" NOT NULL,
  "status"           "SaleStatus" DEFAULT 'PENDING',
  "total_amount"     DECIMAL(12,2) NOT NULL,
  "total_commission" DECIMAL(12,2) NOT NULL,
  "scheduled_at"     TIMESTAMP,
  "approved_at"      TIMESTAMP,
  "rejected_at"      TIMESTAMP,
  "cancelled_at"     TIMESTAMP,
  "review_reason"    VARCHAR(500),
  "observations"     TEXT,
  "created_at"       TIMESTAMP DEFAULT now(),
  "updated_at"       TIMESTAMP DEFAULT now(),
  "deleted_at"       TIMESTAMP
);
CREATE INDEX ON "sales"("company_id");
CREATE INDEX ON "sales"("client_id");
CREATE INDEX ON "sales"("seller_id");
CREATE INDEX ON "sales"("status");

CREATE TABLE "sale_items" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sale_id"      UUID NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
  "product_id"   UUID NOT NULL REFERENCES "products"("id"),
  "product_name" VARCHAR(200) NOT NULL,
  "quantity"     INT NOT NULL,
  "unit_price"   DECIMAL(10,2) NOT NULL,
  "subtotal"     DECIMAL(12,2) NOT NULL,
  "commission"   DECIMAL(12,2) NOT NULL,
  "notes"        VARCHAR(300),
  "created_at"   TIMESTAMP DEFAULT now()
);
CREATE INDEX ON "sale_items"("sale_id");
CREATE INDEX ON "sale_items"("product_id");

-- ─────────────────────────────────────────────────────────────────────────
-- DOCUMENTOS (uploads vinculados a clientes/vendas)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "documents" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"     UUID NOT NULL REFERENCES "companies"("id"),
  "client_id"      UUID REFERENCES "clients"("id"),
  "sale_id"        UUID REFERENCES "sales"("id"),
  "uploaded_by_id" UUID NOT NULL REFERENCES "users"("id"),
  "type"           VARCHAR(50) NOT NULL,
  "name"           VARCHAR(255) NOT NULL,
  "mime_type"      VARCHAR(100) NOT NULL,
  "size"           INT NOT NULL,
  "url"            TEXT NOT NULL,
  "s3_key"         TEXT NOT NULL,
  "created_at"     TIMESTAMP DEFAULT now()
);
CREATE INDEX ON "documents"("client_id");
CREATE INDEX ON "documents"("sale_id");

-- ─────────────────────────────────────────────────────────────────────────
-- COMISSÕES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "commission_rules" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"  UUID NOT NULL REFERENCES "companies"("id"),
  "name"        VARCHAR(200) NOT NULL,
  "type"        "CommissionType" NOT NULL,
  "value"       DECIMAL(10,2) NOT NULL,
  "created_at"  TIMESTAMP DEFAULT now(),
  "updated_at"  TIMESTAMP DEFAULT now()
);

CREATE TABLE "commissions" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"      UUID NOT NULL REFERENCES "companies"("id"),
  "sale_id"         UUID NOT NULL REFERENCES "sales"("id"),
  "user_id"         UUID NOT NULL REFERENCES "users"("id"),
  "amount"          DECIMAL(12,2) NOT NULL,
  "status"          "CommissionStatus" DEFAULT 'PENDING',
  "reference_month" VARCHAR(7) NOT NULL,
  "approved_at"     TIMESTAMP,
  "paid_at"         TIMESTAMP,
  "payment_note"    VARCHAR(300),
  "created_at"      TIMESTAMP DEFAULT now(),
  "updated_at"      TIMESTAMP DEFAULT now()
);
CREATE INDEX ON "commissions"("company_id");
CREATE INDEX ON "commissions"("user_id");
CREATE INDEX ON "commissions"("reference_month");
CREATE INDEX ON "commissions"("status");

-- ─────────────────────────────────────────────────────────────────────────
-- METAS (Dashboard)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "goals" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"      UUID NOT NULL REFERENCES "companies"("id"),
  "store_id"        UUID REFERENCES "stores"("id"),
  "user_id"         UUID REFERENCES "users"("id"),
  "type"            "GoalType" DEFAULT 'REVENUE',
  "reference_month" VARCHAR(7) NOT NULL,
  "target_value"    DECIMAL(12,2) NOT NULL,
  "created_at"      TIMESTAMP DEFAULT now(),
  "updated_at"      TIMESTAMP DEFAULT now()
);
CREATE INDEX ON "goals"("company_id");
CREATE INDEX ON "goals"("reference_month");

-- ─────────────────────────────────────────────────────────────────────────
-- FINANCEIRO (fechamentos + movimentos)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "financial_closes" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"        UUID NOT NULL REFERENCES "companies"("id"),
  "store_id"          UUID REFERENCES "stores"("id"),
  "reference_month"   VARCHAR(7) NOT NULL,
  "gross_revenue"     DECIMAL(12,2) DEFAULT 0,
  "total_commissions" DECIMAL(12,2) DEFAULT 0,
  "total_expenses"    DECIMAL(12,2) DEFAULT 0,
  "net_result"        DECIMAL(12,2) DEFAULT 0,
  "sales_count"       INT DEFAULT 0,
  "status"            "FinancialCloseStatus" DEFAULT 'CLOSED',
  "notes"             TEXT,
  "closed_at"         TIMESTAMP,
  "closed_by_id"      UUID REFERENCES "users"("id"),
  "created_at"        TIMESTAMP DEFAULT now(),
  "updated_at"        TIMESTAMP DEFAULT now()
);
CREATE INDEX ON "financial_closes"("company_id");
CREATE INDEX ON "financial_closes"("reference_month");

CREATE TABLE "financial_movements" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"      UUID NOT NULL REFERENCES "companies"("id"),
  "store_id"        UUID REFERENCES "stores"("id"),
  "type"            "MovementType" NOT NULL,
  "description"     VARCHAR(300) NOT NULL,
  "amount"          DECIMAL(12,2) NOT NULL,
  "reference_month" VARCHAR(7) NOT NULL,
  "category"        VARCHAR(100),
  "created_by_id"   UUID NOT NULL REFERENCES "users"("id"),
  "created_at"      TIMESTAMP DEFAULT now(),
  "updated_at"      TIMESTAMP DEFAULT now()
);
CREATE INDEX ON "financial_movements"("company_id");
CREATE INDEX ON "financial_movements"("reference_month");

-- ─────────────────────────────────────────────────────────────────────────
-- NOTIFICAÇÕES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "notifications" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL REFERENCES "companies"("id"),
  "user_id"    UUID NOT NULL REFERENCES "users"("id"),
  "type"       "NotificationType" NOT NULL,
  "title"      VARCHAR(200) NOT NULL,
  "message"    TEXT NOT NULL,
  "read"       BOOLEAN DEFAULT false,
  "link"       TEXT,
  "metadata"   JSONB,
  "read_at"    TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT now()
);
CREATE INDEX ON "notifications"("user_id");
CREATE INDEX ON "notifications"("read");

-- ─────────────────────────────────────────────────────────────────────────
-- AUDITORIA (logs imutáveis)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "audit_logs" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "user_id"    UUID,
  "action"     "AuditAction" NOT NULL,
  "entity"     VARCHAR(100) NOT NULL,
  "entity_id"  UUID,
  "old_values" JSONB,
  "new_values" JSONB,
  "ip"         VARCHAR(45),
  "user_agent" VARCHAR(500),
  "description" TEXT,
  "created_at" TIMESTAMP DEFAULT now()
);
CREATE INDEX ON "audit_logs"("company_id");
CREATE INDEX ON "audit_logs"("entity");
CREATE INDEX ON "audit_logs"("created_at");

-- ─────────────────────────────────────────────────────────────────────────
-- REFRESH TOKENS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE "refresh_tokens" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL REFERENCES "users"("id"),
  "token_id"   VARCHAR(255) UNIQUE NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "revoked"    BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT now()
);
CREATE INDEX ON "refresh_tokens"("user_id");

-- =============================================================================
-- FIM — 18 tabelas, 18 enums
-- Fonte da verdade: backend/prisma/schema.prisma
-- =============================================================================
