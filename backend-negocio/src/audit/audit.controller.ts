import { Controller } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Controlador de auditoria.
 * Endpoints: GET /audit/logs, GET /audit/logs/export
 * Solo accesible por el dueño (role: 'owner').
 *
 * TODO: Implementar endpoints de consulta y exportacion
 */
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}
}
