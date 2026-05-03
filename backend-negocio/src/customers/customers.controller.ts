import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

interface JwtUser {
  sub: string;
  email: string;
  role: 'superadmin' | 'admin' | 'vendedor';
}

/**
 * Endpoints de clientes/deudores.
 *
 * - Vendedores pueden buscar y consultar (para asociar ventas a crédito).
 * - Crear/editar/desactivar: solo admin/superadmin.
 */
@Controller('customers')
@Roles('superadmin', 'admin', 'vendedor')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @Roles('superadmin', 'admin', 'vendedor')
  async findAll(
    @Query('q') q?: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    const includeInactive = incluirInactivos === 'true';
    if (q) return this.service.search(q, includeInactive);
    return this.service.findAll(includeInactive);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'vendedor')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('superadmin', 'admin')
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateCustomerDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin')
  async desactivar(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.desactivar(user, id);
  }
}
