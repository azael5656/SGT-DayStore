import { Injectable } from '@nestjs/common';

/**
 * Servicio de ventas.
 * Registra ventas con transaccion ACID (descuenta stock atomicamente),
 * consulta historial y genera reportes diarios/mensuales.
 *
 * TODO: Implementar registro de ventas con transaccion ACID
 */
@Injectable()
export class SalesService {}
