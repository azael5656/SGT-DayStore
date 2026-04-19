import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Datos de entrada para POST /auth/register.
 * Solo el dueño puede registrar nuevos usuarios (se valida en el controller
 * con @Roles('owner')).
 */
export class RegisterDto {
  @IsEmail({}, { message: 'El email no tiene un formato valido' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsOptional()
  @IsIn(['owner', 'employee'], {
    message: 'El rol debe ser "owner" o "employee"',
  })
  role?: 'owner' | 'employee';
}
