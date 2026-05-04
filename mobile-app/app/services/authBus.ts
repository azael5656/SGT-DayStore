/**
 * Puente entre el interceptor HTTP y el AuthContext.
 *
 * El interceptor de api.ts vive fuera del arbol de React, asi que no
 * puede llamar directamente a `logout()` del context. Este bus permite
 * que el AuthProvider registre un handler al montarse, y que el
 * interceptor lo dispare cuando detecta sesion expirada (refresh fallido
 * tras un 401).
 *
 * Sin esto, `clearAuth()` borra el storage pero el estado React del
 * AuthContext sigue mostrando al usuario como autenticado, dejando la
 * app atrapada con requests que devuelven 401 en silencio.
 */

type Handler = () => void;

let onSessionExpired: Handler | null = null;

export function setSessionExpiredHandler(handler: Handler | null): void {
  onSessionExpired = handler;
}

export function notifySessionExpired(): void {
  onSessionExpired?.();
}
