import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

/**
 * Controlador de salud del microservicio de negocio.
 * Expone GET /health sin requerir autenticacion para que balanceadores
 * y monitoreo puedan chequear el estado del servicio.
 */
@Controller('health')
export class HealthController {
  /**
   * Verifica que el servicio este arriba.
   */
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'backend-negocio',
      timestamp: new Date().toISOString(),
    };
  }
}
