import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Datos de entrada para anular una venta.
 *
 * El motivo es OBLIGATORIO — queda en la tabla `sales` y también se
 * registra en `audit_logs`. Ayuda a trazar por qué se revirtió la venta
 * (devolución, error de cobro, error de captura, etc.).
 */
export class CancelSaleDto {
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  @MaxLength(300, { message: 'El motivo no puede pasar de 300 caracteres' })
  motivo!: string;
}
