// =============================================================================
// TELECEL SYSTEM — prisma/seed.ts
// Popula o banco com dados iniciais: empresa, lojas, usuários, produtos, demo
// Executar: npm run prisma:seed
// =============================================================================

import { PrismaClient, UserRole, UserStatus, PersonType, ClientStatus,
  ProductCategory, ProductStatus, CommissionType, StoreBrand } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Telecel@2025';
const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🌱 Iniciando seed do TELECEL System...\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  // ─── 1. EMPRESA ────────────────────────────────────────────────────────
  console.log('📦 Criando empresa...');
  const company = await prisma.company.upsert({
    where: { cnpj: '12345678000195' },
    update: {},
    create: {
      name: 'TELECEL Telecomunicações LTDA',
      tradeName: 'TELECEL',
      cnpj: '12345678000195',
      email: 'contato@telecel.com.br',
      phone: '(11) 3000-0000',
      partnerCode: 'TIM-TC-001', // Código de parceiro TIM
    },
  });
  console.log(`   ✓ Empresa: ${company.tradeName}\n`);

  // ─── 2. LOJAS (marcas TIM, Motorola e Samsung, espalhadas pelo Brasil) ───
  console.log('🏪 Criando lojas...');
  const storesData = [
    // Lojas TIM
    { code: 'TIM-PLAN-DF',  brand: StoreBrand.TIM,      name: 'TIM Planaltina',        city: 'Planaltina',     state: 'DF', phone: '(61) 3000-0001' },
    { code: 'TIM-JK-DF',    brand: StoreBrand.TIM,      name: 'TIM JK Shopping',       city: 'Brasília',       state: 'DF', phone: '(61) 3000-0002' },
    { code: 'TIM-CRB-MS',   brand: StoreBrand.TIM,      name: 'TIM Corumbá',           city: 'Corumbá',        state: 'MS', phone: '(67) 3000-0003' },
    // Lojas Motorola
    { code: 'MOTO-SP-001',  brand: StoreBrand.MOTOROLA, name: 'Motorola Paulista',     city: 'São Paulo',      state: 'SP', phone: '(11) 3000-0010' },
    { code: 'MOTO-RJ-001',  brand: StoreBrand.MOTOROLA, name: 'Motorola Barra',        city: 'Rio de Janeiro', state: 'RJ', phone: '(21) 3000-0011' },
    // Lojas Samsung
    { code: 'SAM-MG-001',   brand: StoreBrand.SAMSUNG,  name: 'Samsung BH Shopping',   city: 'Belo Horizonte', state: 'MG', phone: '(31) 3000-0020' },
    { code: 'SAM-DF-001',   brand: StoreBrand.SAMSUNG,  name: 'Samsung Brasília',      city: 'Brasília',       state: 'DF', phone: '(61) 3000-0021' },
  ];

  const stores: Record<string, any> = {};
  for (const s of storesData) {
    const store = await prisma.store.upsert({
      where: { companyId_code: { companyId: company.id, code: s.code } },
      update: {},
      create: { companyId: company.id, ...s },
    });
    stores[s.code] = store;
    console.log(`   ✓ [${s.brand.padEnd(8)}] ${s.name} — ${s.city}/${s.state}`);
  }
  // Loja de referência (sede operacional: TIM Planaltina)
  const storeMatriz = stores['TIM-PLAN-DF'];
  console.log('');

  // ─── 3. USUÁRIOS (um por papel) ──────────────────────────────────────────
  console.log('👤 Criando usuários...');
  const usersData = [
    { name: 'Administrador TELECEL', email: 'admin@telecel.com.br', role: UserRole.ADMIN, storeId: stores['TIM-PLAN-DF'].id },
    { name: 'Carlos Supervisor', email: 'supervisor@telecel.com.br', role: UserRole.SUPERVISOR, storeId: stores['TIM-JK-DF'].id },
    { name: 'Vanessa Vendedora', email: 'vendedor@telecel.com.br', role: UserRole.VENDEDOR, storeId: stores['TIM-PLAN-DF'].id },
    { name: 'Fernando Financeiro', email: 'financeiro@telecel.com.br', role: UserRole.FINANCEIRO, storeId: stores['MOTO-SP-001'].id },
    { name: 'Auditoria Interna', email: 'auditor@telecel.com.br', role: UserRole.AUDITOR, storeId: stores['SAM-MG-001'].id },
  ];

  const users: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        companyId: company.id,
        storeId: u.storeId,
        name: u.name,
        email: u.email,
        phone: '(11) 99999-0000',
        password: hashedPassword,
        role: u.role,
        status: UserStatus.ACTIVE,
      },
    });
    users[u.role] = user;
    console.log(`   ✓ ${u.role.padEnd(11)} → ${u.email}`);
  }
  console.log('');

  // ─── 4. PRODUTOS (planos TIM + aparelhos Motorola/Samsung) ───────────────
  console.log('📱 Criando produtos...');
  const productsData = [
    // Planos TIM
    {
      name: 'TIM Black 50GB', code: 'TIM-BLACK-50', category: ProductCategory.TIM_BLACK,
      price: 89.90, promoPrice: 79.90, dataGb: 50, loyaltyMonths: 12,
      commissionType: CommissionType.PERCENTAGE, commissionValue: 15,
      includedApps: ['WhatsApp', 'Instagram', 'TikTok', 'Facebook'],
    },
    {
      name: 'TIM Black 100GB', code: 'TIM-BLACK-100', category: ProductCategory.TIM_BLACK,
      price: 129.90, dataGb: 100, loyaltyMonths: 12,
      commissionType: CommissionType.PERCENTAGE, commissionValue: 18,
      includedApps: ['WhatsApp', 'Instagram', 'TikTok', 'Facebook', 'YouTube'],
    },
    {
      name: 'TIM Controle 25GB', code: 'TIM-CTRL-25', category: ProductCategory.PLANO_CONTROLE,
      price: 49.90, dataGb: 25, loyaltyMonths: 0,
      commissionType: CommissionType.FIXED, commissionValue: 12,
      includedApps: ['WhatsApp'],
    },
    {
      name: 'TIM Ultra Fibra 500MB', code: 'TIM-FIBRA-500', category: ProductCategory.FIBRA,
      price: 99.90, loyaltyMonths: 12, includesDevice: true,
      commissionType: CommissionType.FIXED, commissionValue: 40,
    },
    // Aparelhos Motorola
    {
      name: 'Motorola Edge 50 Ultra', code: 'MOTO-EDGE50U', category: ProductCategory.APARELHO,
      price: 4499.00, commissionType: CommissionType.PERCENTAGE, commissionValue: 8,
    },
    {
      name: 'Motorola Moto G84 5G', code: 'MOTO-G84', category: ProductCategory.APARELHO,
      price: 1899.00, commissionType: CommissionType.PERCENTAGE, commissionValue: 6,
    },
    // Aparelhos Samsung
    {
      name: 'Samsung Galaxy S24 Ultra', code: 'SAM-S24U', category: ProductCategory.APARELHO,
      price: 7999.00, commissionType: CommissionType.PERCENTAGE, commissionValue: 7,
    },
    {
      name: 'Samsung Galaxy A55 5G', code: 'SAM-A55', category: ProductCategory.APARELHO,
      price: 2799.00, commissionType: CommissionType.PERCENTAGE, commissionValue: 6,
    },
  ];

  const products: any[] = [];
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { companyId_code: { companyId: company.id, code: p.code } },
      update: {},
      create: {
        companyId: company.id,
        status: ProductStatus.ACTIVE,
        includesDevice: false,
        includedApps: [],
        ...p,
      },
    });
    products.push(product);
    console.log(`   ✓ ${p.code.padEnd(16)} R$ ${p.price.toFixed(2)}`);
  }
  console.log('');

  // ─── 5. CLIENTES DEMO ────────────────────────────────────────────────────
  console.log('🧑 Criando clientes demo...');
  const clientsData = [
    {
      personType: PersonType.PF, name: 'Maria Oliveira Santos',
      cpf: '52998224725', phone: '(11) 98765-4321',
      email: 'maria.oliveira@email.com', city: 'São Paulo', state: 'SP',
    },
    {
      personType: PersonType.PF, name: 'João Pedro Almeida',
      cpf: '11144477735', phone: '(11) 97654-3210',
      email: 'joao.almeida@email.com', city: 'São Paulo', state: 'SP',
    },
    {
      personType: PersonType.PJ, name: 'Padaria Pão Quente LTDA',
      cnpj: '11222333000181', phone: '(11) 3456-7890',
      email: 'contato@paoquente.com.br', city: 'São Paulo', state: 'SP',
    },
  ];

  const clients: any[] = [];
  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: { companyId: company.id, status: ClientStatus.ACTIVE, fraudScore: 0, ...c },
    });
    clients.push(client);
    console.log(`   ✓ ${c.name}`);
  }
  console.log('');

  // ─── 6. METAS DO MÊS ATUAL ───────────────────────────────────────────────
  console.log('🎯 Criando metas...');
  const currentMonth = new Date().toISOString().slice(0, 7);
  await prisma.goal.create({
    data: {
      companyId: company.id, type: 'REVENUE', referenceMonth: currentMonth,
      targetValue: 50000, storeId: storeMatriz.id,
    },
  });
  await prisma.goal.create({
    data: {
      companyId: company.id, type: 'REVENUE', referenceMonth: currentMonth,
      targetValue: 15000, userId: users[UserRole.VENDEDOR].id,
    },
  });
  console.log(`   ✓ Meta da loja: R$ 50.000 (${currentMonth})`);
  console.log(`   ✓ Meta do vendedor: R$ 15.000 (${currentMonth})\n`);

  console.log('✅ Seed concluído com sucesso!\n');
  console.log('━'.repeat(55));
  console.log('  CREDENCIAIS DE ACESSO (senha: Telecel@2025)');
  console.log('━'.repeat(55));
  usersData.forEach((u) => console.log(`  ${u.role.padEnd(11)} → ${u.email}`));
  console.log('━'.repeat(55));
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
