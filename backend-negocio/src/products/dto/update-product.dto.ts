import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Datos de entrada para actualizar un producto existente.
 * Todos los campos son opcionales. El `codigo` es editable, pero debe seguir
 * siendo único (el servidor rechaza duplicados).
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999.99, { message: 'El precio no puede exceder 999999.99' })
  precio?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000, { message: 'El stock no puede exceder 1000000' })
  stock?: number;

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
