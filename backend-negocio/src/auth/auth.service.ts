import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Auth real con persistencia en BD (Postgres) y bcryptjs.
 *
 * - login: busca por email, compara hash, firma JWT RS256 con role real.
 * - register: crea un usuario nuevo (rol vendedor por defecto).
 * - refresh: verifica refresh token y emite par nuevo.
 * - changePassword: valida actual, hashea nueva.
 *
 * Las llaves RSA se cargan al arrancar.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly privateKey: string;
  private readonly accessExpires: string;
  private readonly refreshExpires: string;

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {
    const privatePath = this.config.get<string>('JWT_PRIVATE_KEY_PATH');
    if (!privatePath) {
      throw new Error('Falta la variable JWT_PRIVATE_KEY_PATH. Revisa tu .env');
    }
    this.privateKey = fs.readFileSync(privatePath, 'utf8');
    this.accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES', '1h');
    this.refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES', '15d');
  }

  async register(dto: RegisterDto) {
    this.logger.log(`Registro solicitado para ${dto.email}`);
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      nombre: dto.nombre,
      role: dto.role || 'vendedor',
    });
    const tokens = this.generarTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    this.logger.log(`Login solicitado para ${dto.email}`);
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    const ok = await this.usersService.verifyPassword(
      dto.password,
      user.passwordHash,
    );
    if (!ok) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    const tokens = this.generarTokens(user.id, user.email, user.role);
    await this.auditService.registrar({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'auth.login',
      resource: 'auth',
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = jwt.verify(dto.refreshToken, this.privateKey, {
        algorithms: ['RS256'],
      }) as { sub: string; email: string; role: string; tipo?: string };

      if (payload.tipo !== 'refresh') {
        throw new UnauthorizedException('El token no es de tipo refresh');
      }
      // Verificamos que el usuario siga activo.
      const user = await this.usersService.findById(payload.sub);
      if (!user.activo) {
        throw new UnauthorizedException('Cuenta desactivada');
      }
      return this.generarTokens(user.id, user.email, user.role);
    } catch (error) {
      this.logger.warn(`Refresh fallido: ${(error as Error).message}`);
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }
  }

  async getProfile(userId: string, _email: string, _role: string) {
    const user = await this.usersService.findById(userId);
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      activo: user.activo,
      createdAt: user.createdAt,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    await this.usersService.changePassword(
      userId,
      dto.passwordActual,
      dto.passwordNueva,
    );
    return { mensaje: 'Contrasena actualizada correctamente' };
  }

  private generarTokens(sub: string, email: string, role: string) {
    const accessToken = jwt.sign({ sub, email, role }, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessExpires as jwt.SignOptions['expiresIn'],
    });
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
