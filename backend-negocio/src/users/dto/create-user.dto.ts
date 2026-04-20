import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import type { Role } from '../../auth/entities/user.entity';

export class CreateUserDto {
  @IsEmail({}, { message: 'El email no tiene un formato valido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contrasena debe tener al menos 6 caracteres' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsIn(['superadmin', 'admin', 'vendedor'], {
    message: 'El rol debe ser superadmin, admin o vendedor',
  })
  role!: Role;
}
