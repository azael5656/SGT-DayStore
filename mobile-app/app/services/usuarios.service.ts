import api from './api';
import type { Role } from '../utils/storage';

export interface UsuarioDetalle {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  activo: boolean;
  createdAt: string;
}

export interface CrearUsuarioInput {
  email: string;
  password: string;
  nombre: string;
  role: Role;
}

export const usuariosService = {
  async listar(): Promise<UsuarioDetalle[]> {
    const { data } = await api.get<UsuarioDetalle[]>('/api/negocio/users');
    return data;
  },
  async crear(input: CrearUsuarioInput): Promise<UsuarioDetalle> {
    const { data } = await api.post<UsuarioDetalle>('/api/negocio/users', input);
    return data;
  },
  async cambiarRol(id: string, role: Role): Promise<UsuarioDetalle> {
    const { data } = await api.patch<UsuarioDetalle>(
      `/api/negocio/users/${id}/role`,
      { role },
    );
    return data;
  },
  async desactivar(id: string): Promise<UsuarioDetalle> {
    const { data } = await api.patch<UsuarioDetalle>(
      `/api/negocio/users/${id}/desactivar`,
      {},
    );
    return data;
  },
  async activar(id: string): Promise<UsuarioDetalle> {
    const { data } = await api.patch<UsuarioDetalle>(
      `/api/negocio/users/${id}/activar`,
      {},
    );
    return data;
  },
};
