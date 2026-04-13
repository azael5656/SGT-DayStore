import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Controlador de autenticacion.
 * Endpoints: POST /auth/login, POST /auth/register, POST /auth/refresh,
 * GET /auth/me, PUT /auth/change-password
 *
 * TODO: Implementar endpoints de autenticacion
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
