// =============================================================================
// TELECEL SYSTEM — notifications/notifications.module.ts
// Módulo global — disponível para Auth, Vendas e demais módulos
// =============================================================================

import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailService } from './mail.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, MailService],
  exports: [NotificationsService, MailService],
})
export class NotificationsModule {}
