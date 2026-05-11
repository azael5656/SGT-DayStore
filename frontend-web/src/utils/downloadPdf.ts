import api from '../api/client';

/**
 * Descarga un PDF generado por el backend.
 *
 * Hace un GET autenticado al endpoint (axios ya agrega el JWT por
 * interceptor), recibe el blob, dispara la descarga con un <a download>
 * temporal y lo limpia. Si el backend responde un error, el blob lo
 * convertimos a texto para mostrarlo al usuario en lugar de dejar caer
 * un archivo basura.
 *
 * @param url       Endpoint relativo (ej: `/api/negocio/sales/reports/historial.pdf`).
 * @param params    Query params para el endpoint.
 * @param filename  Nombre con el que se sugiere descargar el archivo
 *                  cuando el backend no manda Content-Disposition.
 */
export async function downloadPdf(
  url: string,
  params: Record<string, string | number | boolean | undefined> = {},
  filename = 'documento.pdf',
): Promise<void> {
  const cleanParams: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') cleanParams[k] = v;
  }

  const response = await api.get(url, {
    params: cleanParams,
    responseType: 'blob',
  });

  // Filename: usa Content-Disposition si vino del server.
  const disp = response.headers['content-disposition'] as string | undefined;
  let sugerido = filename;
  if (disp) {
    const match = /filename="?([^";]+)"?/i.exec(disp);
    if (match) sugerido = match[1];
  }

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = sugerido;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Liberamos memoria — el blob ya esta en el sistema de archivos.
  setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1500);
}
