import apiClient from '@/plugins/axios';

// Interfaces
export interface Permiso {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
}

export interface RolPersonalizado {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  es_super_admin: boolean;
  activo: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  permisos: Permiso[];
}

export interface PermisosPorCategoria {
  [categoria: string]: Permiso[];
}

class RolesService {
  // Obtener todos los permisos disponibles
  async getPermisos(): Promise<PermisosPorCategoria> {
    const response = await apiClient.get('/roles-personalizados/permisos');
    return response.data.data;
  }

  // Obtener todos los roles personalizados
  async getRoles(): Promise<RolPersonalizado[]> {
    const response = await apiClient.get('/roles-personalizados');
    return response.data.data;
  }

  // Obtener un rol específico
  async getRolById(id: number): Promise<RolPersonalizado> {
    const response = await apiClient.get(`/roles-personalizados/${id}`);
    return response.data.data;
  }

  // Crear un nuevo rol
  async createRol(rolData: {
    nombre: string;
    descripcion?: string;
    color?: string;
    icono?: string;
    permisos: number[];
  }): Promise<RolPersonalizado> {
    const response = await apiClient.post('/roles-personalizados', rolData);
    return response.data.data;
  }

  // Actualizar un rol
  async updateRol(id: number, rolData: {
    nombre?: string;
    descripcion?: string;
    color?: string;
    icono?: string;
    permisos?: number[];
    activo?: boolean;
  }): Promise<RolPersonalizado> {
    const response = await apiClient.put(`/roles-personalizados/${id}`, rolData);
    return response.data.data;
  }

  // Eliminar un rol
  async deleteRol(id: number): Promise<void> {
    await apiClient.delete(`/roles-personalizados/${id}`);
  }
}

export default new RolesService();
