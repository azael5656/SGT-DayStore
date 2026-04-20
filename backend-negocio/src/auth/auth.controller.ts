import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Endpoints publicos y privados de autenticacion.
 *
 * Rutas publicas (sin token):
 *   - POST /auth/login
 *   - POST /auth/refresh
 *
 * Rutas privadas (requieren token):
 *   - POST /auth/register (solo owner)
 *   - GET  /auth/me
 *   - PUT  /auth/change-password
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registra un nuevo usuario. Solo el dueño (owner) puede crear usuarios.
   */
  @Post('register')
  @Roles('admin', 'superadmin')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Inicia sesion y devuelve un access token y un refresh token.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Genera un nuevo access token a partir de un refresh token valido.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  /**
   * Devuelve el perfil del usuario autenticado.
   */
  @Get('me')
  async me(
    @CurrentUser() user: { sub: string; email: string; role: string },
  ) {
    return this.authService.getProfile(user.sub, user.email, user.role);
  }

  /**
   * Permite al usuario autenticado cambiar su contraseña.
   */
  @Put('change-password')
  async changePassword(
    @CurrentUser() user: { sub: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }
}
