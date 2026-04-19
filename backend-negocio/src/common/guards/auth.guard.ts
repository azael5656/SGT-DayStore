import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Payload que esperamos encontrar dentro del token JWT.
 * Es lo que firmamos al hacer login en auth.service.ts.
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Guard de autenticacion. Revisa en cada request que venga un token JWT
 * valido en el header Authorization. Si la ruta esta marcada con @Public()
 * se salta la verificacion.
 *
 * Usamos algoritmo RS256 (asimetrico). La llave publica se lee una sola vez
 * al arrancar el servicio desde la ruta indicada en JWT_PUBLIC_KEY_PATH.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly publicKey: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    // Cargamos la llave publica una sola vez al inicializar el guard.
    const keyPath = this.config.get<string>('JWT_PUBLIC_KEY_PATH');
    if (!keyPath) {
      throw new Error(
        'Falta la variable JWT_PUBLIC_KEY_PATH. Revisa tu archivo .env',
      );
    }
    this.publicKey = fs.readFileSync(keyPath, 'utf8');
  }

  canActivate(ctx: ExecutionContext): boolean {
    // Si el handler o el controlador tiene @Public(), dejamos pasar.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest<Request>();
    const token = this.extraerToken(request);

    if (!token) {
      throw new UnauthorizedException('Falta el token de autenticacion');
    }

    try {
      // Verificamos firma, expiracion y algoritmo.
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
      }) as JwtPayload;

      // Guardamos el payload en el request para que luego @CurrentUser()
      // pueda leerlo desde el controlador.
      (request as Request & { user?: JwtPayload }).user = payload;
      return true;
    } catch (error) {
      this.logger.warn(`Token invalido: ${(error as Error).message}`);
      throw new UnauthorizedException('Token invalido o expirado');
    }
  }

  /**
   * Saca el token del header Authorization. Espera el formato "Bearer xxx".
   * Devuelve null si no viene el header o no tiene el prefijo correcto.
   */
  private extraerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const partes = header.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return null;
    }
    return partes[1];
  }
}
