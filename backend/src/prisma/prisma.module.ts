// =============================================================================
// TELECEL SYSTEM — prisma.module.ts
// =============================================================================

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Disponível em toda a aplicação sem precisar importar
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
