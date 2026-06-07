import { IsDateString, IsOptional } from 'class-validator';

/**
 * Datos de entrada para POST /sync/pull.
 * El movil envia el timestamp del ultimo sync y el servidor responde con
 * todos los cambios posteriores.
 */
export class SyncPullDto {
  @IsOptional()
  @IsDateString()
  ultimoSync?: string;
}
