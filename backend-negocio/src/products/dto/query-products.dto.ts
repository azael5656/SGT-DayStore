import { IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Query params para filtrar productos en GET /products.
 */
export class QueryProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;
}
