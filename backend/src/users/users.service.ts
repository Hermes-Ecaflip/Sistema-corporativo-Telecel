// =============================================================================
// TELECEL SYSTEM — users/users.service.ts
// CRUD completo de usuários: listagem, filtros, avatar S3, exportação CSV
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { S3Service } from '../uploads/s3.service';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  UpdateUserStatusDto,
} from './dto/user.dto';
import { AuditAction, UserRole, UserStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createObjectCsvStringifier } from 'csv-writer';

const BCRYPT_ROUNDS = 12;

// Campos seguros para retornar — nunca retornar senha ou 2FA secret
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  cpf: true,
  role: true,
  sector: true,
  status: true,
  companyId: true,
  storeId: true,
  twoFactorEnabled: true,
  avatarUrl: true,
  lastLoginAt: true,
  lastLoginIp: true,
  birthDate: true,
  createdAt: true,
  updatedAt: true,
  store: { select: { id: true, name: true, code: true, brand: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly s3: S3Service,
  ) {}

  // ─── CRIAR ─────────────────────────────────────────────────────────────

  async create(
    dto: CreateUserDto,
    companyId: string,
    createdBy: string,
  ) {
    // Verificar duplicidade de e-mail
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    // Verificar CPF duplicado (escopo da empresa)
    if (dto.cpf) {
      const cpfExists = await this.prisma.user.findFirst({
        where: { cpf: dto.cpf, companyId, deletedAt: null },
      });
      if (cpfExists) throw new ConflictException('CPF já cadastrado nesta empresa');
    }

    // Verificar se a loja pertence à empresa
    if (dto.storeId) {
      const store = await this.prisma.store.findFirst({
        where: { id: dto.storeId, companyId, deletedAt: null },
      });
      if (!store) throw new BadRequestException('Loja não encontrada nesta empresa');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
        companyId,
        status: UserStatus.ACTIVE,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
      select: SAFE_USER_SELECT,
    });

    await this.audit.log({
      userId: createdBy,
      companyId,
      action: AuditAction.CREATE,
      entity: 'User',
      entityId: user.id,
      newValues: { name: user.name, email: user.email, role: user.role },
      description: `Usuário criado: ${user.name} (${user.role})`,
    });

    return user;
  }

  // ─── LISTAR ────────────────────────────────────────────────────────────

  async findAll(companyId: string, query: QueryUserDto) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      storeId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Construir filtro dinâmico
    const where: Prisma.UserWhereInput = {
      companyId,
      deletedAt: null,
      ...(role && { role }),
      ...(status && { status }),
      ...(storeId && { storeId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
    };

    // Validar campo de ordenação (evitar injection)
    const allowedSortFields = ['name', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    return this.prisma.paginate(this.prisma.user, {
      where,
      orderBy: { [safeSortBy]: sortOrder },
      select: SAFE_USER_SELECT,
      page,
      limit,
    });
  }

  // ─── BUSCAR POR ID ─────────────────────────────────────────────────────

  async findOne(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  // ─── ATUALIZAR ─────────────────────────────────────────────────────────

  async update(
    id: string,
    companyId: string,
    dto: UpdateUserDto,
    updatedBy: string,
  ) {
    const existing = await this.findOne(id, companyId);

    // Verificar CPF duplicado (excluindo o próprio usuário)
    if (dto.cpf && dto.cpf !== existing.cpf) {
      const cpfExists = await this.prisma.user.findFirst({
        where: { cpf: dto.cpf, companyId, deletedAt: null, NOT: { id } },
      });
      if (cpfExists) throw new ConflictException('CPF já cadastrado nesta empresa');
    }

    // Verificar loja
    if (dto.storeId) {
      const store = await this.prisma.store.findFirst({
        where: { id: dto.storeId, companyId, deletedAt: null },
      });
      if (!store) throw new BadRequestException('Loja não encontrada nesta empresa');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
      select: SAFE_USER_SELECT,
    });

    const diff = this.audit.createDiff(existing as any, updated as any);
    await this.audit.log({
      userId: updatedBy,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: id,
      oldValues: diff.old,
      newValues: diff.new,
      description: `Usuário atualizado: ${updated.name}`,
    });

    return updated;
  }

  // ─── ALTERAR STATUS ────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    companyId: string,
    dto: UpdateUserStatusDto,
    updatedBy: string,
    requesterRole: UserRole,
  ) {
    // Somente Admin pode alterar status
    if (requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Somente administradores podem alterar o status de usuários');
    }

    // Admin não pode desativar a si mesmo
    if (id === updatedBy) {
      throw new BadRequestException('Você não pode alterar seu próprio status');
    }

    const user = await this.findOne(id, companyId);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: SAFE_USER_SELECT,
    });

    await this.audit.log({
      userId: updatedBy,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: id,
      oldValues: { status: user.status },
      newValues: { status: dto.status },
      description: `Status alterado para ${dto.status}${dto.reason ? ': ' + dto.reason : ''}`,
    });

    return updated;
  }

  // ─── SOFT DELETE ───────────────────────────────────────────────────────

  async remove(id: string, companyId: string, deletedBy: string, requesterRole: UserRole) {
    if (requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Somente administradores podem excluir usuários');
    }

    if (id === deletedBy) {
      throw new BadRequestException('Você não pode excluir sua própria conta');
    }

    const user = await this.findOne(id, companyId);

    // Soft delete via Prisma middleware
    await this.prisma.user.delete({ where: { id } });

    await this.audit.log({
      userId: deletedBy,
      companyId,
      action: AuditAction.DELETE,
      entity: 'User',
      entityId: id,
      oldValues: { name: user.name, email: user.email, role: user.role },
      description: `Usuário removido: ${user.name}`,
    });

    return { message: 'Usuário removido com sucesso' };
  }

  // ─── UPLOAD DE AVATAR ──────────────────────────────────────────────────

  async uploadAvatar(
    userId: string,
    companyId: string,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    const user = await this.findOne(userId, companyId);

    // Remover avatar anterior do S3 se existir
    if (user.avatarUrl) {
      try {
        const oldKey = this.s3.extractKeyFromUrl(user.avatarUrl);
        if (oldKey) await this.s3.deleteFile(oldKey);
      } catch {
        this.logger.warn(`Falha ao remover avatar anterior: ${user.avatarUrl}`);
      }
    }

    const key = `avatars/${companyId}/${userId}-${Date.now()}`;
    const avatarUrl = await this.s3.uploadFile(file, key, {
      resize: { width: 256, height: 256 },
      folder: 'avatars',
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return { avatarUrl };
  }

  // ─── EXPORTAR CSV ──────────────────────────────────────────────────────

  async exportCsv(companyId: string, query: QueryUserDto): Promise<string> {
    // Buscar todos sem paginação para exportação
    const { data } = await this.findAll(companyId, { ...query, limit: 10000, page: 1 });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'name', title: 'Nome' },
        { id: 'email', title: 'E-mail' },
        { id: 'phone', title: 'Telefone' },
        { id: 'cpf', title: 'CPF' },
        { id: 'role', title: 'Papel' },
        { id: 'status', title: 'Status' },
        { id: 'store', title: 'Loja' },
        { id: 'lastLoginAt', title: 'Último Acesso' },
        { id: 'createdAt', title: 'Criado Em' },
      ],
    });

    const records = data.map((u: any) => ({
      name: u.name,
      email: u.email,
      phone: u.phone ?? '',
      cpf: u.cpf ?? '',
      role: u.role,
      status: u.status,
      store: u.store?.name ?? '',
      lastLoginAt: u.lastLoginAt
        ? new Date(u.lastLoginAt).toLocaleString('pt-BR')
        : '',
      createdAt: new Date(u.createdAt).toLocaleString('pt-BR'),
    }));

    return (
      '\uFEFF' + // BOM para Excel reconhecer UTF-8
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  // ─── ESTATÍSTICAS ──────────────────────────────────────────────────────

  async getStats(companyId: string) {
    const [total, byRole, byStatus, recentLogins] = await Promise.all([
      this.prisma.user.count({ where: { companyId, deletedAt: null } }),

      this.prisma.user.groupBy({
        by: ['role'],
        where: { companyId, deletedAt: null },
        _count: { role: true },
      }),

      this.prisma.user.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: { status: true },
      }),

      this.prisma.user.count({
        where: {
          companyId,
          deletedAt: null,
          lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      byRole: Object.fromEntries(
        byRole.map((r) => [r.role, r._count.role]),
      ),
      byStatus: Object.fromEntries(
        byStatus.map((s) => [s.status, s._count.status]),
      ),
      activeLastWeek: recentLogins,
    };
  }
}
