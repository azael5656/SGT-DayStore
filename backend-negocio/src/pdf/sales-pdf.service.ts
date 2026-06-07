import { Injectable } from '@nestjs/common';
import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { Sale } from '../sales/entities/sale.entity';
import { PdfService } from './pdf.service';

const MONEDA_USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function fmtUsd(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '-';
  const n = typeof valor === 'string' ? Number(valor) : valor;
  if (!Number.isFinite(n)) return '-';
  return MONEDA_USD.format(n);
}

function fmtFecha(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleString('es-VE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function estadoBadge(estado: Sale['estado']): {
  text: string;
  style: 'badgeGreen' | 'badgeAmber' | 'badgeRed' | 'badgeGray';
} {
  switch (estado) {
    case 'completada':
      return { text: 'Completada', style: 'badgeGreen' };
    case 'pendiente':
      return { text: 'Pendiente', style: 'badgeAmber' };
    case 'anulada':
      return { text: 'Anulada', style: 'badgeRed' };
    default:
      return { text: estado, style: 'badgeGray' };
  }
}

export interface HistorialFiltros {
  desde?: Date;
  hasta?: Date;
  estado?: string;
  tipoVenta?: string;
  vendedor?: string;
  incluirAnuladas?: boolean;
}

export interface HistorialUsuario {
  email?: string | null;
  role?: string | null;
}

/**
 * Construye los `TDocumentDefinitions` de pdfmake para los dos PDFs
 * del modulo de ventas:
 *
 *  - `historialDocDef`: listado de ventas en un rango de fechas, con
 *    totales agregados (cantidad, monto, deuda).
 *  - `comprobanteDocDef`: comprobante individual de una venta (recibo
 *    no fiscal con items, pagos y saldo).
 *
 * No persiste nada; solo arma estructuras JSON-like. La conversion a
 * Buffer la hace `PdfService.generate()`.
 */
@Injectable()
export class SalesPdfService {
  historialDocDef(
    ventas: Sale[],
    filtros: HistorialFiltros,
    usuario: HistorialUsuario,
  ): TDocumentDefinitions {
    const totalUsd = ventas.reduce(
      (acc, v) => acc + (v.estado === 'anulada' ? 0 : Number(v.total)),
      0,
    );
    const saldoTotal = ventas.reduce(
      (acc, v) => acc + Number(v.saldoUsd),
      0,
    );
    const anuladas = ventas.filter((v) => v.estado === 'anulada');
    const pendientes = ventas.filter((v) => v.estado === 'pendiente');
    const completadas = ventas.filter((v) => v.estado === 'completada');

    const filtrosResumen = this.resumenFiltros(filtros);

    const content: Content[] = [
      { text: 'HISTORIAL DE VENTAS', style: 'h1' },
      {
        text: filtrosResumen,
        style: 'sub',
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Solicitado por', style: 'metaLabel' },
              {
                text: usuario.email ?? '—',
                style: 'metaValue',
              },
              {
                text: (usuario.role ?? '').toUpperCase(),
                style: 'metaLabel',
              },
            ],
          },
          {
            width: '*',
            alignment: 'right',
            stack: [
              { text: 'Ventas listadas', style: 'metaLabel' },
              { text: String(ventas.length), style: 'metaValue' },
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },

      // Tabla principal
      {
        table: {
          headerRows: 1,
          widths: [60, '*', 50, 55, 55, 50],
          body: this.historialTableBody(ventas),
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

      // Totales
      { text: 'Resumen', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'Ventas completadas', style: 'totalsLabel' },
              {
                text: `${completadas.length}`,
                style: 'totalsValue',
                alignment: 'right',
              },
            ],
            [
              { text: 'Ventas a credito pendientes', style: 'totalsLabel' },
              {
                text: `${pendientes.length}`,
                style: 'totalsValue',
                alignment: 'right',
              },
            ],
            [
              { text: 'Ventas anuladas', style: 'totalsLabel' },
              {
                text: `${anuladas.length}`,
                style: 'totalsValue',
                alignment: 'right',
              },
            ],
            [
              {
                text: 'Monto total facturado (sin anuladas)',
                style: 'totalsLabel',
                bold: true,
              },
              {
                text: fmtUsd(totalUsd),
                style: 'totalsValue',
                alignment: 'right',
                color: '#15803D',
              },
            ],
            [
              { text: 'Saldo pendiente por cobrar', style: 'totalsLabel' },
              {
                text: fmtUsd(saldoTotal),
                style: 'totalsValue',
                alignment: 'right',
                color: saldoTotal > 0 ? '#B45309' : '#6B7280',
              },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
      },
    ];

    return {
      pageSize: 'LETTER',
      pageMargins: [40, 80, 40, 50],
      header: PdfService.defaultHeader(),
      footer: PdfService.defaultFooter(),
      content,
    };
  }

  comprobanteDocDef(venta: Sale): TDocumentDefinitions {
    const itemsBody = this.comprobanteItemsBody(venta);
    const pagosBody = this.comprobantePagosBody(venta);

    const pagado = venta.payments.reduce(
      (acc, p) => acc + Number(p.amountUsd),
      0,
    );

    const badge = estadoBadge(venta.estado);

    const content: Content[] = [
      { text: 'COMPROBANTE DE VENTA', style: 'h1' },
      {
        text: `N° ${venta.id.slice(0, 8).toUpperCase()}  ·  ${fmtFecha(venta.fecha)}`,
        style: 'sub',
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Cliente', style: 'metaLabel' },
              {
                text: venta.customer
                  ? venta.customer.nombre
                  : 'Cliente anonimo',
                style: 'metaValue',
              },
              {
                text: venta.customer?.cedula
                  ? `C.I. ${venta.customer.cedula}`
                  : '',
                style: 'metaLabel',
              },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Vendedor', style: 'metaLabel' },
              {
                text: venta.userNombre ?? venta.userEmail ?? '—',
                style: 'metaValue',
              },
              { text: venta.userEmail ?? '', style: 'metaLabel' },
            ],
          },
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              { text: 'Estado', style: 'metaLabel' },
              { text: badge.text, style: badge.style },
              {
                text: venta.tipoVenta === 'credito' ? 'CREDITO' : 'CONTADO',
                style: 'metaLabel',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },

      { text: 'Productos', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: [60, '*', 35, 60, 70],
          body: itemsBody,
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

      { text: 'Pagos / abonos', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: [70, 45, 60, '*', 50, 60],
          body: pagosBody,
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

      {
        columns: [
          { width: '*', text: '' },
          {
            width: 220,
            margin: [0, 14, 0, 0],
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  { text: 'Total', style: 'totalsLabel' },
                  {
                    text: fmtUsd(venta.total),
                    style: 'totalsValue',
                    alignment: 'right',
                  },
                ],
                [
                  { text: 'Pagado', style: 'totalsLabel' },
                  {
                    text: fmtUsd(pagado),
                    style: 'totalsValue',
                    alignment: 'right',
                    color: '#15803D',
                  },
                ],
                [
                  { text: 'Saldo pendiente', style: 'totalsLabel', bold: true },
                  {
                    text: fmtUsd(venta.saldoUsd),
                    style: 'totalsValue',
                    alignment: 'right',
                    color:
                      Number(venta.saldoUsd) > 0.01 ? '#B45309' : '#6B7280',
                  },
                ],
              ],
            },
            layout: 'lightHorizontalLines',
          },
        ],
      },

      ...(venta.estado === 'anulada' && venta.motivoAnulacion
        ? [
            {
              text: `Motivo de anulacion: ${venta.motivoAnulacion}`,
              margin: [0, 20, 0, 0],
              color: '#B91C1C',
              italics: true,
              fontSize: 9,
            } as Content,
          ]
        : []),

      ...(venta.notas
        ? [
            {
              text: `Notas: ${venta.notas}`,
              margin: [0, 14, 0, 0],
              color: '#374151',
              italics: true,
              fontSize: 9,
            } as Content,
          ]
        : []),
    ];

    return {
      pageSize: 'LETTER',
      pageMargins: [40, 80, 40, 50],
      header: PdfService.defaultHeader(),
      footer: PdfService.defaultFooter(),
      content,
    };
  }

  private historialTableBody(ventas: Sale[]): TableCell[][] {
    const header: TableCell[] = [
      { text: 'Fecha', style: 'th' },
      { text: 'Cliente / Notas', style: 'th' },
      { text: 'Tipo', style: 'th', alignment: 'center' },
      { text: 'Total', style: 'th', alignment: 'right' },
      { text: 'Saldo', style: 'th', alignment: 'right' },
      { text: 'Estado', style: 'th', alignment: 'center' },
    ];

    if (ventas.length === 0) {
      return [
        header,
        [
          {
            text: 'No hay ventas en el rango seleccionado.',
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

    const rows: TableCell[][] = ventas.map((v): TableCell[] => {
      const badge = estadoBadge(v.estado);
      const clienteText = v.customer
        ? `${v.customer.nombre}\n${v.customer.cedula ?? ''}`
        : v.notas
          ? v.notas
          : 'Cliente anonimo';
      return [
        { text: fmtFecha(v.fecha), style: 'tdSmall' },
        { text: clienteText, style: 'tdSmall' },
        {
          text: v.tipoVenta === 'credito' ? 'Credito' : 'Contado',
          style: 'tdSmall',
          alignment: 'center',
        },
        { text: fmtUsd(v.total), style: 'tdRight' },
        {
          text: Number(v.saldoUsd) > 0.01 ? fmtUsd(v.saldoUsd) : '—',
          style: 'tdRight',
          color: Number(v.saldoUsd) > 0.01 ? '#B45309' : '#9CA3AF',
        },
        { text: badge.text, style: badge.style, alignment: 'center' },
      ];
    });

    return [header, ...rows];
  }

  private comprobanteItemsBody(venta: Sale): TableCell[][] {
    const header: TableCell[] = [
      { text: 'Codigo', style: 'th' },
      { text: 'Producto', style: 'th' },
      { text: 'Cant.', style: 'th', alignment: 'center' },
      { text: 'Precio', style: 'th', alignment: 'right' },
      { text: 'Subtotal', style: 'th', alignment: 'right' },
    ];
    const rows: TableCell[][] = venta.items.map((it): TableCell[] => [
      { text: it.productCodigo ?? '—', style: 'tdSmall' },
      { text: it.productNombre, style: 'td' },
      { text: String(it.cantidad), style: 'td', alignment: 'center' },
      { text: fmtUsd(it.precioUnitario), style: 'tdRight' },
      { text: fmtUsd(it.subtotal), style: 'tdRight', bold: true },
    ]);
    return [header, ...rows];
  }

  private comprobantePagosBody(venta: Sale): TableCell[][] {
    const header: TableCell[] = [
      { text: 'Fecha', style: 'th' },
      { text: 'Moneda', style: 'th' },
      { text: 'Metodo', style: 'th' },
      { text: 'Monto', style: 'th', alignment: 'right' },
      { text: 'Tasa', style: 'th', alignment: 'right' },
      { text: 'USD', style: 'th', alignment: 'right' },
    ];

    if (venta.payments.length === 0) {
      return [
        header,
        [
          {
            text: 'Sin abonos registrados',
            colSpan: 6,
            alignment: 'center',
            italics: true,
            color: '#6B7280',
            margin: [0, 6, 0, 6],
          },
          {},
          {},
          {},
          {},
          {},
        ],
      ];
    }

    const rows: TableCell[][] = venta.payments.map((p): TableCell[] => [
      { text: fmtFecha(p.createdAt), style: 'tdSmall' },
      { text: p.currency, style: 'td', alignment: 'center' },
      { text: p.method, style: 'tdSmall' },
      {
        text: `${Number(p.amountOriginal).toLocaleString()} ${p.currency}`,
        style: 'tdRight',
      },
      { text: Number(p.exchangeRate).toFixed(4), style: 'tdRight' },
      { text: fmtUsd(p.amountUsd), style: 'tdRight', bold: true },
    ]);

    return [header, ...rows];
  }

  private resumenFiltros(f: HistorialFiltros): string {
    const partes: string[] = [];
    if (f.desde && f.hasta) {
      partes.push(
        `Periodo: ${fmtFecha(f.desde).split(',')[0]} - ${fmtFecha(f.hasta).split(',')[0]}`,
      );
    } else if (f.desde) {
      partes.push(`Desde: ${fmtFecha(f.desde).split(',')[0]}`);
    } else if (f.hasta) {
      partes.push(`Hasta: ${fmtFecha(f.hasta).split(',')[0]}`);
    } else {
      partes.push('Todas las ventas');
    }
    if (f.estado) partes.push(`Estado: ${f.estado}`);
    if (f.tipoVenta) partes.push(`Tipo: ${f.tipoVenta}`);
    if (f.vendedor) partes.push(`Vendedor: ${f.vendedor}`);
    if (f.incluirAnuladas) partes.push('Incluyendo anuladas');
    return partes.join('   ·   ');
  }
}
