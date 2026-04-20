import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';
import {
  StoreConfig,
  StoreConfigDocument,
} from './schemas/store-config.schema';

/**
 * Configuracion unica de la tienda (un documento, upsert singleton).
 * Al arrancar crea el documento con defaults si no existe.
 *
 * Expone isOpenNow() para que MockPublisher / handlers MQTT decidan si
 * una lectura de movimiento o puerta cae "fuera de horario".
 */
@Injectable()
export class StoreConfigService implements OnModuleInit {
  private readonly logger = new Logger(StoreConfigService.name);
  private cacheDoc: StoreConfigDocument | null = null;
  private cacheExpires = 0;
  private readonly CACHE_TTL_MS = 60_000;

  constructor(
    @InjectModel(StoreConfig.name)
    private readonly model: Model<StoreConfigDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureExists();
  }

  private async ensureExists(): Promise<StoreConfigDocument> {
    const existente = await this.model.findOne().exec();
    if (existente) return existente;
    this.logger.log('Creando StoreConfig por defecto');
    return this.model.create({});
  }

  private async getFresh(): Promise<StoreConfigDocument> {
    if (this.cacheDoc && Date.now() < this.cacheExpires) return this.cacheDoc;
    const doc = await this.ensureExists();
    this.cacheDoc = doc;
    this.cacheExpires = Date.now() + this.CACHE_TTL_MS;
    return doc;
  }

  async get() {
    const doc = await this.getFresh();
    return this.serialize(doc);
  }

  async update(dto: UpdateStoreConfigDto) {
    const doc = await this.ensureExists();
    if (dto.horarioApertura !== undefined) doc.horarioApertura = dto.horarioApertura;
    if (dto.horarioCierre !== undefined) doc.horarioCierre = dto.horarioCierre;
    if (dto.zonaHoraria !== undefined) doc.zonaHoraria = dto.zonaHoraria;
    if (dto.modoNocturno !== undefined) doc.modoNocturno = dto.modoNocturno;
    if (dto.vacacionesHasta !== undefined) {
      doc.vacacionesHasta = dto.vacacionesHasta || null;
    }
    if (dto.cerrarHoyA !== undefined) {
      doc.cerrarHoyA = dto.cerrarHoyA || null;
      doc.cerrarHoyFecha = dto.cerrarHoyA ? this.hoyISO(doc.zonaHoraria) : null;
    }
    if (dto.diasCerrados !== undefined) doc.diasCerrados = dto.diasCerrados;
    if (dto.umbralesAlerta !== undefined) {
      doc.umbralesAlerta = {
        temperaturaMax:
          dto.umbralesAlerta.temperaturaMax ?? doc.umbralesAlerta.temperaturaMax,
        humedadMax:
          dto.umbralesAlerta.humedadMax ?? doc.umbralesAlerta.humedadMax,
      };
    }
    const saved = await doc.save();
    this.cacheDoc = saved;
    this.cacheExpires = Date.now() + this.CACHE_TTL_MS;
    return this.serialize(saved);
  }

  async isOpenNow(now: Date = new Date()): Promise<boolean> {
    return (await this.getEstado(now)).abierta;
  }

  /**
   * Decide si la tienda esta abierta "ahora" Y devuelve el motivo.
   * El motivo se muestra al usuario para que entienda por que el estado.
   */
  async getEstado(now: Date = new Date()): Promise<{
    abierta: boolean;
    motivo: string;
    horaActual: string;
    hoy: string;
    diaSemana: number;
  }> {
    const doc = await this.getFresh();
    const hoy = this.hoyISO(doc.zonaHoraria, now);
    const horaActual = this.horaEnTZ(doc.zonaHoraria, now);
    const dia = this.diaSemana(doc.zonaHoraria, now);
    const base = { horaActual, hoy, diaSemana: dia };

    if (doc.modoNocturno) {
      return { abierta: false, motivo: 'Modo nocturno activo (forzado manualmente)', ...base };
    }
    if (doc.vacacionesHasta && doc.vacacionesHasta >= hoy) {
      return {
        abierta: false,
        motivo: `De vacaciones hasta el ${doc.vacacionesHasta}`,
        ...base,
      };
    }
    if (doc.diasCerrados?.includes(dia)) {
      const nombres = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      return {
        abierta: false,
        motivo: `Hoy es ${nombres[dia]}, la tienda no abre ese dia`,
        ...base,
      };
    }
    if (doc.cerrarHoyA && doc.cerrarHoyFecha === hoy && horaActual >= doc.cerrarHoyA) {
      return {
        abierta: false,
        motivo: `Cerraste temprano hoy a las ${doc.cerrarHoyA}`,
        ...base,
      };
    }
    if (horaActual < doc.horarioApertura) {
      return {
        abierta: false,
        motivo: `Son las ${horaActual}. Abres a las ${doc.horarioApertura}`,
        ...base,
      };
    }
    if (horaActual >= doc.horarioCierre) {
      return {
        abierta: false,
        motivo: `Son las ${horaActual}. Cerraste a las ${doc.horarioCierre}`,
        ...base,
      };
    }
    return {
      abierta: true,
      motivo: `En horario (${doc.horarioApertura}-${doc.horarioCierre})`,
      ...base,
    };
  }

  /** Activa modoNocturno para que todo movimiento genere alerta. */
  async cerrarAhora() {
    const doc = await this.ensureExists();
    doc.modoNocturno = true;
    const saved = await doc.save();
    this.cacheDoc = saved;
    this.cacheExpires = Date.now() + this.CACHE_TTL_MS;
    return this.serialize(saved);
  }

  /** Quita los overrides que fuerzan cerrado: modo nocturno, vacaciones, cierre temprano. */
  async abrirAhora() {
    const doc = await this.ensureExists();
    doc.modoNocturno = false;
    doc.vacacionesHasta = null;
    doc.cerrarHoyA = null;
    doc.cerrarHoyFecha = null;
    const saved = await doc.save();
    this.cacheDoc = saved;
    this.cacheExpires = Date.now() + this.CACHE_TTL_MS;
    return this.serialize(saved);
  }

  // ---- helpers timezone ----

  private horaEnTZ(tz: string, fecha: Date): string {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(fecha);
    } catch {
      return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
    }
  }

  private diaSemana(tz: string, fecha: Date): number {
    try {
      const nombre = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
      }).format(fecha);
      const orden: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      return orden[nombre] ?? fecha.getDay();
    } catch {
      return fecha.getDay();
    }
  }

  private hoyISO(tz: string, fecha: Date = new Date()): string {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(fecha);
    } catch {
      return fecha.toISOString().slice(0, 10);
    }
  }

  private serialize(doc: StoreConfigDocument) {
    return {
      horarioApertura: doc.horarioApertura,
      horarioCierre: doc.horarioCierre,
      zonaHoraria: doc.zonaHoraria,
      modoNocturno: doc.modoNocturno,
      vacacionesHasta: doc.vacacionesHasta,
      cerrarHoyA: doc.cerrarHoyA,
      cerrarHoyFecha: doc.cerrarHoyFecha,
      diasCerrados: doc.diasCerrados,
      umbralesAlerta: doc.umbralesAlerta,
    };
  }
}
