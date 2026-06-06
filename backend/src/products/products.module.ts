// =============================================================================
// TELECEL SYSTEM — products/products.module.ts
// =============================================================================

import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // exportado para o módulo de Vendas calcular comissões
})
export class ProductsModule {}
