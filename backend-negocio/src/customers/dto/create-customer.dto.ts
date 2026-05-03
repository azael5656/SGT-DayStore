import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Datos para crear un cliente. La cédula es obligatoria y el server
 * valida unicidad.
 */
export class CreateCustomerDto {
  @IsString()
  @MinLength(4, { message: 'La cédula debe tener al menos 4 caracteres' })
  @MaxLength(30)
  cedula!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
