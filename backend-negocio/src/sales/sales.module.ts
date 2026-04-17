import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

/**
 * Modulo de ventas.
 * Gestiona el registro de ventas con transacciones ACID y reportes.
 */
@Module({
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
