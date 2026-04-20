import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { Role } from '../entities/user.entity';

/**
 * Input para POST /auth/register.
 * Solo admin/superadmin pueden crear usuarios (validado en controller).
 */
export class RegisterDto {
  @IsEmail({}, { message: 'El email no tiene un formato valido' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contrasena debe tener al menos 6 caracteres' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsOptional()
  @IsIn(['superadmin', 'admin', 'vendedor'], {
    message: 'El rol debe ser superadmin, admin o vendedor',
  })
  role?: Role;
}
