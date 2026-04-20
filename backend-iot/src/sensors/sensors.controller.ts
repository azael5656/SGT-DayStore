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
import { CreateSensorDto } from './dto/create-sensor.dto';
import { QueryHistoricoDto } from './dto/query-historico.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorsService } from './sensors.service';

@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  async findAll() {
    return this.sensorsService.findAll();
  }

  @Get('readings/historico')
  @Roles('admin', 'superadmin')
  async historico(@Query() query: QueryHistoricoDto) {
    return this.sensorsService.listarHistorico(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sensorsService.findOne(id);
  }

  @Post()
  @Roles('admin', 'superadmin')
  async create(@Body() dto: CreateSensorDto) {
    return this.sensorsService.create(dto);
  }

  @Put(':id')
  @Roles('admin', 'superadmin')
  async update(@Param('id') id: string, @Body() dto: UpdateSensorDto) {
    return this.sensorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'superadmin')
  async remove(@Param('id') id: string) {
    return this.sensorsService.remove(id);
  }
}
