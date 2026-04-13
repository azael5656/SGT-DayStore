import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Interceptor que registra operaciones en la tabla de auditoria.
 * Captura las acciones de escritura (POST, PUT, DELETE) y las registra
 * con datos del usuario, IP y user-agent.
 *
 * TODO: Inyectar AuditService y registrar las operaciones en la BD
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        // TODO: Registrar operacion de auditoria
      }),
    );
  }
}
