import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Filtros para listar ventas. Todos los campos son opcionales.
 *
 *  - `desde` / `hasta`: rango de `fecha` (ISO 8601, ej. `2026-04-01`).
 *  - `userId`: filtrar por vendedor (los vendedores normales solo ven las
 *    suyas — el service ignora este filtro y lo fuerza a `user.sub`).
 *  - `estado`: completada / anulada.
 *  - `incluirAnuladas`: si es `'true'`, incluye las anuladas en el listado
 *    (default: `false` — solo completadas).
 *  - `incluirInactivas`: si es `'true'`, incluye las soft-deleted (solo
 *    superadmin debería usarlo).
 *  - `page`, `limit`: paginación.
 */
export class QuerySalesDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsOptional()
  @IsIn(['pendiente', 'completada', 'anulada'])
  estado?: 'pendiente' | 'completada' | 'anulada';

  @IsOptional()
  @IsIn(['contado', 'credito'])
  tipoVenta?: 'contado' | 'credito';

  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @IsOptional()
  @IsBooleanString()
  incluirAnuladas?: string;

  @IsOptional()
  @IsBooleanString()
  incluirInactivas?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
