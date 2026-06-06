// =============================================================================
// TELECEL SYSTEM — notifications/notifications.controller.ts
// Controller de Notificações in-app: listar, contar, marcar lida, remover
// =============================================================================

import {
  Controller, Get, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import {
  QueryNotificationDto,
  MarkReadDto,
  NotificationResponseDto,
} from './dto/notification.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiPaginatedResponse } from '../common/decorators/index';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── LISTAR ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar minhas notificações' })
  @ApiPaginatedResponse(NotificationResponseDto)
  findAll(
    @Query() query: QueryNotificationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.findAll(userId, query);
  }

  // ─── CONTADOR DE NÃO LIDAS ─────────────────────────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'Contar notificações não lidas (badge)' })
  @ApiResponse({ status: 200, description: '{ unread: number }' })
  countUnread(@CurrentUser('id') userId: string) {
    return this.notificationsService.countUnread(userId);
  }

  // ─── MARCAR COMO LIDA (lote) ───────────────────────────────────────────

  @Patch('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar notificações específicas como lidas' })
  markAsRead(
    @Body() dto: MarkReadDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(dto, userId);
  }

  // ─── MARCAR TODAS COMO LIDAS ───────────────────────────────────────────

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  // ─── REMOVER ───────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover notificação' })
  @ApiParam({ name: 'id', description: 'UUID da notificação' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.remove(id, userId);
  }
}
