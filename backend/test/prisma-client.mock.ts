// Mock do @prisma/client para testes unitários que não dependem do banco.
// Fornece os enums como objetos simples (já que `prisma generate` roda só em ambiente com banco).
export const UserRole = { ADMIN: 'ADMIN', SUPERVISOR: 'SUPERVISOR', VENDEDOR: 'VENDEDOR', FINANCEIRO: 'FINANCEIRO', AUDITOR: 'AUDITOR' };
export const SaleStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED', COMPLETED: 'COMPLETED' };
export const CommissionStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', PAID: 'PAID', CANCELLED: 'CANCELLED' };
export const GoalType = { REVENUE: 'REVENUE', SALES_COUNT: 'SALES_COUNT' };
export const StoreBrand = { TIM: 'TIM', MOTOROLA: 'MOTOROLA', SAMSUNG: 'SAMSUNG' };
export const AuditAction = { CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE', LOGIN: 'LOGIN', LOGOUT: 'LOGOUT', EXPORT: 'EXPORT', APPROVE: 'APPROVE', REJECT: 'REJECT' };
export const ProductCategory = { APARELHO: 'APARELHO', PLANO_CONTROLE: 'PLANO_CONTROLE', TIM_BLACK: 'TIM_BLACK', FIBRA: 'FIBRA', SEGURO: 'SEGURO', SERVICO_ADICIONAL: 'SERVICO_ADICIONAL' };
export const Prisma = {} as any;
export class PrismaClient {}
