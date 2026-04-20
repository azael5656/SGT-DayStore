import { SetMetadata } from '@nestjs/common';

export type Role = 'superadmin' | 'admin' | 'vendedor';

/**
 * Restringe acceso por rol. Funciona junto a RolesGuard (corre despues
 * del AuthGuard para tener request.user.role disponible).
 *
 * Uso: @Roles('admin'), @Roles('admin', 'superadmin')
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
