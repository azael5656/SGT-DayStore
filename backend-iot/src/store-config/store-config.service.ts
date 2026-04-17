import { Injectable } from '@nestjs/common';

/**
 * Servicio de configuracion de la tienda.
 * Gestiona horarios de apertura/cierre, modo nocturno y umbrales.
 * Estos datos son usados por el sistema de alertas para determinar
 * si una lectura de sensor es normal o sospechosa.
 *
 * TODO: Implementar logica de configuracion de tienda
 */
@Injectable()
export class StoreConfigService {}
