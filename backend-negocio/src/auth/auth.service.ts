import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Servicio de autenticacion.
 * Se encarga de firmar y validar los tokens JWT con la llave privada RSA,
 * y de verificar las credenciales de los usuarios contra la base de datos.
 *
 * Por ahora devuelve datos mock: la firma del JWT es REAL (se puede verificar
 * desde backend-iot) pero la validacion de email/password todavia no va
 * contra la tabla users. Cuando se implemente la persistencia habra que
 * inyectar el repositorio de User y validar con bcrypt.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly privateKey: string;
  private readonly accessExpires: string;
  private readonly refreshExpires: string;

  constructor(private readonly config: ConfigService) {
    // Cargamos la llave privada una sola vez al arrancar el servicio.
    const privatePath = this.config.get<string>('JWT_PRIVATE_KEY_PATH');
    if (!privatePath) {
      throw new Error(
        'Falta la variable JWT_PRIVATE_KEY_PATH. Revisa tu .env',
      );
    }
    this.privateKey = fs.readFileSync(privatePath, 'utf8');
    this.accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES', '1h');
    this.refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES', '15d');
  }

  /**
   * Registra un nuevo usuario en el sistema. Devuelve el usuario creado
   * (sin el hash de contraseña) junto con los tokens iniciales.
   *
   * TODO: validar que el email no exista en BD, hashear password con
   * bcryptjs, guardar en la tabla users.
   */
  async register(dto: RegisterDto) {
    this.logger.log(`Registro solicitado para ${dto.email}`);

    // Mock: generamos un id falso.
    const usuarioMock = {
      id: 'mock-' + Date.now(),
      email: dto.email,
      nombre: dto.nombre,
      role: dto.role || 'employee',
    };

    const tokens = this.generarTokens(
      usuarioMock.id,
      usuarioMock.email,
      usuarioMock.role,
    );

    return {
      user: usuarioMock,
      ...tokens,
    };
  }

  /**
   * Valida las credenciales y devuelve tokens JWT firmados con RS256.
   *
   * TODO: buscar el usuario por email en la BD, comparar password con
   * bcryptjs.compare, devolver UnauthorizedException si no coincide.
   */
  async login(dto: LoginDto) {
    this.logger.log(`Login solicitado para ${dto.email}`);

    // Mock: por ahora cualquier email con password >=6 caracteres pasa.
    // Determinamos el rol con una regla simple para que se pueda probar
    // el RolesGuard sin BD: si el email contiene "owner" es dueño.
    const role = dto.email.toLowerCase().includes('owner')
      ? 'owner'
      : 'employee';

    const usuarioMock = {
      id: 'mock-' + dto.email,
      email: dto.email,
      nombre: dto.email.split('@')[0],
      role,
    };

    const tokens = this.generarTokens(
      usuarioMock.id,
      usuarioMock.email,
      usuarioMock.role,
    );

    return {
      user: usuarioMock,
      ...tokens,
    };
  }

  /**
   * Recibe un refresh token valido y devuelve un nuevo access token.
   * Si el refresh token es invalido o expirado, lanza 401.
   */
  async refresh(dto: RefreshDto) {
    try {
      // Verificamos el refresh token con la misma llave (firmado por nosotros).
      // Como solo tenemos la privada aqui, usamos la publica derivada para
      // verificar. Para simplificar: jsonwebtoken acepta la privada para
      // verificar porque contiene la parte publica embebida.
      const payload = jwt.verify(dto.refreshToken, this.privateKey, {
        algorithms: ['RS256'],
      }) as { sub: string; email: string; role: string; tipo?: string };

      if (payload.tipo !== 'refresh') {
        throw new UnauthorizedException('El token no es de tipo refresh');
      }

      // Generamos nuevo access (el refresh se puede mantener o renovar;
      // aqui lo renovamos tambien para reiniciar la ventana de 15 dias).
      const tokens = this.generarTokens(
        payload.sub,
        payload.email,
        payload.role,
      );

      return tokens;
    } catch (error) {
      this.logger.warn(`Refresh fallido: ${(error as Error).message}`);
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }
  }

  /**
   * Devuelve el perfil del usuario autenticado.
   * El AuthGuard ya puso el payload en request.user, asi que aqui solo
   * devolvemos una version limpia de esos datos.
   *
   * TODO: consultar en BD los campos completos del usuario (nombre, etc.).
   */
  async getProfile(userId: string, email: string, role: string) {
    return {
      id: userId,
      email,
      role,
      nombre: email.split('@')[0],
    };
  }

  /**
   * Cambia la contraseña del usuario autenticado.
   *
   * TODO: buscar usuario por id, comparar passwordActual con el hash
   * guardado, hashear passwordNueva y actualizar el registro.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    this.logger.log(`Cambio de contraseña solicitado por usuario ${userId}`);
    // Mock: siempre responde OK.
    return {
      mensaje: 'Contraseña actualizada correctamente',
    };
  }

  /**
   * Firma un par de tokens (access y refresh) para el usuario dado.
   * Los tiempos de expiracion vienen de las variables de entorno.
   */
  private generarTokens(sub: string, email: string, role: string) {
    const accessToken = jwt.sign(
      { sub, email, role },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: this.accessExpires as jwt.SignOptions['expiresIn'],
      },
    );

    const refreshToken = jwt.sign(
      { sub, email, role, tipo: 'refresh' },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: this.refreshExpires as jwt.SignOptions['expiresIn'],
      },
    );

    return { accessToken, refreshToken };
  }
}
