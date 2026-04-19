import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api from '../services/api';
import {
  clearAuth,
  getToken,
  getUser,
  setRefreshToken,
  setToken,
  setUser as guardarUser,
  UsuarioGuardado,
} from '../utils/storage';

/**
 * Context de autenticacion.
 *
 * Este context es el corazon de la sesion del usuario:
 *  - Al arrancar la app revisa si hay un token guardado en AsyncStorage
 *    y, si lo hay, marca al usuario como autenticado para que entre
 *    directo al dashboard sin pasar por el login.
 *  - Expone login() y logout() para que los componentes puedan actuar.
 *  - Expone el usuario actual y un flag isAuthenticated que usa el
 *    AppNavigator para decidir si mostrar AuthNavigator o TabNavigator.
 */

interface AuthContextValue {
  user: UsuarioGuardado | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: ProviderProps) {
  const [user, setUser] = useState<UsuarioGuardado | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar la app, leemos AsyncStorage para ver si hay una sesion
  // previa que podamos restaurar.
  useEffect(() => {
    const restaurarSesion = async () => {
      try {
        const tokenGuardado = await getToken();
        const userGuardado = await getUser();
        if (tokenGuardado && userGuardado) {
          setTokenState(tokenGuardado);
          setUser(userGuardado);
        }
      } finally {
        setIsLoading(false);
      }
    };
    restaurarSesion();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const respuesta = await api.post('/api/negocio/auth/login', {
      email,
      password,
    });
    const { accessToken, refreshToken, user: usuarioResp } = respuesta.data;

    await setToken(accessToken);
    await setRefreshToken(refreshToken);
    await guardarUser(usuarioResp);

    setTokenState(accessToken);
    setUser(usuarioResp);
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [user, token, isLoading, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook para consumir el AuthContext desde cualquier componente.
 * Si alguien lo usa fuera del AuthProvider, lanza un error claro.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
