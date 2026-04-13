import { Injectable } from '@nestjs/common';

/**
 * Servicio de alertas.
 * Gestiona las alertas generadas automaticamente por los sensores:
 * vibracion, puerta abierta, movimiento, temperatura, humedad, corte de luz.
 *
 * TODO: Implementar logica de alertas y almacenamiento en MongoDB
 */
@Injectable()
export class AlertsService {}
