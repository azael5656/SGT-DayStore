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
 * Reglas de gestion de usuarios (alineadas al modelo de 1 superadmin +
 * 1 admin + N vendedores):
 *
 *  - Listar / ver: admin + superadmin.
 *  - Crear vendedor: admin + superadmin.
 *  - Crear admin: SOLO superadmin, y si no existe otro admin activo.
 *  - Crear superadmin: SOLO superadmin, y si no existe otro activo
 *    (rara vez se usa — unico escenario: sustituir al actual).
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
    // Superadmin unico.
    if (dto.role === 'superadmin') {
      const existentes = await this.usersService.contarActivosPorRol('superadmin');
      if (existentes >= 1) {
        throw new BadRequestException(
          'Ya existe un superadmin activo. Desactiva el actual antes de crear otro.',
        );
      }
    }
    // Admin unico.
    if (dto.role === 'admin') {
      const existentes = await this.usersService.contarActivosPorRol('admin');
      if (existentes >= 1) {
        throw new BadRequestException(
          'Ya existe un administrador activo. Desactiva el actual antes de crear otro.',
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
    // Si ascendemos a admin o superadmin, respetamos el limite de uno.
    if (dto.role === 'admin') {
      const existentes = await this.usersService.contarActivosPorRol('admin');
      if (existentes >= 1) {
        throw new BadRequestException(
          'Ya existe un administrador activo. Desactiva el actual antes de asignar este rol.',
        );
      }
    }
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
    // Activar un admin/superadmin inactivo no debe violar el limite de uno.
    if (objetivo.role === 'admin' || objetivo.role === 'superadmin') {
      const existentes = await this.usersService.contarActivosPorRol(objetivo.role);
      if (existentes >= 1) {
        throw new BadRequestException(
          `Ya existe un ${objetivo.role} activo. Desactivalo primero.`,
        );
      }
    }
    const updated = await this.usersService.setActivo(id, true);
    const { passwordHash, ...safe } = updated;
    return safe;
  }
}
