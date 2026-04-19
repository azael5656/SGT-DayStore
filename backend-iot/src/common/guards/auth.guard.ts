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
 * Estructura esperada del payload JWT que emite backend-negocio.
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Guard de autenticacion del microservicio IoT.
 *
 * Importante: este servicio SOLO verifica tokens, nunca los emite. Por eso
 * solo carga la llave publica, no la privada. Los tokens vienen firmados
 * por backend-negocio con su llave privada RSA.
 *
 * Si alguien comprometiera este contenedor, no podria firmar tokens falsos
 * porque fisicamente no tiene acceso a la llave privada.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly publicKey: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    const keyPath = this.config.get<string>('JWT_PUBLIC_KEY_PATH');
    if (!keyPath) {
      throw new Error(
        'Falta la variable JWT_PUBLIC_KEY_PATH. Revisa tu archivo .env',
      );
    }
    this.publicKey = fs.readFileSync(keyPath, 'utf8');
  }

  canActivate(ctx: ExecutionContext): boolean {
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
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
      }) as JwtPayload;

      (request as Request & { user?: JwtPayload }).user = payload;
      return true;
    } catch (error) {
      this.logger.warn(`Token invalido: ${(error as Error).message}`);
      throw new UnauthorizedException('Token invalido o expirado');
    }
  }

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
