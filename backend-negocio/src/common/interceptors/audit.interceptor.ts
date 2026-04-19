import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Metodos HTTP que queremos auditar.
 * Los GET no se registran porque son consultas, no modifican datos.
 */
const METODOS_AUDITADOS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Interceptor que registra en los logs del servicio cada operacion de
 * escritura que se ejecuta correctamente. Captura:
 *   - Usuario que hizo la operacion (si esta autenticado).
 *   - Metodo HTTP y ruta.
 *   - IP y user-agent.
 *   - Timestamp.
 *
 * Cuando el modulo de auditoria tenga persistencia en BD, este interceptor
 * debera inyectar AuditService y guardar el registro en la tabla audit_log.
 * Por ahora usamos el Logger de Nest para dejarlo en consola.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Auditoria');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: { sub: string; email: string } }>();

    const metodo = request.method;
    const ruta = request.url;
    const usuario = request.user
      ? `${request.user.email} (${request.user.sub})`
      : 'anonimo';
    const ip = request.ip || request.headers['x-forwarded-for'] || '-';
    const userAgent = request.headers['user-agent'] || '-';

    return next.handle().pipe(
      tap(() => {
        // Solo registramos operaciones de escritura exitosas.
        if (!METODOS_AUDITADOS.includes(metodo)) {
          return;
        }
        this.logger.log(
          `${metodo} ${ruta} | usuario=${usuario} | ip=${ip} | ua="${userAgent}"`,
        );
        // TODO: cuando AuditService este implementado, llamar aqui a
        // auditService.registrar({usuario, metodo, ruta, ip, userAgent, fecha})
      }),
    );
  }
}
