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
