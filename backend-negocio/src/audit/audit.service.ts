import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import { QueryAuditDto } from './dto/query-audit.dto';
import { AuditLog } from './entities/audit-log.entity';

export interface RegistrarInput {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async registrar(input: RegistrarInput): Promise<void> {
    try {
      const entity = this.repo.create({
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        userRole: input.userRole ?? null,
        action: input.action,
        resource: input.resource ?? null,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      });
      await this.repo.save(entity);
    } catch (err) {
      // No queremos que un fallo de auditoria rompa la request original.
      this.logger.warn(`No se pudo registrar audit log: ${(err as Error).message}`);
    }
  }

  async findAll(query: QueryAuditDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Record<string, unknown> = {};
    if (query.userEmail) where.userEmail = ILike(`%${query.userEmail}%`);
    if (query.action) where.action = ILike(`%${query.action}%`);
    if (query.resource) where.resource = query.resource;
    if (query.desde && query.hasta) {
      where.createdAt = Between(new Date(query.desde), new Date(query.hasta));
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async exportLogs(query: QueryAuditDto) {
    const { items } = await this.findAll({ ...query, page: 1, limit: 200 });
    const header = 'fecha,usuario,rol,accion,recurso,recursoId,ip\n';
    const rows = items
      .map(
        (l) =>
          `${l.createdAt.toISOString()},${l.userEmail ?? ''},${l.userRole ?? ''},${l.action},${l.resource ?? ''},${l.resourceId ?? ''},${l.ip ?? ''}`,
      )
      .join('\n');
    return { formato: 'csv', csv: header + rows, total: items.length };
  }
}
