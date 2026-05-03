import { Injectable } from '@nestjs/common';
import { SyncPullDto } from './dto/sync-pull.dto';
import { SyncPushDto } from './dto/sync-push.dto';

/**
 * Servicio de sincronización offline-first para la app móvil.
 *
 * ESTADO ACTUAL: ambos endpoints son MOCK (retornan estructuras vacías).
 * La implementación real va con WatermelonDB en mobile-app, planificada
 * para después del módulo de ventas (Sprint 4 — ver TODO.md raíz).
 *
 * Contrato esperado cuando se implemente:
 *
 *  - **pull(dto)**: el móvil pregunta "dame todo lo que cambió desde
 *    `dto.ultimoSync`". El service consulta los repositorios de products,
 *    categories y sales con `updatedAt > ultimoSync` y devuelve los deltas
 *    para que el cliente actualice su BD local.
 *
 *  - **push(userId, dto)**: el móvil manda un array de operaciones que se
 *    hicieron offline. El service las aplica en orden dentro de una
 *    transacción ACID y devuelve por cada operación si fue aceptada o
 *    rechazada (con motivo).
 *
 * Los timestamps deben ser monotónicos y server-side (no confiar en el
 * reloj del cliente) para evitar conflictos al re-sincronizar.
 */
@Injectable()
export class SyncService {
  /**
   * Devuelve los cambios server-side desde la última sincronización del
   * cliente. Hoy retorna arrays vacíos — placeholder hasta implementar
   * el fetch real con `updatedAt > dto.ultimoSync` en cada repositorio.
   */
  async pull(dto: SyncPullDto) {
    return {
      timestamp: new Date().toISOString(),
      desde: dto.ultimoSync || null,
      cambios: {
        productos: [],
        categorias: [],
        ventas: [],
      },
    };
  }

  /**
   * Aplica un lote de operaciones que el móvil hizo offline. Hoy solo
   * cuenta cuántas operaciones llegaron — placeholder hasta implementar
   * el dispatcher real (cada op va a su repositorio correspondiente
   * dentro de una transacción).
   *
   * @param userId  Quien empuja los cambios (para auditoría).
   * @param dto     Lote de operaciones {tipo, recurso, payload, clientTimestamp}.
   */
  async push(userId: string, dto: SyncPushDto) {
    return {
      aceptadas: dto.operaciones?.length || 0,
      rechazadas: 0,
      timestamp: new Date().toISOString(),
      userId,
    };
  }
}
