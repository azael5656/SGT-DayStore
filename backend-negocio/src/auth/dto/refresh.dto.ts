import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Datos de entrada para POST /auth/refresh.
 * Recibe el refresh token para generar un nuevo access token.
 */
export class RefreshDto {
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es obligatorio' })
  refreshToken!: string;
}
