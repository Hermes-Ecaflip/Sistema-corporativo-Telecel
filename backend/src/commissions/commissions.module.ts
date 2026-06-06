// =============================================================================
// TELECEL SYSTEM — commissions/commissions.module.ts
// =============================================================================

import { Module } from '@nestjs/common';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';

@Module({
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService], // exportado para o módulo Financeiro e Dashboard
})
export class CommissionsModule {}
