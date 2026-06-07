import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * Datos de entrada para crear un nuevo producto en el inventario.
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
  precio!: number;

  @IsInt({ message: 'El stock debe ser un entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsString()
  codigo?: string;
}
