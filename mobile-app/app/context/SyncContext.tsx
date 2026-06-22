import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { sync as runSync } from '../database/sync';
import { useApp } from './AppContext';
import { useAuth } from './AuthContext';

/**
 * Orquesta la sincronización offline-first con WatermelonDB.
 *
 * Dispara `sync()` (pull catálogo + push ventas pendientes) en:
 *  - el login / al montar autenticado,
 *  - la transición offline → online (NetInfo, vía AppContext.isOffline),
 *  - volver la app a primer plano (AppState 'active'),
 *  - o manualmente con `syncNow` (pull-to-refresh, botón).
 *
 * Una sola sync a la vez (guard `enCurso`). Expone estado para la UI.
 */
interface SyncValue {
  syncing: boolean;
  lastSyncAt: number | null;
  error: string | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { isOffline } = useApp();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);

  const syncNow = useCallback(async () => {
    if (enCurso.current || !isAuthenticated) return;
    enCurso.current = true;
    setSyncing(true);
    setError(null);
    try {
      await runSync();
      setLastSyncAt(Date.now());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de sincronización';
      setError(msg);
      // eslint-disable-next-line no-console
      console.warn('[sync] falló:', msg);
    } finally {
      setSyncing(false);
      enCurso.current = false;
    }
  }, [isAuthenticated]);

  // Sync al autenticarse / montar.
  useEffect(() => {
    if (isAuthenticated) void syncNow();
  }, [isAuthenticated, syncNow]);

  // Sync al recuperar la conexión (offline -> online).
  const prevOffline = useRef(isOffline);
  useEffect(() => {
    if (prevOffline.current && !isOffline && isAuthenticated) void syncNow();
    prevOffline.current = isOffline;
  }, [isOffline, isAuthenticated, syncNow]);

  // Sync al volver a primer plano.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && isAuthenticated) void syncNow();
    });
    return () => sub.remove();
  }, [isAuthenticated, syncNow]);

  return (
    <SyncContext.Provider value={{ syncing, lastSyncAt, error, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync debe usarse dentro de un SyncProvider');
  return ctx;
}
