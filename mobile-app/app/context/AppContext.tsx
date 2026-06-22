import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Context general de la app. Estado compartido que no es de auth, p.ej. si
 * estamos sin internet (offline-first).
 *
 * `isOffline` se alimenta de NetInfo: el SyncProvider lo observa para
 * disparar la sincronización cuando vuelve la conexión, y la UI lo usa para
 * el indicador de modo offline.
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

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      // isInternetReachable puede ser null al arrancar; lo tratamos como online
      // para no mostrar un falso "offline" antes de la primera medición.
      const offline = !(
        state.isConnected && state.isInternetReachable !== false
      );
      setIsOffline(offline);
    });
    return () => unsub();
  }, []);

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
