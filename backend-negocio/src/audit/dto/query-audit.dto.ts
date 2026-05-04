import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryAuditDto {
  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  /**
   * Filtra logs ligados a un recurso especifico (ej: id del cliente
   * para mostrar su historial). Es opcional; si no viene, se devuelven
   * logs de todos los recursos como antes.
   */
  @IsOptional()
  @IsUUID('4')
  resourceId?: string;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
