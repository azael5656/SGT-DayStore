import { SetMetadata } from '@nestjs/common';

/**
 * Decorador para restringir acceso por rol.
 * Uso: @Roles('owner') o @Roles('owner', 'employee')
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
