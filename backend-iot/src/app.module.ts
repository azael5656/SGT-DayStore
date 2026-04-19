import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AlertsModule } from './alerts/alerts.module';
import { CacheModule } from './cache/cache.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HealthController } from './health.controller';
import { MqttModule } from './mqtt/mqtt.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SensorsModule } from './sensors/sensors.module';
import { SharedModule } from './shared/shared.module';
import { SimulatorModule } from './simulator/simulator.module';
import { StoreConfigModule } from './store-config/store-config.module';
import { TelemetryModule } from './telemetry/telemetry.module';

/**
 * Modulo raiz del microservicio IoT.
 *
 * Conecta MongoDB, registra los modulos del dominio y activa los
 * componentes globales: AuthGuard + RolesGuard, filtro de excepciones
 * y el interceptor de logging.
 *
 * CacheModule y MqttModule estan marcados como @Global en sus propios
 * archivos, asi que cualquier modulo puede inyectar sus servicios sin
 * importarlos explicitamente.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const user = config.get<string>('MONGO_USER', 'sgt_iot_user');
        const password = config.get<string>(
          'MONGO_PASSWORD',
          'sgt_iot_password_dev',
        );
        const host = config.get<string>('MONGO_HOST', 'localhost');
        const port = config.get<number>('MONGO_PORT', 27017);
        const db = config.get<string>('MONGO_DB', 'sgt_iot');

        return {
          uri: `mongodb://${user}:${password}@${host}:${port}/${db}?authSource=admin`,
        };
      },
    }),
    SharedModule,
    CacheModule,
    MqttModule,
    TelemetryModule,
    AlertsModule,
    SensorsModule,
    StoreConfigModule,
    NotificationsModule,
    SimulatorModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
