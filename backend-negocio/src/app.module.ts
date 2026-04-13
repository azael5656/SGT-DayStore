import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { AuditModule } from './audit/audit.module';
import { SyncModule } from './sync/sync.module';

/**
 * Modulo raiz del microservicio de negocio.
 * Configura la conexion a PostgreSQL via TypeORM e importa todos los modulos.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'sgt_user'),
        password: config.get<string>('POSTGRES_PASSWORD', 'sgt_password_dev'),
        database: config.get<string>('POSTGRES_DB', 'sgt_daystore'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuthModule,
    CategoriesModule,
    ProductsModule,
    SalesModule,
    AuditModule,
    SyncModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
