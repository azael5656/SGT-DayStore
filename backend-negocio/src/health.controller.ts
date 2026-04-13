import { Controller, Get } from '@nestjs/common';

/**
 * Controlador de salud del microservicio de negocio.
 * Permite verificar que el servicio esta activo y funcionando.
 */
@Controller('health')
export class HealthController {
  /**
   * Verifica el estado del servicio.
   * @returns Objeto con el estado, nombre del servicio y timestamp
   */
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'backend-negocio',
      timestamp: new Date().toISOString(),
    };
  }
}
