import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Datos de entrada para POST /auth/login.
 */
export class LoginDto {
  @IsEmail({}, { message: 'El email no tiene un formato valido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;
}
