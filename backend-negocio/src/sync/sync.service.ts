import { Injectable } from '@nestjs/common';
import { SyncPullDto } from './dto/sync-pull.dto';
import { SyncPushDto } from './dto/sync-push.dto';

/**
 * Servicio de sincronizacion offline-first.
 *
 * Flujo:
 *  - pull: el movil pregunta "dame todo lo que cambio desde X fecha".
 *  - push: el movil manda "hice estas operaciones offline, aplicalas".
 *
 * TODO: conectar con repositorios de products, categories, sales y
 * construir la respuesta agregada. Usar queryBuilder con updatedAt > ultimoSync.
 */
@Injectable()
export class SyncService {
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

  async push(userId: string, dto: SyncPushDto) {
    // TODO: aplicar cada operacion en orden y devolver resultados individuales.
    return {
      aceptadas: dto.operaciones?.length || 0,
      rechazadas: 0,
      timestamp: new Date().toISOString(),
      userId,
    };
  }
}
