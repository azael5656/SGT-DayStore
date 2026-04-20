import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';

const METODOS_AUDITADOS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** Substrings de ruta que NO se auditan via interceptor. */
const RUTAS_EXCLUIDAS = [
  '/audit/internal',  // service-to-service, registra por su cuenta
  '/auth/login',      // AuthService registra su propio evento
  '/auth/refresh',
];

interface UsuarioJwt {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Auditoria');

  constructor(private readonly auditService: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioJwt }>();

    const metodo = request.method;
    const ruta = request.url || request.originalUrl || '';
    const usuario = request.user ?? null;
    const ip =
      (request.ip as string) ||
      ((request.headers['x-forwarded-for'] as string) ?? null);
    const userAgent = (request.headers['user-agent'] as string) ?? null;

    return next.handle().pipe(
      tap((respuesta) => {
        if (!METODOS_AUDITADOS.includes(metodo)) return;
        if (RUTAS_EXCLUIDAS.some((r) => ruta.includes(r))) return;

        const action = inferirAction(metodo, ruta);
        const recursoInfo = inferirRecurso(ruta, respuesta);

        this.auditService.registrar({
          userId: usuario?.sub ?? null,
          userEmail: usuario?.email ?? null,
          userRole: usuario?.role ?? null,
          action,
          resource: recursoInfo.resource,
          resourceId: recursoInfo.resourceId,
          metadata: { metodo, ruta },
          ip,
          userAgent,
        });
        this.logger.log(
          `${metodo} ${ruta} | ${usuario?.email ?? 'anonimo'} (${usuario?.role ?? '-'})`,
        );
      }),
    );
  }
}

/** Quita prefijo "api/<servicio>" de la ruta para que el recurso quede limpio. */
function partesRecurso(ruta: string): string[] {
  const partes = ruta.split('?')[0].split('/').filter(Boolean);
  if (partes[0] === 'api') return partes.slice(2); // /api/negocio/products/:id → ['products', ':id']
  return partes;
}

function inferirAction(metodo: string, ruta: string): string {
  const partes = partesRecurso(ruta);
  const recurso = partes[0] ?? 'unknown';
  if (metodo === 'POST') return `${recurso}.create`;
  if (metodo === 'PUT' || metodo === 'PATCH') return `${recurso}.update`;
  if (metodo === 'DELETE') return `${recurso}.delete`;
  return `${recurso}.${metodo.toLowerCase()}`;
}

function inferirRecurso(ruta: string, respuesta: unknown) {
  const partes = partesRecurso(ruta);
  const resource = partes[0] ?? null;
  // Si la respuesta incluye un id, usarlo. Si no, intentar tomar el segmento.
  let resourceId: string | null = null;
  if (
    respuesta &&
    typeof respuesta === 'object' &&
    'id' in (respuesta as Record<string, unknown>)
  ) {
    resourceId = String((respuesta as { id: unknown }).id);
  } else if (partes.length > 1) {
    resourceId = partes[1];
  }
  return { resource, resourceId };
}
