import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

/**
 * Endpoints CRUD de productos mas consultas especiales.
 *
 * Los empleados pueden consultar (GET). Solo el dueño puede crear, editar
 * o borrar productos.
 */
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get('low-stock')
  async lowStock() {
    return this.productsService.findLowStock();
  }

  @Get('stats')
  @Roles('owner')
  async stats() {
    return this.productsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles('owner')
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @Roles('owner')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
