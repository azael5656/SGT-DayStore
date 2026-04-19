import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { HealthController } from './health.controller';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { SyncModule } from './sync/sync.module';

/**
 * Modulo raiz del microservicio de negocio.
 *
 * Aqui conectamos todo: la BD, los modulos de funcionalidad, y los
 * componentes globales (guards, filtros, interceptores).
 *
 * - AuthGuard es global: todas las rutas requieren token JWT excepto las
 *   que esten marcadas con @Public().
 * - RolesGuard tambien es global: valida @Roles() cuando aplique.
 * - HttpExceptionFilter estandariza el formato de error en toda la API.
 * - AuditInterceptor registra las operaciones de escritura.
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
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
