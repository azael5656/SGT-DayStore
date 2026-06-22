import { database } from '../index';
import Sale from '../models/Sale';
import SaleItem from '../models/SaleItem';
import SalePayment from '../models/SalePayment';

export interface CrearVentaLocalArgs {
  userId: string;
  tipoVenta: 'contado' | 'credito';
  customerId?: string | null;
  notas?: string | null;
  totalUsd: number;
  saldoUsd: number;
  estado: 'completada' | 'pendiente';
  items: {
    productId: string;
    productNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
  payments: {
    currency: string;
    method: string;
    amountOriginal: number;
    exchangeRate: number;
    amountUsd: number;
  }[];
}

/**
 * Registra una venta en la BD local (offline-first). Crea la venta + sus items
 * + pagos en una sola transacción de WatermelonDB; los records quedan marcados
 * como `created` (entran a la cola de push). El `id` lo genera WatermelonDB
 * como UUID v4 (ver database/index.ts) → es el mismo que recibe el backend al
 * sincronizar, garantizando idempotencia.
 *
 * Los montos (precio congelado, total, saldo, equivalentes USD) se calculan en
 * el cliente con la última tasa sincronizada. Al hacer push, el backend los
 * recalcula como autoridad (Last Write Wins), pero la venta ya quedó guardada
 * localmente y visible al instante, con o sin conexión.
 *
 * @returns el id de la venta creada.
 */
export async function crearVentaLocal(
  args: CrearVentaLocalArgs,
): Promise<string> {
  let saleId = '';
  await database.write(async () => {
    const sale = await database.get<Sale>('sales').create((s) => {
      s.userId = args.userId;
      s.customerId = args.customerId ?? undefined;
      s.tipoVenta = args.tipoVenta;
      s.total = args.totalUsd;
      s.saldoUsd = args.saldoUsd;
      s.estado = args.estado;
      s.notas = args.notas ?? undefined;
      s.fecha = Date.now();
    });
    saleId = sale.id;

    const items = args.items.map((it) =>
      database.get<SaleItem>('sale_items').prepareCreate((i) => {
        i.saleId = sale.id;
        i.productId = it.productId;
        i.productNombre = it.productNombre;
        i.cantidad = it.cantidad;
        i.precioUnitario = it.precioUnitario;
        i.subtotal = it.subtotal;
      }),
    );
    const payments = args.payments.map((p) =>
      database.get<SalePayment>('sale_payments').prepareCreate((pay) => {
        pay.saleId = sale.id;
        pay.currency = p.currency;
        pay.method = p.method;
        pay.amountOriginal = p.amountOriginal;
        pay.exchangeRate = p.exchangeRate;
        pay.amountUsd = p.amountUsd;
      }),
    );
    await database.batch(...items, ...payments);
  });
  return saleId;
}

/** Cuántas ventas locales están pendientes de subir (no sincronizadas). */
export async function contarVentasPendientes(): Promise<number> {
  const ventas = await database.get<Sale>('sales').query().fetch();
  return ventas.filter((s) => s.syncStatus !== 'synced').length;
}
