import { Injectable } from '@nestjs/common';
import { QueryAuditDto } from './dto/query-audit.dto';

/**
 * Servicio de auditoria.
 * Consulta los registros de auditoria y los exporta a CSV/PDF.
 *
 * TODO: inyectar @InjectRepository(AuditLog). Implementar tambien el
 * metodo registrar() que sera llamado desde el AuditInterceptor.
 */
@Injectable()
export class AuditService {
  async findAll(query: QueryAuditDto) {
    // TODO: filtrar por rango de fechas y/o userId con queryBuilder.
    return [
      {
        id: 'mock-log-1',
        userEmail: 'owner@daystore.co',
        metodo: 'POST',
        ruta: '/products',
        fecha: new Date().toISOString(),
      },
    ];
  }

  async exportLogs(query: QueryAuditDto) {
    // TODO: generar CSV o PDF con los logs filtrados y devolver stream o URL.
    return {
      mensaje: 'Exportacion generada',
      formato: 'csv',
      filtros: query,
      urlDescarga: 'mock-url-descarga',
    };
  }
}
