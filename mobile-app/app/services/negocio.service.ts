import api from './api';

/**
 * Wrapper del API del microservicio de negocio (/api/negocio/*).
 */

export interface Category {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface Product {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoryId: string;
  category?: Category;
  precio: string | number;
  stock: number;
  stockMinimo: number;
  codigo: string | null;
  activo: boolean;
  createdAt?: string;
}

export interface CreateProductInput {
  nombre: string;
  descripcion?: string;
  categoryId: string;
  precio: number;
  stock: number;
  stockMinimo?: number;
  codigo?: string;
}

export interface UpdateProductInput {
  nombre?: string;
  descripcion?: string;
  categoryId?: string;
  precio?: number;
  stock?: number;
  stockMinimo?: number;
  codigo?: string;
}

export interface ProductStats {
  totalProductos: number;
  totalConStockBajo: number;
  valorInventario: number;
}

export const productsService = {
  async list(search?: string, categoryId?: string): Promise<Product[]> {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    const { data } = await api.get<Product[]>('/api/negocio/products', { params });
    return data;
  },
  async lowStock(): Promise<Product[]> {
    const { data } = await api.get<Product[]>('/api/negocio/products/low-stock');
    return data;
  },
  async stats(): Promise<ProductStats> {
    const { data } = await api.get<ProductStats>('/api/negocio/products/stats');
    return data;
  },
  async create(input: CreateProductInput): Promise<Product> {
    const { data } = await api.post<Product>('/api/negocio/products', input);
    return data;
  },
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const { data } = await api.put<Product>(`/api/negocio/products/${id}`, input);
    return data;
  },
  async remove(id: string): Promise<{ mensaje: string }> {
    const { data } = await api.delete<{ mensaje: string }>(`/api/negocio/products/${id}`);
    return data;
  },
};

export const categoriesService = {
  async list(): Promise<Category[]> {
    const { data } = await api.get<Category[]>('/api/negocio/categories');
    return data;
  },
};
