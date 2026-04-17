import { Controller } from '@nestjs/common';
import { SensorsService } from './sensors.service';

/**
 * Controlador de sensores.
 * Endpoints: GET /sensors, GET /sensors/:id, POST /sensors,
 * PUT /sensors/:id, DELETE /sensors/:id
 *
 * TODO: Implementar endpoints CRUD de configuracion de sensores
 */
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}
}
