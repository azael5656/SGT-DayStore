import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import api, { tokenStorage } from '../api/client';
import type { User } from '../types';

interface AuthValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    tokenStorage.getUser<User>(),
  );

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/api/negocio/auth/login', {
      email,
      password,
    });
    tokenStorage.setAccess(data.accessToken);
    tokenStorage.setRefresh(data.refreshToken);
    tokenStorage.setUser<User>(data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && tokenStorage.getAccess()),
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requiere AuthProvider');
  return ctx;
}
