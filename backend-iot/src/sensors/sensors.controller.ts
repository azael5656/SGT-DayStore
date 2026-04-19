import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorsService } from './sensors.service';

/**
 * Endpoints CRUD para gestionar los sensores IoT registrados.
 * Solo el dueño puede crear, editar o desactivar sensores.
 */
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  async findAll() {
    return this.sensorsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sensorsService.findOne(id);
  }

  @Post()
  @Roles('owner')
  async create(@Body() dto: CreateSensorDto) {
    return this.sensorsService.create(dto);
  }

  @Put(':id')
  @Roles('owner')
  async update(@Param('id') id: string, @Body() dto: UpdateSensorDto) {
    return this.sensorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner')
  async remove(@Param('id') id: string) {
    return this.sensorsService.remove(id);
  }
}
