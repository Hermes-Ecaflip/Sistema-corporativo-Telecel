// Mock do @prisma/client para testes unitários que não dependem do banco.
// Fornece os enums como objetos simples (já que `prisma generate` roda só em ambiente com banco).
export const UserRole = { ADMIN: 'ADMIN', GERENTE: 'GERENTE', SUPERVISOR: 'SUPERVISOR', VENDEDOR: 'VENDEDOR', ESTOQUISTA: 'ESTOQUISTA', RH: 'RH', FINANCEIRO: 'FINANCEIRO', AUDITOR: 'AUDITOR' };
export const SaleStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED', COMPLETED: 'COMPLETED' };
export const CommissionStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', PAID: 'PAID', CANCELLED: 'CANCELLED' };
export const GoalType = { REVENUE: 'REVENUE', SALES_COUNT: 'SALES_COUNT' };
export const StoreBrand = { TIM: 'TIM', MOTOROLA: 'MOTOROLA', SAMSUNG: 'SAMSUNG' };
export const AuditAction = { CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE', LOGIN: 'LOGIN', LOGOUT: 'LOGOUT', EXPORT: 'EXPORT', APPROVE: 'APPROVE', REJECT: 'REJECT' };
export const ProductCategory = { APARELHO: 'APARELHO', PLANO_CONTROLE: 'PLANO_CONTROLE', TIM_BLACK: 'TIM_BLACK', FIBRA: 'FIBRA', SEGURO: 'SEGURO', SERVICO_ADICIONAL: 'SERVICO_ADICIONAL' };
export const Sector = { VENDAS: 'VENDAS', ESTOQUE: 'ESTOQUE', RH: 'RH', FINANCEIRO: 'FINANCEIRO', GERENCIA: 'GERENCIA' };
export const StockStatus = { AVAILABLE: 'AVAILABLE', RESERVED: 'RESERVED', SOLD: 'SOLD', TRANSFERRED: 'TRANSFERRED', DAMAGED: 'DAMAGED', IN_TRANSIT: 'IN_TRANSIT' };
export const TransferStatus = { PENDING: 'PENDING', IN_TRANSIT: 'IN_TRANSIT', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' };
export const DamageSeverity = { MINOR: 'MINOR', MODERATE: 'MODERATE', SEVERE: 'SEVERE', TOTAL: 'TOTAL' };
export const DamageStatus = { REPORTED: 'REPORTED', IN_REVIEW: 'IN_REVIEW', RESOLVED: 'RESOLVED', WRITTEN_OFF: 'WRITTEN_OFF' };
export const Prisma = {} as any;
export class PrismaClient {}
