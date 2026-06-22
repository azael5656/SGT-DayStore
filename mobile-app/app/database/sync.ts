import { synchronize } from '@nozbe/watermelondb/sync';
import api from '../services/api';
import { database } from './index';

/**
 * Sincroniza la base local con el backend usando el protocolo nativo de
 * WatermelonDB contra `/api/negocio/sync/{pull,push}`.
 *
 *  - **pull**: baja el catálogo (products, categories, customers, exchange_rates).
 *  - **push**: sube las ventas creadas offline (idempotentes por su UUID; el
 *    backend recalcula los montos y permite oversell).
 *
 * El axios `api` ya adjunta el JWT y refresca en 401, así que la sync hereda
 * la autenticación de la sesión. WatermelonDB gestiona la cola de pendientes,
 * `last_pulled_at`, el merge local y los reintentos.
 */
export async function sync(): Promise<void> {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const { data } = await api.post('/api/negocio/sync/pull', {
        lastPulledAt: lastPulledAt ?? null,
      });
      return { changes: data.changes, timestamp: data.timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      await api.post('/api/negocio/sync/push', { changes, lastPulledAt });
    },
  });
}
