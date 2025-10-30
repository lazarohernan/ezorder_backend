import { api } from '@/plugins/axios';
import type { RolResponse, RolesResponse, CreateRolDto, UpdateRolDto } from '@/interfaces/Rol';

/**
 * Servicio para gestionar roles en la aplicación
 */
export default {
  /**
   * Obtiene todos los roles
   * @returns Una promesa con la respuesta de roles
   */
  async getRoles(): Promise<RolesResponse> {
    try {
      const response = await api.get('/roles');
      return response.data;
    } catch (error: unknown) {
      console.error('Error al obtener roles:', error);
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Error al obtener roles',
      };
    }
  },

  /**
   * Obtiene un rol por su ID
   * @param id ID del rol a obtener
   * @returns Una promesa con la respuesta del rol
   */
  async getRolById(id: number): Promise<RolResponse> {
    try {
      const response = await api.get(`/roles/${id}`);
      return response.data;
    } catch (error: unknown) {
      console.error(`Error al obtener rol con ID ${id}:`, error);
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Error al obtener rol',
      };
    }
  },

  /**
   * Crea un nuevo rol
   * @param rolData Datos del rol a crear
   * @returns Una promesa con la respuesta de creación
   */
  async createRol(rolData: CreateRolDto): Promise<RolResponse> {
    try {
      const response = await api.post('/roles', rolData);
      return response.data;
    } catch (error: unknown) {
      console.error('Error al crear rol:', error);
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Error al crear rol',
      };
    }
  },

  /**
   * Actualiza un rol existente
   * @param id ID del rol a actualizar
   * @param rolData Datos actualizados del rol
   * @returns Una promesa con la respuesta de actualización
   */
  async updateRol(id: number, rolData: UpdateRolDto): Promise<RolResponse> {
    try {
      const response = await api.put(`/roles/${id}`, rolData);
      return response.data;
    } catch (error: unknown) {
      console.error(`Error al actualizar rol con ID ${id}:`, error);
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Error al actualizar rol',
      };
    }
  },

  /**
   * Elimina un rol existente
   * @param id ID del rol a eliminar
   * @returns Una promesa con la respuesta de eliminación
   */
  async deleteRol(id: number): Promise<RolResponse> {
    try {
      const response = await api.delete(`/roles/${id}`);
      return response.data;
    } catch (error: unknown) {
      console.error(`Error al eliminar rol con ID ${id}:`, error);
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Error al eliminar rol',
      };
    }
  },
};
