export type Role = 'superadmin' | 'admin' | 'vendedor';

export interface User {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  activo?: boolean;
}

export interface SensorReading {
  sensorId: string;
  tipo: string;
  valor: number;
  unidad: string;
  fecha: string;
}

export type Severidad = 'baja' | 'media' | 'alta' | 'critica';

export interface IotAlert {
  id: string;
  tipo: string;
  severidad: Severidad;
  mensaje: string;
  reconocida: boolean;
  fecha: string;
  reconocidaPor?: string;
  reconocidaEn?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number | string;
  stock: number;
  stockMinimo: number;
  codigo?: string | null;
  activo: boolean;
  category?: { id: string; nombre: string } | null;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type Currency = 'USD' | 'VES' | 'COP';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'pago_movil' | 'zelle';
export type EstadoVenta = 'pendiente' | 'completada' | 'anulada';
export type TipoVenta = 'contado' | 'credito';

export interface Customer {
  id: string;
  cedula: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Combinaciones válidas (debe coincidir con el backend). */
export const COMBINACIONES_VALIDAS: Record<Currency, PaymentMethod[]> = {
  USD: ['zelle', 'efectivo'],
  VES: ['pago_movil', 'transferencia'],
  COP: ['efectivo', 'transferencia'],
};

export interface ExchangeRate {
  id: string;
  currency: 'VES' | 'COP';
  rate: string;
  effectiveFrom: string;
  createdBy: string;
  createdByEmail: string | null;
  notas: string | null;
  createdAt: string;
}

export interface CurrentRates {
  USD: 1;
  VES: number | null;
  COP: number | null;
  at: string;
}

export interface SalePayment {
  id: string;
  saleId: string;
  currency: Currency;
  method: PaymentMethod;
  amountOriginal: string;
  exchangeRate: string;
  amountUsd: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productNombre: string;
  productCodigo: string | null;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  userId: string;
  userEmail: string | null;
  userNombre: string | null;
  customerId: string | null;
  customer: Customer | null;
  tipoVenta: TipoVenta;
  total: string;
  saldoUsd: string;
  estado: EstadoVenta;
  motivoAnulacion: string | null;
  anuladaPor: string | null;
  anuladaEn: string | null;
  notas: string | null;
  fecha: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  items: SaleItem[];
  payments: SalePayment[];
}

export interface VentaReporteDia {
  fecha: string;
  total: number;
  cantidad: number;
}

export interface VentaReporteMes {
  mes: string;
  total: number;
  cantidad: number;
}
