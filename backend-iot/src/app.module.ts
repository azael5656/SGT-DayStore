import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';
import { CacheModule } from './cache/cache.module';
import { MqttModule } from './mqtt/mqtt.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AlertsModule } from './alerts/alerts.module';
import { SensorsModule } from './sensors/sensors.module';
import { StoreConfigModule } from './store-config/store-config.module';
import { NotificationsModule } from './notifications/notifications.module';

/**
 * Modulo raiz del microservicio IoT.
 * Configura la conexion a MongoDB via Mongoose e importa todos los modulos.
 * Los modulos CacheModule y MqttModule son globales (@Global).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const user = config.get<string>('MONGO_USER', 'sgt_iot_user');
        const password = config.get<string>('MONGO_PASSWORD', 'sgt_iot_password_dev');
        const host = config.get<string>('MONGO_HOST', 'localhost');
        const port = config.get<number>('MONGO_PORT', 27017);
        const db = config.get<string>('MONGO_DB', 'sgt_iot');

        return {
          uri: `mongodb://${user}:${password}@${host}:${port}/${db}?authSource=admin`,
        };
      },
    }),
    CacheModule,
    MqttModule,
    TelemetryModule,
    AlertsModule,
    SensorsModule,
    StoreConfigModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
