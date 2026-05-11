import RNBlobUtil from 'react-native-blob-util';
import { API_BASE_URL } from '../utils/constants';
import { getToken } from '../utils/storage';

/**
 * Servicio de PDFs (mobile).
 *
 * El backend expone tres endpoints que responden `application/pdf`:
 *
 *  - `GET /api/negocio/sales/reports/historial.pdf`
 *  - `GET /api/negocio/sales/:id/comprobante.pdf`
 *  - `GET /api/negocio/audit/logs/export.pdf`
 *
 * Esta capa se encarga de:
 *
 *  1. Componer la URL final con query params y el header `Authorization`.
 *  2. Descargar el PDF a un archivo temporal de cache con
 *     `react-native-blob-util` para que `<Pdf>` lo pueda renderizar
 *     desde disco (sin tener que volver a pegar al servidor).
 *  3. Guardarlo en la carpeta Descargas del telefono usando
 *     `DownloadManager` cuando el usuario pulsa "Guardar".
 *  4. Abrir el chooser nativo de Android ("Abrir con…", que tambien sirve
 *     para compartir via WhatsApp, Drive, etc.) cuando el usuario pulsa
 *     "Compartir".
 */
export interface PdfRequest {
  /** URL completa del endpoint que devuelve `application/pdf`. */
  url: string;
  /** Nombre sugerido para el archivo (sin extension, se le agrega `.pdf`). */
  baseFilename: string;
  /** Titulo a mostrar arriba en el visor. */
  title: string;
}

export interface PdfFetchedFile {
  /** Path local del PDF en cache. Lo consume `<Pdf source={{ uri }}>`. */
  localPath: string;
  /** Filename con extension (`historial-ventas-20260510.pdf`). */
  filename: string;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes())
  );
}

export const pdfService = {
  /**
   * Construye la URL completa para uno de los endpoints PDF.
   * Acepta params opcionales que se serializan con `URLSearchParams`.
   */
  buildUrl(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): string {
    const limpio: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        limpio[k] = String(v);
      }
    }
    const qs = new URLSearchParams(limpio).toString();
    return `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`;
  },

  /**
   * Descarga el PDF al cache de la app. El path retornado se le pasa al
   * componente `<Pdf>` como `source={{ uri: 'file://' + localPath }}`.
   *
   * Si la respuesta no es 2xx, lanza un Error con el cuerpo (texto plano)
   * para que la pantalla muestre un mensaje util.
   */
  async fetchToCache(req: PdfRequest): Promise<PdfFetchedFile> {
    const token = await getToken();
    const filename = `${req.baseFilename}-${timestamp()}.pdf`;
    const cachePath = `${RNBlobUtil.fs.dirs.CacheDir}/${filename}`;

    const res = await RNBlobUtil.config({
      path: cachePath,
      timeout: 30000,
    }).fetch('GET', req.url, {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/pdf',
    });

    const status = res.info().status;
    if (status < 200 || status >= 300) {
      // El backend puede mandar texto JSON con el error.
      let detalle = `HTTP ${status}`;
      try {
        const txt = await res.text();
        detalle += `: ${txt.slice(0, 200)}`;
      } catch {
        /* ignore */
      }
      // Limpiamos el archivo basura.
      try {
        await RNBlobUtil.fs.unlink(cachePath);
      } catch {
        /* ignore */
      }
      throw new Error(detalle);
    }

    return { localPath: cachePath, filename };
  },

  /**
   * Copia el PDF desde cache a la carpeta publica de Descargas, dejando
   * notificacion del sistema visible para el usuario (DownloadManager).
   *
   * Devuelve el path final en Descargas.
   */
  async saveToDownloads(file: PdfFetchedFile): Promise<string> {
    const destino = `${RNBlobUtil.fs.dirs.DownloadDir}/${file.filename}`;
    // Si ya existe (por una descarga previa), lo borramos para no
    // duplicar con `(1)`.
    try {
      const existe = await RNBlobUtil.fs.exists(destino);
      if (existe) await RNBlobUtil.fs.unlink(destino);
    } catch {
      /* ignore */
    }
    await RNBlobUtil.fs.cp(file.localPath, destino);
    // Hacemos un ping a MediaScanner para que el archivo aparezca en la
    // app "Descargas" / galeria.
    try {
      await RNBlobUtil.fs.scanFile([
        { path: destino, mime: 'application/pdf' },
      ]);
    } catch {
      /* ignore */
    }
    return destino;
  },

  /**
   * Abre el chooser de Android para visualizar / compartir el PDF.
   * El usuario decide la app destino (Drive, WhatsApp, Gmail, etc.).
   */
  async share(file: PdfFetchedFile): Promise<void> {
    await RNBlobUtil.android.actionViewIntent(
      file.localPath,
      'application/pdf',
    );
  },
};
