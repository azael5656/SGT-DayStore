import { Injectable } from '@nestjs/common';
// `pdfmake` se publica como modulo CommonJS sin `default` export, asi que
// no podemos usar `import PdfPrinter from 'pdfmake'` (TS compilaria un
// `.default` que es undefined). Usamos la forma `import = require` que
// preserva el objeto exportado tal cual.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PdfPrinter = require('pdfmake');
import type {
  TDocumentDefinitions,
  StyleDictionary,
} from 'pdfmake/interfaces';

/**
 * Servicio compartido para generar PDFs con `pdfmake` desde Node.
 *
 * Usa las fuentes Base-14 (Helvetica) embebidas en cualquier lector PDF,
 * para no tener que empaquetar archivos `.ttf` con el bundle. Esto deja
 * el binario pequeño y simplifica el deploy en Docker.
 *
 * Las pantallas concretas (historial de ventas, comprobante, auditoría)
 * arman su `TDocumentDefinitions` y llaman a `generate()` aquí.
 */
@Injectable()
export class PdfService {
  private readonly printer: PdfPrinter;

  /** Paleta y estilos compartidos. Se inyectan en cada docDef. */
  static readonly NEGOCIO = {
    nombre: 'DAYSTORE',
    direccion: 'San Cristobal, Tachira - Venezuela',
    rif: 'RIF: J-00000000-0',
  };

  static readonly STYLES: StyleDictionary = {
    brand: { fontSize: 18, bold: true, color: '#2563EB' },
    brandSub: { fontSize: 8, color: '#6B7280' },
    h1: { fontSize: 14, bold: true, margin: [0, 0, 0, 4] },
    sub: { fontSize: 9, color: '#6B7280', margin: [0, 0, 0, 12] },
    th: { bold: true, color: '#374151', fillColor: '#F3F4F6', fontSize: 9 },
    td: { fontSize: 9 },
    tdSmall: { fontSize: 8 },
    tdRight: { alignment: 'right', fontSize: 9 },
    sectionTitle: {
      fontSize: 11,
      bold: true,
      color: '#1F2937',
      margin: [0, 14, 0, 6],
    },
    metaLabel: { fontSize: 8, color: '#6B7280' },
    metaValue: { fontSize: 10, bold: true, color: '#111827' },
    badgeGreen: { color: '#15803D', bold: true, fontSize: 9 },
    badgeAmber: { color: '#B45309', bold: true, fontSize: 9 },
    badgeRed: { color: '#B91C1C', bold: true, fontSize: 9 },
    badgeGray: { color: '#6B7280', fontSize: 9 },
    totalsLabel: { fontSize: 10, color: '#374151' },
    totalsValue: { fontSize: 11, bold: true, color: '#111827' },
    noFiscal: { fontSize: 7, color: '#9CA3AF', italics: true },
  };

  constructor() {
    // PDFKit (motor de pdfmake) trae 4 fuentes Base-14. Las declaramos
    // bajo el nombre 'Helvetica' para usarlas como default. Sin archivos
    // .ttf adicionales y sin riesgo de fuentes faltantes en Linux/Docker.
    this.printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });
  }

  /**
   * Renderiza un docDefinition de pdfmake a un Buffer.
   * Aplica `defaultStyle.font = 'Helvetica'` si el docDef no lo trae.
   */
  async generate(docDef: TDocumentDefinitions): Promise<Buffer> {
    const docConDefaults: TDocumentDefinitions = {
      ...docDef,
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
        color: '#111827',
        ...docDef.defaultStyle,
      },
      styles: { ...PdfService.STYLES, ...docDef.styles },
    };

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const pdfDoc = this.printer.createPdfKitDocument(docConDefaults);
      pdfDoc.on('data', (c: Buffer) => chunks.push(c));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  /**
   * Encabezado estandar (logo textual + datos del negocio + fecha de
   * generacion). Lo invocan los servicios concretos como `header` del
   * docDef.
   */
  static defaultHeader(): TDocumentDefinitions['header'] {
    const generadoEn = new Date().toLocaleString('es-VE');
    return () => ({
      margin: [40, 25, 40, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: PdfService.NEGOCIO.nombre, style: 'brand' },
            {
              text: `${PdfService.NEGOCIO.direccion}  ·  ${PdfService.NEGOCIO.rif}`,
              style: 'brandSub',
            },
          ],
        },
        {
          width: 'auto',
          alignment: 'right',
          stack: [
            { text: 'Generado', style: 'metaLabel' },
            { text: generadoEn, style: 'metaValue' },
          ],
        },
      ],
    });
  }

  /**
   * Pie de pagina estandar: numeracion + advertencia "no fiscal" en
   * letra chica, para dejar claro que estos PDFs no sustituyen una
   * factura SENIAT.
   */
  static defaultFooter(): TDocumentDefinitions['footer'] {
    return (currentPage: number, pageCount: number) => ({
      margin: [40, 10, 40, 0],
      columns: [
        {
          width: '*',
          text: '*** DOCUMENTO NO FISCAL - Uso interno. No sustituye factura SENIAT. ***',
          style: 'noFiscal',
        },
        {
          width: 'auto',
          alignment: 'right',
          text: `Pagina ${currentPage} de ${pageCount}`,
          fontSize: 8,
          color: '#9CA3AF',
        },
      ],
    });
  }

  /**
   * Filename seguro: minusculas, sin espacios, con timestamp YYYYMMDD-HHmm.
   */
  static makeFilename(prefijo: string): string {
    const ahora = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const stamp =
      ahora.getFullYear().toString() +
      pad(ahora.getMonth() + 1) +
      pad(ahora.getDate()) +
      '-' +
      pad(ahora.getHours()) +
      pad(ahora.getMinutes());
    const safe = prefijo
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${safe}-${stamp}.pdf`;
  }
}
