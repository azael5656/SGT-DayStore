import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfModule } from '../pdf/pdf.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

/**
 * Modulo de auditoria.
 * Expone AuditService para que el AuditInterceptor pueda registrar
 * las operaciones de escritura cuando se implemente la persistencia.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), PdfModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
