import { Injectable } from '@nestjs/common';
import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { PdfService } from './pdf.service';

function fmtFecha(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleString('es-VE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function rolLabel(r: string | null | undefined): string {
  switch (r) {
    case 'superadmin':
      return 'Super admin';
    case 'admin':
      return 'Administrador';
    case 'vendedor':
      return 'Vendedor';
    default:
      return '—';
  }
}

function colorAccion(action: string): string {
  if (action.includes('login')) return '#0EA5E9';
  if (action.includes('delete')) return '#B91C1C';
  if (action.includes('create')) return '#15803D';
  if (action.includes('update')) return '#B45309';
  if (action.includes('alert')) return '#F59E0B';
  if (action.includes('scenario')) return '#7C3AED';
  return '#6B7280';
}

export interface AuditFiltros {
  userEmail?: string;
  action?: string;
  resource?: string;
  desde?: Date;
  hasta?: Date;
}

/**
 * Construye el `TDocumentDefinitions` del export de auditoria.
 * Pinta una tabla compacta con fecha / actor / accion / recurso / IP.
 */
@Injectable()
export class AuditPdfService {
  auditDocDef(
    logs: AuditLog[],
    filtros: AuditFiltros,
  ): TDocumentDefinitions {
    const partesFiltro: string[] = [];
    if (filtros.desde && filtros.hasta) {
      partesFiltro.push(
        `Periodo: ${fmtFecha(filtros.desde).split(',')[0]} - ${fmtFecha(filtros.hasta).split(',')[0]}`,
      );
    }
    if (filtros.userEmail) partesFiltro.push(`Usuario: ${filtros.userEmail}`);
    if (filtros.action) partesFiltro.push(`Accion: ${filtros.action}`);
    if (filtros.resource) partesFiltro.push(`Recurso: ${filtros.resource}`);
    if (partesFiltro.length === 0) partesFiltro.push('Todos los eventos');

    const bodyTabla: TableCell[][] = this.buildBody(logs);

    const content: Content[] = [
      { text: 'BITACORA DE AUDITORIA', style: 'h1' },
      { text: partesFiltro.join('   ·   '), style: 'sub' },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Eventos listados', style: 'metaLabel' },
              { text: String(logs.length), style: 'metaValue' },
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: [80, '*', 50, 80, 70, 60],
          body: bodyTabla,
        },
        layout: {
          fillColor: (rowIndex: number) =>
            rowIndex === 0 ? '#F3F4F6' : rowIndex % 2 === 0 ? '#FAFAFA' : null,
          hLineColor: () => '#E5E7EB',
          vLineColor: () => '#E5E7EB',
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
      },
    ];

    return {
      pageSize: 'LETTER',
      pageOrientation: 'landscape',
      pageMargins: [40, 80, 40, 50],
      header: PdfService.defaultHeader(),
      footer: PdfService.defaultFooter(),
      content,
    };
  }

  private buildBody(logs: AuditLog[]): TableCell[][] {
    const header: TableCell[] = [
      { text: 'Fecha', style: 'th' },
      { text: 'Usuario', style: 'th' },
      { text: 'Rol', style: 'th' },
      { text: 'Accion', style: 'th' },
      { text: 'Recurso', style: 'th' },
      { text: 'IP', style: 'th' },
    ];

    if (logs.length === 0) {
      return [
        header,
        [
          {
            text: 'No hay eventos con esos filtros.',
            colSpan: 6,
            alignment: 'center',
            color: '#6B7280',
            italics: true,
            margin: [0, 8, 0, 8],
          },
          {},
          {},
          {},
          {},
          {},
        ],
      ];
    }

    const rows: TableCell[][] = logs.map((l): TableCell[] => [
      { text: fmtFecha(l.createdAt), style: 'tdSmall' },
      {
        stack: [
          { text: l.userEmail ?? 'sistema', style: 'tdSmall', bold: true },
        ],
      },
      { text: rolLabel(l.userRole), style: 'tdSmall' },
      {
        text: l.action,
        style: 'tdSmall',
        color: colorAccion(l.action),
        bold: true,
      },
      {
        text: `${l.resource ?? '—'}${l.resourceId ? `\n${l.resourceId.slice(0, 12)}…` : ''}`,
        style: 'tdSmall',
      },
      { text: l.ip ?? '—', style: 'tdSmall' },
    ]);

    return [header, ...rows];
  }
}
