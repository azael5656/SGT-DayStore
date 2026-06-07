import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Permite actualizar cualquier campo de cliente. La cédula es editable
 * (para corregir tipeos) pero sigue validándose unicidad server-side.
 */
export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(30)
  cedula?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nombre?: string;

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

  @IsOptional()
  activo?: boolean;
}
