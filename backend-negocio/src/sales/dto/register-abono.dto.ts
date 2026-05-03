import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Datos para registrar un abono adicional sobre una venta a crédito
 * existente. Solo se aceptan ventas en estado `pendiente`.
 *
 * El sistema valida que `amount` (convertido a USD con la tasa vigente)
 * NO supere el saldo restante — sobrar genera 400.
 */
export class RegisterAbonoDto {
  @IsIn(['USD', 'VES', 'COP'])
  currency!: 'USD' | 'VES' | 'COP';

  @IsIn(['efectivo', 'transferencia', 'pago_movil', 'zelle'])
  method!: 'efectivo' | 'transferencia' | 'pago_movil' | 'zelle';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El monto debe ser positivo' })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;
}
