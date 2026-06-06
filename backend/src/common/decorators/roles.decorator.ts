// =============================================================================
// TELECEL SYSTEM — common/decorators/roles.decorator.ts
// Define quais papéis (UserRole) podem acessar uma rota
// =============================================================================

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
