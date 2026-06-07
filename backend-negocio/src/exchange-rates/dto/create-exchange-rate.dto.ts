import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO para subir una tasa nueva. Ej. el dueño abre la tienda y registra
 * 1 USD = 620 Bs.
 */
export class CreateExchangeRateDto {
  @IsIn(['VES', 'COP'], {
    message: 'currency debe ser VES o COP (USD es la moneda base)',
  })
  currency!: 'VES' | 'COP';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001, { message: 'La tasa debe ser positiva' })
  rate!: number;

  /** Cuándo entra en vigor. Default: ahora (server). */
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notas?: string;
}
