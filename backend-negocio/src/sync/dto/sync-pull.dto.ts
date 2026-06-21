import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Body de `POST /sync/pull` (protocolo de WatermelonDB).
 * El móvil manda el timestamp (epoch ms) de su última sincronización; el
 * servidor devuelve todo lo que cambió desde entonces. `null`/ausente en la
 * primera sync (bootstrap: baja todo el catálogo).
 */
export class SyncPullDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  lastPulledAt?: number | null;
}
