/**
 * Extrae un mensaje legible desde un error de axios.
 *
 * NestJS con class-validator devuelve `message` como **array de strings**
 * cuando hay multiples errores de validacion (ej: 400 con 3 campos
 * invalidos). Tipar el campo como string y pasarlo directo a
 * `Alert.alert()` revienta la app con
 * "Value for message cannot be cast from ReadableNativeArray to String".
 *
 * Este helper soporta los 3 casos:
 *  - response.data.message es string  -> lo retorna tal cual
 *  - response.data.message es array   -> los une con ", "
 *  - error nativo de JS (Error)       -> retorna error.message
 *  - cualquier otra cosa              -> mensaje fallback
 */
export function parseApiError(err: unknown, fallback = 'Algo salio mal'): string {
  const r = err as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const apiMsg = r.response?.data?.message;
  if (Array.isArray(apiMsg)) {
    return apiMsg.length > 0 ? apiMsg.join(', ') : fallback;
  }
  if (typeof apiMsg === 'string' && apiMsg.length > 0) {
    return apiMsg;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
