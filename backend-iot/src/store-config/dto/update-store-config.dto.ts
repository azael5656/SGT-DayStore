import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/**
 * Datos de entrada para PUT /store/config.
 */
export class UpdateStoreConfigDto {
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'El horario debe tener formato HH:MM',
  })
  horarioApertura?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'El horario debe tener formato HH:MM',
  })
  horarioCierre?: string;

  @IsOptional()
  @IsString()
  zonaHoraria?: string;

  @IsOptional()
  @IsBoolean()
  modoNocturno?: boolean;

  @IsOptional()
  @IsObject()
  umbralesAlerta?: Record<string, unknown>;
}
