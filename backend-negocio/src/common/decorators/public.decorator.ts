import { SetMetadata } from '@nestjs/common';

/**
 * Decorador para marcar rutas como publicas (sin autenticacion).
 * Se usa en conjunto con AuthGuard para saltarse la verificacion JWT.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
