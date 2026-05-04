import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import {
  clearAuth,
  getRefreshToken,
  getToken,
  setRefreshToken,
  setToken,
} from '../utils/storage';
import { notifySessionExpired } from './authBus';

/**
 * Cliente HTTP compartido por toda la app.
 *
 * Dos cosas importantes pasan aqui:
 *
 *  1) En CADA request agregamos automaticamente el header
 *     Authorization: Bearer <token>. Asi los componentes no tienen que
 *     preocuparse por el token.
 *
 *  2) Si una request devuelve 401 (token expirado), tratamos de
 *     refrescarlo llamando a /auth/refresh. Si lo logramos, reintentamos
 *     la request original automaticamente. Si falla, limpiamos la sesion
 *     para que el usuario vuelva al login.
 *
 * Todo esto pasa en silencio para el usuario.
 */

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// -----------------------------------------------------------------------------
// Interceptor de request: agrega el token a cada peticion saliente.
// -----------------------------------------------------------------------------
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// -----------------------------------------------------------------------------
// Interceptor de response: si viene un 401, intenta refrescar y reintentar.
// -----------------------------------------------------------------------------

// Usamos esta bandera para no intentar refrescar dos veces al tiempo si
// varias requests expiran a la vez.
let refrescando: Promise<string | null> | null = null;

/**
 * Intenta obtener un nuevo accessToken usando el refreshToken guardado.
 *
 * - Si ya hay un refresh en curso (varias requests fallaron a la vez),
 *   reusa la misma promesa para no spammear `/auth/refresh`.
 * - Si el refreshToken también expiró o no existe, limpia la sesión
 *   completa con `clearAuth()` para forzar al usuario a volver al login.
 *
 * @returns El nuevo accessToken si el refresh fue exitoso, o `null` si
 *          hubo que cerrar la sesión.
 */
async function refrescarToken(): Promise<string | null> {
  if (refrescando) {
    return refrescando;
  }

  refrescando = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }
    try {
      // Hacemos la peticion con axios directamente (no con la instancia
      // "api") para evitar que el interceptor se meta en bucle.
      const respuesta = await axios.post(
        `${API_BASE_URL}/api/negocio/auth/refresh`,
        { refreshToken },
      );
      const { accessToken: nuevoAccess, refreshToken: nuevoRefresh } =
        respuesta.data;
      await setToken(nuevoAccess);
      await setRefreshToken(nuevoRefresh);
      return nuevoAccess;
    } catch {
      // Si el refresh token tambien expiro, borramos la sesion y avisamos
      // al AuthContext para que limpie su estado React y el AppNavigator
      // saque al usuario al login. Sin notifySessionExpired() el storage
      // queda vacio pero la UI sigue creyendo que hay sesion activa.
      await clearAuth();
      notifySessionExpired();
      return null;
    } finally {
      refrescando = null;
    }
  })();

  return refrescando;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Solo reintentamos en 401 y si no habiamos reintentado ya.
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      const nuevoToken = await refrescarToken();
      if (nuevoToken) {
        original.headers.set('Authorization', `Bearer ${nuevoToken}`);
        return api.request(original);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
