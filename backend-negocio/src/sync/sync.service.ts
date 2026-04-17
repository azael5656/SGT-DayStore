import { Injectable } from '@nestjs/common';

/**
 * Servicio de sincronizacion offline-first.
 * Maneja pull (descargar cambios desde timestamp) y push (subir cambios locales).
 * Estrategia: Last Write Wins para resolver conflictos.
 *
 * TODO: Implementar logica de sincronizacion con WatermelonDB
 */
@Injectable()
export class SyncService {}
