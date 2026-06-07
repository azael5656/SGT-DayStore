import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

/**
 * Helpers para leer y escribir datos de sesion en AsyncStorage.
 *
 * AsyncStorage es el almacenamiento local que persiste entre sesiones.
 * Lo usamos para guardar los tokens y el usuario, asi cuando el usuario
 * abre la app al dia siguiente no tiene que volver a loguearse.
 */

export type Role = 'superadmin' | 'admin' | 'vendedor';

export interface UsuarioGuardado {
  id: string;
  email: string;
  nombre: string;
  role: Role;
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.accessToken);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.accessToken, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.refreshToken);
}

export async function setRefreshToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.refreshToken, token);
}

export async function getUser(): Promise<UsuarioGuardado | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UsuarioGuardado;
  } catch {
    // Si por alguna razon el JSON esta corrupto, lo tratamos como si no
    // hubiera usuario y forzamos un login nuevo.
    return null;
  }
}

export async function setUser(user: UsuarioGuardado): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

/**
 * Limpia toda la informacion de sesion. Se llama al hacer logout o cuando
 * el refresh token expira y no podemos renovar.
 */
export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.user,
  ]);
}
