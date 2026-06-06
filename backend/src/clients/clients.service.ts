// =============================================================================
// TELECEL SYSTEM — clients/clients.service.ts
// CRUD de Clientes: validação CPF/CNPJ, score anti-fraude, busca avançada
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateClientDto,
  UpdateClientDto,
  QueryClientDto,
  UpdateClientStatusDto,
} from './dto/client.dto';
import { AuditAction, Prisma, PersonType, ClientStatus } from '@prisma/client';
import { CpfCnpjUtil } from '../common/utils/cpf-cnpj.util';
import { createObjectCsvStringifier } from 'csv-writer';

const SAFE_CLIENT_SELECT = {
  id: true,
  name: true,
  personType: true,
  cpf: true,
  cnpj: true,
  rg: true,
  birthDate: true,
  phone: true,
  phone2: true,
  whatsapp: true,
  email: true,
  status: true,
  fraudScore: true,
  zipCode: true,
  street: true,
  number: true,
  complement: true,
  district: true,
  city: true,
  state: true,
  timLine: true,
  iccid: true,
  observations: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClientSelect;

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── CRIAR ─────────────────────────────────────────────────────────────

  async create(
    dto: CreateClientDto,
    companyId: string,
    createdBy: string,
  ) {
    // Validar CPF/CNPJ de acordo com personType
    this.validatePersonTypeDocument(dto);

    // Verificar duplicidade de CPF ou CNPJ (escopo da empresa)
    await this.checkDuplicates(dto, companyId);

    // Calcular score de fraude inicial
    const fraudScore = this.calculateFraudScore(dto);

    const client = await this.prisma.client.create({
      data: {
        companyId,
        personType: dto.personType,
        name: dto.name,
        cpf: dto.cpf ?? null,
        cnpj: dto.cnpj ?? null,
        rg: dto.rg ?? null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        phone: dto.phone,
        phone2: dto.phone2 ?? null,
        whatsapp: dto.whatsapp ?? null,
        email: dto.email ?? null,
        status: ClientStatus.ACTIVE,
        fraudScore,
        // Endereço
        zipCode: dto.address?.zipCode ?? null,
        street: dto.address?.street ?? null,
        number: dto.address?.number ?? null,
        complement: dto.address?.complement ?? null,
        district: dto.address?.district ?? null,
        city: dto.address?.city ?? null,
        state: dto.address?.state ?? null,
        // TIM
        timLine: dto.timLine ?? null,
        iccid: dto.iccid ?? null,
        observations: dto.observations ?? null,
      },
      select: SAFE_CLIENT_SELECT,
    });

    await this.audit.log({
      userId: createdBy,
      companyId,
      action: AuditAction.CREATE,
      entity: 'Client',
      entityId: client.id,
      newValues: {
        name: client.name,
        cpf: client.cpf,
        cnpj: client.cnpj,
        fraudScore,
      },
      description: `Cliente cadastrado: ${client.name}`,
    });

    return client;
  }

  // ─── LISTAR ────────────────────────────────────────────────────────────

  async findAll(companyId: string, query: QueryClientDto) {
    const {
      page = 1,
      limit = 20,
      search,
      personType,
      status,
      state,
      city,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ClientWhereInput = {
      companyId,
      deletedAt: null,
      ...(personType && { personType }),
      ...(status && { status }),
      ...(state && { state }),
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search.replace(/\D/g, '') } },
          { cnpj: { contains: search.replace(/\D/g, '') } },
          { phone: { contains: search.replace(/\D/g, '') } },
          { email: { contains: search, mode: 'insensitive' } },
          { timLine: { contains: search.replace(/\D/g, '') } },
        ],
      }),
    };

    const allowedSortFields = ['name', 'createdAt', 'fraudScore', 'phone', 'status'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    return this.prisma.paginate(this.prisma.client, {
      where,
      orderBy: { [safeSortBy]: sortOrder },
      select: SAFE_CLIENT_SELECT,
      page,
      limit,
    });
  }

  // ─── BUSCAR POR ID ─────────────────────────────────────────────────────

  async findOne(id: string, companyId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId, deletedAt: null },
      select: SAFE_CLIENT_SELECT,
    });

    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  // ─── BUSCAR POR CPF/CNPJ ───────────────────────────────────────────────

  async findByCpfOrCnpj(cpfOrCnpj: string, companyId: string) {
    const cleaned = cpfOrCnpj.replace(/\D/g, '');
    const isCpf = cleaned.length === 11;

    const client = await this.prisma.client.findFirst({
      where: {
        companyId,
        deletedAt: null,
        ...(isCpf ? { cpf: cleaned } : { cnpj: cleaned }),
      },
      select: SAFE_CLIENT_SELECT,
    });

    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  // ─── ATUALIZAR ─────────────────────────────────────────────────────────

  async update(
    id: string,
    companyId: string,
    dto: UpdateClientDto,
    updatedBy: string,
  ) {
    const existing = await this.findOne(id, companyId);

    // Validar mudança de CPF/CNPJ se fornecido
    if (dto.personType || dto.cpf || dto.cnpj) {
      this.validatePersonTypeDocument({
        personType: dto.personType ?? existing.personType,
        cpf: dto.cpf,
        cnpj: dto.cnpj,
      } as any);
    }

    // Verificar duplicidade se mudou CPF/CNPJ
    if ((dto.cpf && dto.cpf !== existing.cpf) || (dto.cnpj && dto.cnpj !== existing.cnpj)) {
      await this.checkDuplicates(dto as CreateClientDto, companyId, id);
    }

    // Recalcular score de fraude se dados relevantes mudaram
    let newFraudScore = existing.fraudScore;
    if (dto.cpf || dto.cnpj || dto.phone || dto.email) {
      newFraudScore = this.calculateFraudScore({
        ...existing,
        ...dto,
      } as any);
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        fraudScore: newFraudScore,
        // Endereço
        ...(dto.address && {
          zipCode: dto.address.zipCode,
          street: dto.address.street,
          number: dto.address.number,
          complement: dto.address.complement,
          district: dto.address.district,
          city: dto.address.city,
          state: dto.address.state,
        }),
      },
      select: SAFE_CLIENT_SELECT,
    });

    const diff = this.audit.createDiff(existing as any, updated as any);
    await this.audit.log({
      userId: updatedBy,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Client',
      entityId: id,
      oldValues: diff.old,
      newValues: diff.new,
      description: `Cliente atualizado: ${updated.name}`,
    });

    return updated;
  }

  // ─── ALTERAR STATUS ────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    companyId: string,
    dto: UpdateClientStatusDto,
    updatedBy: string,
  ) {
    const client = await this.findOne(id, companyId);

    const updated = await this.prisma.client.update({
      where: { id },
      data: { status: dto.status },
      select: SAFE_CLIENT_SELECT,
    });

    await this.audit.log({
      userId: updatedBy,
      companyId,
      action: AuditAction.UPDATE,
      entity: 'Client',
      entityId: id,
      oldValues: { status: client.status },
      newValues: { status: dto.status },
      description: `Status alterado para ${dto.status}${dto.reason ? ': ' + dto.reason : ''}`,
    });

    return updated;
  }

  // ─── SOFT DELETE ───────────────────────────────────────────────────────

  async remove(id: string, companyId: string, deletedBy: string) {
    const client = await this.findOne(id, companyId);

    // Verificar se cliente tem vendas ativas
    const activeSales = await this.prisma.sale.count({
      where: { clientId: id, deletedAt: null },
    });

    if (activeSales > 0) {
      throw new BadRequestException(
        `Cliente possui ${activeSales} venda(s) vinculada(s) e não pode ser removido`,
      );
    }

    await this.prisma.client.delete({ where: { id } });

    await this.audit.log({
      userId: deletedBy,
      companyId,
      action: AuditAction.DELETE,
      entity: 'Client',
      entityId: id,
      oldValues: { name: client.name, cpf: client.cpf, cnpj: client.cnpj },
      description: `Cliente removido: ${client.name}`,
    });

    return { message: 'Cliente removido com sucesso' };
  }

  // ─── HISTÓRICO DE VENDAS ───────────────────────────────────────────────

  async getSalesHistory(clientId: string, companyId: string) {
    await this.findOne(clientId, companyId); // Verificar existência

    return this.prisma.sale.findMany({
      where: { clientId, companyId, deletedAt: null },
      include: {
        seller: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─── EXPORTAR CSV ──────────────────────────────────────────────────────

  async exportCsv(companyId: string, query: QueryClientDto): Promise<string> {
    const { data } = await this.findAll(companyId, { ...query, limit: 10000, page: 1 });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'name', title: 'Nome' },
        { id: 'type', title: 'Tipo' },
        { id: 'cpf', title: 'CPF' },
        { id: 'cnpj', title: 'CNPJ' },
        { id: 'phone', title: 'Telefone' },
        { id: 'email', title: 'E-mail' },
        { id: 'city', title: 'Cidade' },
        { id: 'state', title: 'Estado' },
        { id: 'status', title: 'Status' },
        { id: 'fraudScore', title: 'Score Fraude' },
        { id: 'timLine', title: 'Linha TIM' },
        { id: 'createdAt', title: 'Cadastrado Em' },
      ],
    });

    const records = data.map((c: any) => ({
      name: c.name,
      type: c.personType === PersonType.PF ? 'Pessoa Física' : 'Pessoa Jurídica',
      cpf: c.cpf ? CpfCnpjUtil.formatCpf(c.cpf) : '',
      cnpj: c.cnpj ? CpfCnpjUtil.formatCnpj(c.cnpj) : '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      status: c.status,
      fraudScore: c.fraudScore,
      timLine: c.timLine ?? '',
      createdAt: new Date(c.createdAt).toLocaleString('pt-BR'),
    }));

    return '\uFEFF' + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  }

  // ─── ESTATÍSTICAS ──────────────────────────────────────────────────────

  async getStats(companyId: string) {
    const [total, byType, byStatus, highRisk, withSales] = await Promise.all([
      this.prisma.client.count({ where: { companyId, deletedAt: null } }),

      this.prisma.client.groupBy({
        by: ['personType'],
        where: { companyId, deletedAt: null },
        _count: { personType: true },
      }),

      this.prisma.client.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: { status: true },
      }),

      this.prisma.client.count({
        where: { companyId, deletedAt: null, fraudScore: { gte: 70 } },
      }),

      this.prisma.sale.groupBy({
        by: ['clientId'],
        where: { companyId, deletedAt: null },
        _count: { clientId: true },
      }),
    ]);

    return {
      total,
      byType: Object.fromEntries(byType.map((t) => [t.personType, t._count.personType])),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.status])),
      highRiskClients: highRisk,
      clientsWithSales: withSales.length,
    };
  }

  // ─── VALIDAÇÕES PRIVADAS ───────────────────────────────────────────────

  private validatePersonTypeDocument(dto: Partial<CreateClientDto>): void {
    if (dto.personType === PersonType.PF && !dto.cpf) {
      throw new BadRequestException('CPF obrigatório para Pessoa Física');
    }
    if (dto.personType === PersonType.PJ && !dto.cnpj) {
      throw new BadRequestException('CNPJ obrigatório para Pessoa Jurídica');
    }
    if (dto.cpf && !CpfCnpjUtil.isValidCpf(dto.cpf)) {
      throw new BadRequestException('CPF inválido');
    }
    if (dto.cnpj && !CpfCnpjUtil.isValidCnpj(dto.cnpj)) {
      throw new BadRequestException('CNPJ inválido');
    }
  }

  private async checkDuplicates(
    dto: CreateClientDto,
    companyId: string,
    excludeId?: string,
  ): Promise<void> {
    const where: any = { companyId, deletedAt: null };
    if (excludeId) where.NOT = { id: excludeId };

    if (dto.cpf) {
      const existing = await this.prisma.client.findFirst({
        where: { ...where, cpf: dto.cpf },
      });
      if (existing) throw new ConflictException('CPF já cadastrado');
    }

    if (dto.cnpj) {
      const existing = await this.prisma.client.findFirst({
        where: { ...where, cnpj: dto.cnpj },
      });
      if (existing) throw new ConflictException('CNPJ já cadastrado');
    }
  }

  // ─── SCORE ANTI-FRAUDE ─────────────────────────────────────────────────

  /**
   * Calcula score de fraude (0-100, quanto maior, mais suspeito).
   * Heurísticas simples baseadas em padrões comuns de fraude.
   */
  private calculateFraudScore(data: Partial<CreateClientDto>): number {
    let score = 0;

    // Nome muito curto (possível dado falso)
    if (data.name && data.name.length < 5) score += 15;

    // Nome sem sobrenome
    if (data.name && !data.name.includes(' ')) score += 10;

    // Telefone e WhatsApp iguais (normal, mas reduz confiabilidade)
    if (data.phone && data.whatsapp && data.phone === data.whatsapp) score += 5;

    // Sem e-mail (menos rastreável)
    if (!data.email) score += 10;

    // CPF com padrão suspeito (sequência ou repetição)
    if (data.cpf) {
      const cleaned = data.cpf.replace(/\D/g, '');
      if (/(\d)\1{5}/.test(cleaned)) score += 20; // Muitos dígitos repetidos
      if (/012345|123456|234567/.test(cleaned)) score += 15; // Sequência
    }

    // Sem endereço completo
    if (!data.address || !data.address.zipCode) score += 10;

    // Observações com palavras-chave suspeitas
    if (data.observations) {
      const suspicious = ['urgente', 'rápido', 'hoje', 'agora', 'pressa'];
      if (suspicious.some((word) => data.observations!.toLowerCase().includes(word))) {
        score += 15;
      }
    }

    return Math.min(score, 100); // Cap em 100
  }
}
