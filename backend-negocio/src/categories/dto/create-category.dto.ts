import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Datos de entrada para crear una nueva categoria.
 */
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoria es obligatorio' })
  @MaxLength(50)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;
}
