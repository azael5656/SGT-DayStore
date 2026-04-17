import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador de parametro para obtener el usuario actual del request.
 * Uso: @CurrentUser() user en el parametro del controlador.
 * Requiere que AuthGuard haya adjuntado el usuario al request.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
