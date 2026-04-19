import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Datos de entrada para actualizar un sensor existente.
 */
export class UpdateSensorDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsObject()
  umbrales?: Record<string, number>;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
