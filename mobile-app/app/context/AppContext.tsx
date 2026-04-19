import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * Context general de la app. Aqui ponemos estado compartido que no es de
 * auth, por ejemplo si estamos sin internet.
 *
 * Por ahora isOffline es un placeholder. Cuando conectemos con
 * NetInfo (@react-native-community/netinfo) lo actualizaremos de verdad.
 */

interface AppContextValue {
  isOffline: boolean;
  setIsOffline: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: ProviderProps) {
  const [isOffline, setIsOffline] = useState(false);

  // TODO: suscribirse a NetInfo.addEventListener para actualizar isOffline
  // automaticamente cuando cambie la conexion.

  const value = useMemo<AppContextValue>(
    () => ({ isOffline, setIsOffline }),
    [isOffline],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return ctx;
}
