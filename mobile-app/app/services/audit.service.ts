import api from './api';

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

export interface AuditPage {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditFilters {
  userEmail?: string;
  action?: string;
  resource?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

export const auditService = {
  async listar(filtros: AuditFilters = {}): Promise<AuditPage> {
    const { data } = await api.get<AuditPage>('/api/negocio/audit/logs', {
      params: filtros,
    });
    return data;
  },
};
