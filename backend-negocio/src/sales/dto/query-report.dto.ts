import { IsDateString, IsOptional } from 'class-validator';

/**
 * Query params para los reportes de ventas (daily, monthly).
 * Si no se envian, se usan defaults del servicio (hoy, mes actual).
 */
export class QueryReportDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
