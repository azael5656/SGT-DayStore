import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Servicio de cache con Redis.
 * Provee operaciones basicas de cache: get, set, del.
 * Se registra como modulo global para que todos los modulos puedan usarlo.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly config: ConfigService) {}

  /** Conecta a Redis al iniciar el modulo */
  onModuleInit(): void {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
    });

    this.client.on('connect', () => {
      this.logger.log('Conectado a Redis');
    });

    this.client.on('error', (err) => {
      this.logger.error('Error de conexion a Redis', err);
    });
  }

  /** Desconecta de Redis al destruir el modulo */
  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Obtiene un valor del cache.
   * @param key - Clave del cache
   * @returns Valor almacenado o null si no existe
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Almacena un valor en el cache.
   * @param key - Clave del cache
   * @param value - Valor a almacenar
   * @param ttlSeconds - Tiempo de vida en segundos (opcional)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Elimina una clave del cache.
   * @param key - Clave a eliminar
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
