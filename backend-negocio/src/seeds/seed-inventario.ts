import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';

/**
 * Seed de catalogo demo.
 *
 * Ejecuta con:
 *   TYPEORM_SYNC=true npm run seed:inventario
 *
 * (TYPEORM_SYNC=true asegura que las tablas esten creadas si aun no
 * existen. Idempotente: no recrea categorias ni productos que ya estan
 * por nombre/codigo.)
 */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);
  const categoryRepo = ds.getRepository(Category);
  const productRepo = ds.getRepository(Product);

  const categoriasDemo = [
    { nombre: 'Manga', descripcion: 'Volumenes de manga' },
    { nombre: 'Figura', descripcion: 'Figuras coleccionables' },
    { nombre: 'Carta', descripcion: 'Cartas TCG (Pokemon, YuGiOh, etc.)' },
    { nombre: 'Camisa', descripcion: 'Merchandising de ropa' },
    { nombre: 'Joyeria', descripcion: 'Accesorios inspirados en anime' },
  ];

  const categoriasPersistidas: Record<string, Category> = {};
  for (const cat of categoriasDemo) {
    let entity = await categoryRepo.findOne({ where: { nombre: cat.nombre } });
    if (!entity) {
      entity = await categoryRepo.save(categoryRepo.create(cat));
      console.log(`  + categoria creada: ${cat.nombre}`);
    }
    categoriasPersistidas[cat.nombre] = entity;
  }

  const productosDemo: Array<{
    nombre: string;
    categoria: string;
    precio: string;
    stock: number;
    stockMinimo: number;
    codigo: string;
    descripcion?: string;
  }> = [
    { nombre: 'One Piece Vol. 1', categoria: 'Manga', precio: '18000', stock: 12, stockMinimo: 3, codigo: 'MNG-OP-001' },
    { nombre: 'Dandadan Vol. 3', categoria: 'Manga', precio: '22000', stock: 5, stockMinimo: 3, codigo: 'MNG-DD-003' },
    { nombre: 'Naruto Shippuden Vol. 72', categoria: 'Manga', precio: '19000', stock: 2, stockMinimo: 4, codigo: 'MNG-NS-072' },
    { nombre: 'Figura Goku Ultra Instinct', categoria: 'Figura', precio: '95000', stock: 4, stockMinimo: 2, codigo: 'FIG-DB-GOKU' },
    { nombre: 'Figura Kirby', categoria: 'Figura', precio: '45000', stock: 8, stockMinimo: 3, codigo: 'FIG-KIRBY' },
    { nombre: 'Booster Pokemon Paldea Evolved', categoria: 'Carta', precio: '28000', stock: 30, stockMinimo: 10, codigo: 'CAR-POK-PE' },
    { nombre: 'Deck YuGiOh Dragons', categoria: 'Carta', precio: '55000', stock: 3, stockMinimo: 5, codigo: 'CAR-YGO-DRG' },
    { nombre: 'Camisa Anime Akatsuki', categoria: 'Camisa', precio: '65000', stock: 15, stockMinimo: 5, codigo: 'CAM-AKA-M' },
    { nombre: 'Camisa One Piece Nakama', categoria: 'Camisa', precio: '60000', stock: 9, stockMinimo: 5, codigo: 'CAM-OP-NK' },
    { nombre: 'Anillo Akatsuki', categoria: 'Joyeria', precio: '35000', stock: 11, stockMinimo: 4, codigo: 'JOY-AKA-R' },
    { nombre: 'Collar One Piece', categoria: 'Joyeria', precio: '42000', stock: 6, stockMinimo: 3, codigo: 'JOY-OP-N' },
    { nombre: 'Zarcillos Vegito', categoria: 'Joyeria', precio: '25000', stock: 1, stockMinimo: 3, codigo: 'JOY-VEG-E' },
  ];

  for (const p of productosDemo) {
    const existente = await productRepo.findOne({ where: { codigo: p.codigo } });
    if (existente) continue;
    const categoria = categoriasPersistidas[p.categoria];
    if (!categoria) {
      console.warn(`  ! categoria no encontrada para ${p.nombre}: ${p.categoria}`);
      continue;
    }
    const entity = productRepo.create({
      nombre: p.nombre,
      descripcion: p.descripcion ?? null,
      categoryId: categoria.id,
      precio: p.precio,
      stock: p.stock,
      stockMinimo: p.stockMinimo,
      codigo: p.codigo,
      activo: true,
    });
    await productRepo.save(entity);
    console.log(`  + producto creado: ${p.nombre}`);
  }

  const totalCats = await categoryRepo.count();
  const totalProds = await productRepo.count({ where: { activo: true } });
  console.log(`\n✅ Seed completo: ${totalCats} categorias, ${totalProds} productos activos.`);

  await app.close();
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
