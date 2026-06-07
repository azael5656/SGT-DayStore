import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard que revisa que el usuario tenga uno de los roles requeridos.
 * Debe correr DESPUES del AuthGuard, porque depende de request.user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: { role: string } }>();
    const usuario = request.user;

    if (!usuario || !usuario.role) {
      throw new ForbiddenException('No se pudo determinar el rol del usuario');
    }

    if (!rolesRequeridos.includes(usuario.role)) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta accion',
      );
    }

    return true;
  }
}
