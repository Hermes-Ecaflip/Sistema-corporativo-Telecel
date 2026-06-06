// =============================================================================
// TELECEL SYSTEM — sales/sales.module.ts
// =============================================================================

import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { ProductsModule } from '../products/products.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ProductsModule,        // para calcular comissões dos produtos
    NotificationsModule,   // para notificar supervisores/vendedores
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService], // exportado para o módulo de Comissões e Dashboard
})
export class SalesModule {}
