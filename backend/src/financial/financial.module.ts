// =============================================================================
// TELECEL SYSTEM — financial/financial.module.ts
// =============================================================================

import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';

@Module({
  controllers: [FinancialController],
  providers: [FinancialService],
  exports: [FinancialService], // exportado para o Dashboard e Relatórios
})
export class FinancialModule {}
