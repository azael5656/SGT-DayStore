// Mapas centrales significado -> tono. Un solo lugar para traducir
// severidad / rol / estado al `tone` de Badge y Alert, en vez de repetir
// mini-mapas de color por pagina. Las claves estan normalizadas a minusculas
// (usar `key.toLowerCase()` al consultar para tolerar mayusculas/acentos del back).

// Tono compartido con Badge/Alert. Se duplica aqui para no acoplar este
// archivo al import de un componente; debe coincidir con Badge.Tone.
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

// Entrada con tono y etiqueta opcional para mostrar en el Badge.
export interface VariantInfo {
  tone: Tone;
  label?: string;
}

// Severidades de alertas IoT: critica (rojo) > alta (ambar) > media (info) > baja (neutro).
// Incluye variantes comunes/ingles que pueden llegar del back.
export const SEVERITY_VARIANT: Record<string, Tone> = {
  critica: 'danger',
  critico: 'danger',
  critical: 'danger',
  alta: 'warning',
  alto: 'warning',
  high: 'warning',
  media: 'info',
  medio: 'info',
  medium: 'info',
  baja: 'neutral',
  bajo: 'neutral',
  low: 'neutral',
};

// Roles del sistema: superadmin destaca con el acento de marca,
// admin en info y vendedor en neutro. `label` da el texto legible para el Badge.
export const ROLE_VARIANT: Record<string, VariantInfo> = {
  superadmin: { tone: 'accent', label: 'Superadmin' },
  admin: { tone: 'info', label: 'Admin' },
  vendedor: { tone: 'neutral', label: 'Vendedor' },
};

// Estados de venta/deuda: pagada/contado = saldado (verde); credito/pendiente
// = por cobrar (ambar); vencida/anulada = problema (rojo); borrador = neutro.
export const ESTADO_VARIANT: Record<string, Tone> = {
  pagada: 'success',
  contado: 'success',
  credito: 'warning',
  pendiente: 'warning',
  vencida: 'danger',
  anulada: 'danger',
  borrador: 'neutral',
};
