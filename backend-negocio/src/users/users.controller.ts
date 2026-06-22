import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UsersService } from './users.service';

interface UsuarioJwt {
  sub: string;
  email: string;
  role: 'superadmin' | 'admin' | 'vendedor';
}

/**
 * Reglas de gestion de usuarios (modelo de 1 superadmin unico +
 * N admin + N vendedores):
 *
 *  - Listar / ver: admin + superadmin.
 *  - Crear vendedor: admin + superadmin.
 *  - Crear admin: SOLO superadmin (pueden existir varios admin).
 *  - Crear superadmin: SOLO superadmin, y si no existe otro activo
 *    (el superadmin es unico — unico escenario: sustituir al actual).
 *  - Cambiar rol / desactivar / activar: solo superadmin.
 *  - No puedes desactivar tu propia cuenta.
 */
@Controller('users')
@Roles('admin', 'superadmin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listar() {
    const users = await this.usersService.findAll();
    return users.map(({ passwordHash, ...rest }) => rest);
  }

  @Post()
  async crear(@CurrentUser() actor: UsuarioJwt, @Body() dto: CreateUserDto) {
    // Admin solo puede crear vendedores.
    if (actor.role === 'admin' && dto.role !== 'vendedor') {
      throw new ForbiddenException(
        'Solo el super admin puede crear usuarios con rol admin o superadmin',
      );
    }
    // Superadmin unico (los admin pueden ser varios).
    if (dto.role === 'superadmin') {
      const existentes = await this.usersService.contarActivosPorRol('superadmin');
      if (existentes >= 1) {
        throw new BadRequestException(
          'Ya existe un superadmin activo. Desactiva el actual antes de crear otro.',
        );
      }
    }
    const created = await this.usersService.create(dto);
    const { passwordHash, ...safe } = created;
    return safe;
  }

  @Patch(':id/role')
  async cambiarRol(
    @CurrentUser() actor: UsuarioJwt,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    if (actor.role !== 'superadmin') {
      throw new ForbiddenException('Solo un superadmin puede cambiar roles');
    }
    // El superadmin es unico; los admin pueden ser varios.
    if (dto.role === 'superadmin') {
      const existentes = await this.usersService.contarActivosPorRol('superadmin');
      if (existentes >= 1) {
        throw new BadRequestException(
          'Ya existe un superadmin activo. Desactiva el actual antes de asignar este rol.',
        );
      }
    }
    const updated = await this.usersService.updateRole(id, dto.role);
    const { passwordHash, ...safe } = updated;
    return safe;
  }

  @Patch(':id/desactivar')
  async desactivar(
    @CurrentUser() actor: UsuarioJwt,
    @Param('id') id: string,
  ) {
    if (actor.role !== 'superadmin') {
      throw new ForbiddenException('Solo un superadmin puede desactivar usuarios');
    }
    if (id === actor.sub) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }
    const updated = await this.usersService.setActivo(id, false);
    const { passwordHash, ...safe } = updated;
    return safe;
  }

  @Patch(':id/activar')
  async activar(@CurrentUser() actor: UsuarioJwt, @Param('id') id: string) {
    if (actor.role !== 'superadmin') {
      throw new ForbiddenException('Solo un superadmin puede activar usuarios');
    }
    const objetivo = await this.usersService.findById(id);
    // El superadmin es unico: activar uno inactivo no debe crear un segundo.
    // Los admin pueden ser varios, asi que no se limitan.
    if (objetivo.role === 'superadmin') {
      const existentes = await this.usersService.contarActivosPorRol('superadmin');
      if (existentes >= 1) {
        throw new BadRequestException(
          'Ya existe un superadmin activo. Desactivalo primero.',
        );
      }
    }
    const updated = await this.usersService.setActivo(id, true);
    const { passwordHash, ...safe } = updated;
    return safe;
  }
}
