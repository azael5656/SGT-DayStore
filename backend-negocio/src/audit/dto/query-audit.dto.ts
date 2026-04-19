import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * Query params para filtrar logs de auditoria.
 */
export class QueryAuditDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @IsUUID('4')
  userId?: string;
}
