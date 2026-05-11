import { Module } from '@nestjs/common';
import { AuditPdfService } from './audit-pdf.service';
import { PdfService } from './pdf.service';
import { SalesPdfService } from './sales-pdf.service';

/**
 * Modulo de generacion de PDFs.
 *
 * Centraliza tanto el motor (pdfmake con fuentes Base-14) como las
 * definiciones de documento para los 3 reportes oficiales del sistema:
 *
 *  - Historial de ventas (rango de fechas + filtros).
 *  - Comprobante individual de una venta (recibo NO fiscal).
 *  - Bitacora de auditoria.
 *
 * Los modulos `SalesModule` y `AuditModule` importan este modulo y
 * llaman a sus services desde los controllers.
 */
@Module({
  providers: [PdfService, SalesPdfService, AuditPdfService],
  exports: [PdfService, SalesPdfService, AuditPdfService],
})
export class PdfModule {}
