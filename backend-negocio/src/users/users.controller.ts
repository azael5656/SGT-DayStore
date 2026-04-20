import {
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
    if (dto.role === 'superadmin' && actor.role !== 'superadmin') {
      throw new ForbiddenException('Solo un superadmin puede crear superadmin');
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
    const updated = await this.usersService.updateRole(id, dto.role);
    const { passwordHash, ...safe } = updated;
    return safe;
  }

  @Patch(':id/desactivar')
  async desactivar(
    @CurrentUser() actor: UsuarioJwt,
    @Param('id') id: string,
  ) {
    if (id === actor.sub) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }
    const updated = await this.usersService.setActivo(id, false);
    const { passwordHash, ...safe } = updated;
    return safe;
  }

  @Patch(':id/activar')
  async activar(@Param('id') id: string) {
    const updated = await this.usersService.setActivo(id, true);
    const { passwordHash, ...safe } = updated;
    return safe;
  }
}
