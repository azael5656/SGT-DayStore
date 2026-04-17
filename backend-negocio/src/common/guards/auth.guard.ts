import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard de autenticacion que verifica el token JWT en cada request.
 * Las rutas marcadas con @Public() se saltan la verificacion.
 *
 * TODO: Implementar verificacion real de JWT con jsonwebtoken
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // TODO: Extraer token del header Authorization, verificar con jsonwebtoken,
    // adjuntar usuario decodificado al request
    return true;
  }
}
