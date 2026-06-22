import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository } from './products.repository';

/**
 * Servicio de productos. Lógica de negocio del CRUD de inventario.
 * Toda la persistencia va a través de ProductsRepository.
 */
@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  findAll(query: QueryProductsDto) {
    return this.repo.findActive({
      search: query.search,
      categoryId: query.categoryId,
    });
  }

  findLowStock() {
    return this.repo.findLowStock();
  }

  async getStats() {
    const [totalProductos, totalConStockBajo, valorInventario] = await Promise.all([
      this.repo.countActive(),
      this.repo.countLowStock(),
      this.repo.sumInventoryValue(),
    ]);
    return { totalProductos, totalConStockBajo, valorInventario };
  }

  async findOne(id: string) {
    const producto = await this.repo.findById(id);
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async create(dto: CreateProductDto) {
    const codigoManual = dto.codigo?.trim();
    // Codigo autogenerado si no lo escriben; obligatorio (nunca vacio) y unico.
    const codigo = codigoManual || (await this.generarCodigo());
    if (codigoManual && (await this.repo.codigoExiste(codigoManual))) {
      throw new ConflictException(
        `Ya existe un producto con el codigo "${codigoManual}"`,
      );
    }
    try {
      return await this.repo.create({
        ...dto,
        codigo,
        precio: dto.precio.toString(),
        stockMinimo: dto.stockMinimo ?? 5,
        activo: true,
      });
    } catch (e) {
      throw this.mapearDuplicado(e, codigo);
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const producto = await this.findOne(id);
    const codigoNuevo = dto.codigo?.trim();
    // El codigo es editable, pero debe seguir siendo unico.
    if (codigoNuevo && codigoNuevo !== producto.codigo) {
      if (await this.repo.codigoExiste(codigoNuevo)) {
        throw new ConflictException(
          `Ya existe un producto con el codigo "${codigoNuevo}"`,
        );
      }
    }
    Object.assign(producto, {
      ...dto,
      codigo: codigoNuevo || producto.codigo,
      precio: dto.precio !== undefined ? dto.precio.toString() : producto.precio,
    });
    try {
      return await this.repo.save(producto);
    } catch (e) {
      throw this.mapearDuplicado(e, codigoNuevo ?? producto.codigo ?? '');
    }
  }

  /**
   * Genera un codigo unico tipo PRD-####. Arranca en (total productos + 1) y
   * avanza si ese candidato ya existe (por codigos manuales que dejen huecos).
   */
  private async generarCodigo(): Promise<string> {
    let n = (await this.repo.countActive()) + 1;
    for (let i = 0; i < 10000; i++) {
      const candidato = `PRD-${String(n).padStart(4, '0')}`;
      if (!(await this.repo.codigoExiste(candidato))) return candidato;
      n++;
    }
    return `PRD-${n}`;
  }

  /** Traduce el error de unique-violation de Postgres (23505) a un 409 claro. */
  private mapearDuplicado(e: unknown, codigo: string): unknown {
    if ((e as { code?: string })?.code === '23505') {
      return new ConflictException(
        `Ya existe un producto con el codigo "${codigo}"`,
      );
    }
    return e;
  }

  async remove(id: string) {
    const producto = await this.findOne(id);
    producto.activo = false;
    await this.repo.save(producto);
    return { mensaje: `Producto ${id} eliminado` };
  }
}
