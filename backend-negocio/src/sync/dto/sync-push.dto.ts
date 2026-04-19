import { IsArray, IsOptional } from 'class-validator';

/**
 * Datos de entrada para POST /sync/push.
 * El movil envia las operaciones hechas offline para que el servidor las
 * aplique en orden. La estrategia de conflictos es "Last Write Wins".
 *
 * TODO: tipar las operaciones (crear, actualizar, borrar de cada entidad).
 */
export class SyncPushDto {
  @IsOptional()
  @IsArray()
  operaciones?: unknown[];
}
