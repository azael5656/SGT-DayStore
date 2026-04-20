import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AuditEvent {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Publica eventos de auditoria al backend-negocio (single source of truth
 * para audit logs). Si la llamada falla, lo logueamos pero NO bloqueamos
 * la operacion original.
 *
 * URL: http://backend-negocio:3001/api/negocio/audit/internal
 * Auth: header X-Internal-Token compartido via .env
 */
@Injectable()
export class AuditPublisherService {
  private readonly logger = new Logger(AuditPublisherService.name);
  private readonly url: string;
  private readonly token: string;

  constructor(private readonly config: ConfigService) {
    this.url = this.config.get<string>(
      'NEGOCIO_AUDIT_URL',
      'http://backend-negocio:3001/api/negocio/audit/internal',
    );
    this.token = this.config.get<string>('INTERNAL_AUDIT_TOKEN', '');
  }

  async publish(event: AuditEvent): Promise<void> {
    if (!this.token) {
      this.logger.debug('INTERNAL_AUDIT_TOKEN vacio: skip audit publish');
      return;
    }
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': this.token,
        },
        body: JSON.stringify(event),
      });
      if (!res.ok) {
        this.logger.warn(
          `Audit publish falló: ${res.status} ${await res.text().catch(() => '')}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Audit publish error: ${(err as Error).message}`);
    }
  }
}
