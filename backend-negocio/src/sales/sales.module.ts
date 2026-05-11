import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { User } from '../auth/entities/user.entity';
import { CustomersModule } from '../customers/customers.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { PdfModule } from '../pdf/pdf.module';
import { ProductsModule } from '../products/products.module';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { SalesController } from './sales.controller';
import { SalesRepository } from './sales.repository';
import { SalesService } from './sales.service';

/**
 * Módulo de ventas (multi-moneda).
 *
 * Wiring:
 *  - Entidades Sale, SaleItem y SalePayment (TypeORM).
 *  - User registrado aquí porque el service lo usa para enriquecer
 *    snapshots (email/nombre del vendedor) dentro de la transacción.
 *  - ProductsModule provee `ProductsRepository` (transacciones de stock).
 *  - ExchangeRatesModule provee `ExchangeRatesService` para validar y
 *    convertir pagos en VES/COP.
 *  - AuditModule provee `AuditService` para registrar cada operación.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, SalePayment, User]),
    ProductsModule,
    forwardRef(() => CustomersModule),
    ExchangeRatesModule,
    AuditModule,
    PdfModule,
  ],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService, SalesRepository],
})
export class SalesModule {}
