import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesRepository } from './exchange-rates.repository';
import { ExchangeRatesService } from './exchange-rates.service';

/**
 * Módulo de tasas de cambio. Lo importa SalesModule para validar pagos
 * en monedas no-USD.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate]), AuditModule],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService, ExchangeRatesRepository],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
