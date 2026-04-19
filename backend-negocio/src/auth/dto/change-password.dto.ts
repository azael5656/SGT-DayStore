import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Datos de entrada para PUT /auth/change-password.
 * El usuario autenticado cambia su propia contraseña.
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  passwordActual!: string;

  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  passwordNueva!: string;
}
