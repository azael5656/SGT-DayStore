import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

/**
 * Endpoints de auditoria.
 * Solo accesibles por el dueño (owner).
 */
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles('owner')
  async findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }

  @Get('logs/export')
  @Roles('owner')
  async export(@Query() query: QueryAuditDto) {
    return this.auditService.exportLogs(query);
  }
}
