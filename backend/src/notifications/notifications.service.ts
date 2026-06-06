// =============================================================================
// TELECEL SYSTEM — notifications/notifications.service.ts
// Notificações in-app + orquestração de e-mails (chamado por Auth e Vendas)
// =============================================================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import {
  QueryNotificationDto,
  MarkReadDto,
} from './dto/notification.dto';
import {
  Prisma,
  NotificationType,
  UserRole,
  UserStatus,
} from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ─── CRIAR NOTIFICAÇÃO IN-APP ──────────────────────────────────────────

  async create(params: {
    userId: string;
    companyId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: params.userId,
          companyId: params.companyId,
          type: params.type,
          title: params.title,
          message: params.message,
          link: params.link ?? null,
          metadata: params.metadata ?? undefined,
          read: false,
        },
      });
    } catch (err) {
      this.logger.error(`Falha ao criar notificação: ${err.message}`);
    }
  }

  // ─── LISTAR ────────────────────────────────────────────────────────────

  async findAll(userId: string, query: QueryNotificationDto) {
    const { page = 1, limit = 20, unreadOnly, type } = query;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly && { read: false }),
      ...(type && { type }),
    };

    return this.prisma.paginate(this.prisma.notification, {
      where,
      orderBy: { createdAt: 'desc' },
      page,
      limit,
    });
  }

  // ─── CONTAR NÃO LIDAS ──────────────────────────────────────────────────

  async countUnread(userId: string): Promise<{ unread: number }> {
    const unread = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { unread };
  }

  // ─── MARCAR COMO LIDA ──────────────────────────────────────────────────

  async markAsRead(dto: MarkReadDto, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: { in: dto.notificationIds }, userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { message: `${result.count} notificação(ões) marcada(s) como lida(s)` };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { message: `${result.count} notificação(ões) marcada(s) como lida(s)` };
  }

  // ─── REMOVER ───────────────────────────────────────────────────────────

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notificação não encontrada');

    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notificação removida' };
  }

  // =========================================================================
  // MÉTODOS DE INTEGRAÇÃO (chamados por outros módulos)
  // =========================================================================

  // ─── AUTH: verificação de e-mail ───────────────────────────────────────

  async sendEmailVerification(email: string, name: string, token: string): Promise<void> {
    await this.mail.sendEmailVerification(email, name, token);
  }

  // ─── AUTH: recuperação de senha ────────────────────────────────────────

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    await this.mail.sendPasswordResetEmail(email, name, token);
  }

  // ─── VENDAS: notificar supervisores de nova venda ──────────────────────

  async notifySupervisorsNewSale(
    companyId: string,
    saleId: string,
    saleNumber: string,
  ): Promise<void> {
    // Buscar supervisores e admins ativos da empresa
    const supervisors = await this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: { in: [UserRole.ADMIN, UserRole.SUPERVISOR] },
      },
      select: { id: true, email: true, name: true },
    });

    // Criar notificação in-app + e-mail para cada um
    await Promise.all(
      supervisors.flatMap((sup) => [
        this.create({
          userId: sup.id,
          companyId,
          type: NotificationType.SALE_PENDING,
          title: 'Nova venda pendente',
          message: `A venda ${saleNumber} aguarda sua aprovação.`,
          link: `/sales/${saleId}`,
          metadata: { saleId, saleNumber },
        }),
        this.mail.sendNewSaleAlert(sup.email, saleNumber),
      ]),
    );
  }

  // ─── VENDAS: notificar vendedor sobre revisão ──────────────────────────

  async notifySellerSaleReviewed(
    sellerId: string,
    saleNumber: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true, email: true, companyId: true },
    });
    if (!seller) return;

    await Promise.all([
      this.create({
        userId: seller.id,
        companyId: seller.companyId,
        type: approved
          ? NotificationType.SALE_APPROVED
          : NotificationType.SALE_REJECTED,
        title: approved ? 'Venda aprovada' : 'Venda rejeitada',
        message: approved
          ? `Sua venda ${saleNumber} foi aprovada!`
          : `Sua venda ${saleNumber} foi rejeitada.${reason ? ' Motivo: ' + reason : ''}`,
        link: '/sales',
        metadata: { saleNumber, approved },
      }),
      this.mail.sendSaleReviewedAlert(seller.email, saleNumber, approved, reason),
    ]);
  }
}
