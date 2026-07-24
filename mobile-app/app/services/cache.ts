import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Caché de SOLO LECTURA para degradar con gracia sin conexión.
 *
 * La app es online-only para ESCRITURAS (crear ventas, editar productos): eso
 * siempre exige backend. Pero para LECTURAS guardamos el último resultado
 * exitoso del servidor en AsyncStorage. Si una carga falla (sin internet o
 * backend caído), la pantalla rehidrata el último snapshot en vez de quedar
 * vacía o romperse.
 *
 * Mismo patrón que `iotSnapshot.ts`, generalizado por clave.
 */
const PREFIX = '@daystore/cache/';

export const CACHE_KEYS = {
  products: 'products',
  categories: 'categories',
  rates: 'rates',
  sales: 'sales',
} as const;

/** Guarda (best-effort) el último snapshot exitoso de una lectura. */
export async function cacheSet<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    /* el caché es best-effort; si falla, no rompemos el flujo online */
  }
}

/** Devuelve el último snapshot cacheado, o null si no hay / falla. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
