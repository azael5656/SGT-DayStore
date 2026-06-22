import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

/** Un registro crudo tal como lo envía WatermelonDB (columnas + id). */
export type SyncRecord = Record<string, unknown>;

/** Cambios de una tabla en el protocolo de WatermelonDB. */
export interface SyncTableChange {
  created?: SyncRecord[];
  updated?: SyncRecord[];
  deleted?: string[];
}

/** Mapa de tabla → cambios. Solo procesamos sales/sale_items/sale_payments. */
export type SyncChanges = Record<string, SyncTableChange>;

/**
 * Body de `POST /sync/push` (protocolo de WatermelonDB).
 * `changes` llega como objeto arbitrario (no se valida campo por campo: el
 * SyncService extrae lo mínimo confiable y el servidor recalcula los montos).
 */
export class SyncPushDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  lastPulledAt?: number | null;

  @IsObject()
  changes!: SyncChanges;
}
