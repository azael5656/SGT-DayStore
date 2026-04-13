import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard que verifica que el usuario tenga el rol requerido.
 * Se usa en conjunto con el decorador @Roles().
 *
 * TODO: Implementar verificacion real del rol del usuario
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    // TODO: Obtener usuario del request y verificar que su rol este en requiredRoles
    return true;
  }
}
