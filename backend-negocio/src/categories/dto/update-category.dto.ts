import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Datos de entrada para actualizar una categoria existente.
 * Todos los campos son opcionales: solo se actualizan los que vengan.
 */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;
}
