import apiClient from '@/plugins/axios';
import type { AxiosResponse } from 'axios';

export interface CategoriaMenu {
  id: string;
  nombre: string;
  descripcion?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoriaPayload {
  nombre: string;
  descripcion?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  message: string;
  data: T;
}

export const CategoriasService = {
  async getAll(): Promise<AxiosResponse<ApiResponse<CategoriaMenu[]>>> {
    return apiClient.get<ApiResponse<CategoriaMenu[]>>('/menu/categories');
  },

  async create(payload: CategoriaPayload): Promise<AxiosResponse<ApiResponse<CategoriaMenu>>> {
    return apiClient.post<ApiResponse<CategoriaMenu>>('/menu/categories', payload);
  },

  async update(id: string, payload: CategoriaPayload): Promise<AxiosResponse<ApiResponse<CategoriaMenu>>> {
    return apiClient.put<ApiResponse<CategoriaMenu>>(`/menu/categories/${id}`, payload);
  },

  async delete(id: string): Promise<AxiosResponse<ApiResponse<null>>> {
    return apiClient.delete<ApiResponse<null>>(`/menu/categories/${id}`);
  },
};

export default CategoriasService;
