import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService, RegistrarInput } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
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
