import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Un item dentro de una venta.
 */
export class CreateSaleItemDto {
  @IsUUID('4')
  productId!: string;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  cantidad!: number;

  @IsNumber()
  @Min(0)
  precioUnitario!: number;
}

/**
 * Datos de entrada para registrar una venta.
 * La venta se hace dentro de una transaccion ACID: si no hay stock
 * suficiente de algun producto, se revierte todo.
 */
export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'La venta debe tener al menos un item' })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @IsIn(['efectivo', 'tarjeta', 'transferencia'], {
    message: 'El metodo de pago debe ser efectivo, tarjeta o transferencia',
  })
  metodoPago!: 'efectivo' | 'tarjeta' | 'transferencia';
}
