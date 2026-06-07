import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Un item dentro de una venta. El precio se toma del producto en el
 * server (no del cliente), congelado en USD al momento de la venta.
 */
export class CreateSaleItemDto {
  @IsUUID('4')
  productId!: string;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  cantidad!: number;
}

/**
 * Un pago (de contado, total) o un abono inicial (de crédito, parcial).
 *
 * Reglas (validadas server-side):
 *  - VES → `pago_movil` o `transferencia`
 *  - COP → `efectivo` o `transferencia` (Bancolombia)
 *  - USD → `zelle` o `efectivo`
 */
export class CreateSalePaymentDto {
  @IsIn(['USD', 'VES', 'COP'])
  currency!: 'USD' | 'VES' | 'COP';

  @IsIn(['efectivo', 'transferencia', 'pago_movil', 'zelle'])
  method!: 'efectivo' | 'transferencia' | 'pago_movil' | 'zelle';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El monto debe ser positivo' })
  amount!: number;
}

/**
 * Datos de entrada para registrar una venta.
 *
 * Tipo `contado`:
 *  - `customerId` opcional (anónima permitida).
 *  - `payments` debe sumar igual al total (±0.01 USD).
 *  - Estado resultante: `completada`. Saldo: 0.
 *
 * Tipo `credito`:
 *  - `customerId` OBLIGATORIO (cédula registrada).
 *  - `payments` puede sumar menos que el total — el resto queda como
 *    saldo pendiente. Pero NO puede sumar más que el total.
 *  - Si los pagos cubren todo: estado `completada` directo.
 *  - Si cubren parcial: estado `pendiente`, saldo > 0.
 *  - Permitido `payments=[]` para venta a crédito sin abono inicial
 *    (se le fía completo al cliente; saldo = total).
 */
export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'La venta debe tener al menos un item' })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments!: CreateSalePaymentDto[];

  @IsIn(['contado', 'credito'])
  tipoVenta!: 'contado' | 'credito';

  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
