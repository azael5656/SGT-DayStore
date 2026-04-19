import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Datos de entrada para registrar un sensor nuevo en el sistema.
 */
export class CreateSensorDto {
  @IsString()
  @IsNotEmpty()
  sensorId!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsIn(['temperatura', 'humedad', 'puerta', 'movimiento', 'vibracion', 'luz'])
  tipo!: string;

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
