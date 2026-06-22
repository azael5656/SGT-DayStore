import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Datos de entrada para crear un nuevo producto en el inventario.
 *
 * `codigo` es opcional al enviar: si llega vacío, el servidor lo autogenera
 * (PRD-####). Si llega, debe ser único (el servidor rechaza duplicados).
 */
export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsUUID('4', { message: 'El categoryId debe ser un UUID valido' })
  categoryId!: string;

  @IsNumber({}, { message: 'El precio debe ser un numero' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  @Max(999999.99, { message: 'El precio no puede exceder 999999.99' })
  precio!: number;

  @IsInt({ message: 'El stock debe ser un entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  @Max(1000000, { message: 'El stock no puede exceder 1000000' })
  stock!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999, { message: 'El stock minimo no puede exceder 99999' })
  stockMinimo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El codigo no puede exceder 50 caracteres' })
  codigo?: string;
}
