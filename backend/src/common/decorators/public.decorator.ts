// =============================================================================
// TELECEL SYSTEM — common/decorators/public.decorator.ts
// Marca uma rota como pública (sem autenticação JWT)
// =============================================================================

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
