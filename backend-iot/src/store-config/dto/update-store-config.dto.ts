import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UmbralesDto {
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  temperaturaMax?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  humedadMax?: number;
}

export class UpdateStoreConfigDto {
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato HH:MM' })
  horarioApertura?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato HH:MM' })
  horarioCierre?: string;

  @IsOptional()
  @IsString()
  zonaHoraria?: string;

  @IsOptional()
  @IsBoolean()
  modoNocturno?: boolean;

  /** "YYYY-MM-DD" o null para limpiar vacaciones. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$|^$/, { message: 'Formato YYYY-MM-DD' })
  vacacionesHasta?: string | null;

  /** "HH:MM" o null para cancelar cierre temprano. */
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$|^$/, { message: 'Formato HH:MM' })
  cerrarHoyA?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasCerrados?: number[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UmbralesDto)
  umbralesAlerta?: UmbralesDto;
}
