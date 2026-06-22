import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * Schema local de WatermelonDB (offline-first).
 *
 * Convenciones:
 *  - El `id` de cada fila es el UUID del servidor (o el que genera el móvil
 *    para ventas nuevas → idempotencia). WatermelonDB lo maneja como `id`.
 *  - WatermelonDB reserva sus columnas internas `_status`/`_changed`/`created_at`/
 *    `updated_at` para el tracking de sync, por eso los timestamps del negocio
 *    van como `server_created_at`/`server_updated_at` (epoch ms).
 *  - Tablas pull-only (server manda): categories, products, customers, exchange_rates.
 *  - Tablas push-only (se crean offline): sales, sale_items, sale_payments.
 */
export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'server_created_at', type: 'number' },
        { name: 'server_updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'products',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'precio', type: 'number' },
        { name: 'stock', type: 'number' },
        { name: 'stock_minimo', type: 'number' },
        { name: 'codigo', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'server_created_at', type: 'number' },
        { name: 'server_updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'customers',
      columns: [
        { name: 'cedula', type: 'string', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'telefono', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'server_created_at', type: 'number' },
        { name: 'server_updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'exchange_rates',
      columns: [
        { name: 'currency', type: 'string' },
        { name: 'rate', type: 'number' },
        { name: 'effective_from', type: 'number' },
        { name: 'server_created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sales',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'customer_id', type: 'string', isOptional: true },
        { name: 'tipo_venta', type: 'string' },
        { name: 'total', type: 'number' },
        { name: 'saldo_usd', type: 'number' },
        { name: 'estado', type: 'string' },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'fecha', type: 'number' },
        { name: 'server_created_at', type: 'number', isOptional: true },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'sale_items',
      columns: [
        { name: 'sale_id', type: 'string', isIndexed: true },
        { name: 'product_id', type: 'string' },
        { name: 'product_nombre', type: 'string' },
        { name: 'cantidad', type: 'number' },
        { name: 'precio_unitario', type: 'number' },
        { name: 'subtotal', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sale_payments',
      columns: [
        { name: 'sale_id', type: 'string', isIndexed: true },
        { name: 'currency', type: 'string' },
        { name: 'method', type: 'string' },
        { name: 'amount_original', type: 'number' },
        { name: 'exchange_rate', type: 'number' },
        { name: 'amount_usd', type: 'number' },
      ],
    }),
  ],
});
