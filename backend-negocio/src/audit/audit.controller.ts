import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditPdfService } from '../pdf/audit-pdf.service';
import { PdfService } from '../pdf/pdf.service';
import { AuditService, RegistrarInput } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
    private readonly pdf: PdfService,
    private readonly auditPdf: AuditPdfService,
  ) {}

  @Get('logs')
  @Roles('admin', 'superadmin')
  async findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }

  @Get('logs/export')
  @Roles('admin', 'superadmin')
  async export(@Query() query: QueryAuditDto) {
    return this.auditService.exportLogs(query);
  }

  /**
   * Bitacora de auditoria como PDF (max 200 eventos por export).
   * Mismos filtros que `/logs` y `/logs/export`.
   */
  @Get('logs/export.pdf')
  @Roles('admin', 'superadmin')
  async exportPdf(
    @Query() query: QueryAuditDto,
    @Res() res: Response,
  ): Promise<void> {
    const { items } = await this.auditService.findAll({
      ...query,
      page: 1,
      limit: 200,
    });
    const docDef = this.auditPdf.auditDocDef(items, {
      userEmail: query.userEmail,
      action: query.action,
      resource: query.resource,
      desde: query.desde ? new Date(query.desde) : undefined,
      hasta: query.hasta ? new Date(query.hasta) : undefined,
    });
    const buffer = await this.pdf.generate(docDef);
    const filename = PdfService.makeFilename('bitacora-auditoria');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  }

  /**
   * Endpoint interno para que backend-iot publique eventos de auditoria
   * (alert.ack, scenario.run, etc.). Protegido por header compartido,
   * NO por JWT, porque es comunicacion service-to-service.
   */
  @Public()
  @Post('internal')
  async internalRegister(
    @Headers('x-internal-token') token: string | undefined,
    @Body() body: RegistrarInput,
  ) {
    const expected = this.config.get<string>('INTERNAL_AUDIT_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Token interno invalido');
    }
    await this.auditService.registrar(body);
    return { ok: true };
  }
}
