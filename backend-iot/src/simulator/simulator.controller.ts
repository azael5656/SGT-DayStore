import { BadRequestException, Controller, Param, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Escenario, SimulatorService } from './simulator.service';

const ESCENARIOS_VALIDOS: Escenario[] = ['incendio', 'forzado', 'normal'];

/**
 * Endpoints HTTP para lanzar escenarios de demo desde curl/Postman durante
 * la presentación. Publican lecturas forzadas + generan alertas según el
 * caso, lo que hace que el móvil reaccione en tiempo real (Dashboard se
 * enciende, AlertBanner vibra).
 *
 * TODO: retirar @Public() o restringir a @Roles('admin') antes de prod.
 * Solo deben estar expuestos en dev/demo.
 */
@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simulator: SimulatorService) {}

  @Public()
  @Post('escenario/:nombre')
  ejecutar(@Param('nombre') nombre: string) {
    if (!ESCENARIOS_VALIDOS.includes(nombre as Escenario)) {
      throw new BadRequestException(
        `Escenario invalido. Validos: ${ESCENARIOS_VALIDOS.join(', ')}`,
      );
    }
    return this.simulator.ejecutar(nombre as Escenario);
  }
}
