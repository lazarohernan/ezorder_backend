import type {
  ApiResponse,
  CreateUsuarioInfoDTO,
  UpdateUsuarioInfoDTO,
  UsuarioWithInfo,
} from '@/interfaces/Usuario';
import apiClient from '@/plugins/axios';
import type { AxiosResponse } from 'axios';

/**
 * Interface para resultados paginados
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Servicio para gestionar los usuarios
 */
const UsuariosService = {
  /**
   * Obtener todos los usuarios
   * @returns Promise con respuesta de usuarios
   */
  getAll: async (): Promise<AxiosResponse<ApiResponse<UsuarioWithInfo[]>>> => {
    return await apiClient.get<ApiResponse<UsuarioWithInfo[]>>('/usuarios');
  },

  /**
   * Obtener todos los usuarios con paginación
   * @param params - Parámetros de paginación (página y límite)
   * @returns Promise con respuesta paginada de usuarios
   */
  getAllPaginated: async (
    params: PaginationParams = { page: 1, limit: 10 },
  ): Promise<AxiosResponse<ApiResponse<PaginatedResponse<UsuarioWithInfo>>>> => {
    return await apiClient.get<ApiResponse<PaginatedResponse<UsuarioWithInfo>>>('/usuarios', {
      params,
    });
  },

  /**
   * Obtener usuario por ID
   * @param id - ID del usuario
   * @returns Promise con respuesta del usuario
   */
  getById: async (id: string): Promise<AxiosResponse<ApiResponse<UsuarioWithInfo>>> => {
    return await apiClient.get<ApiResponse<UsuarioWithInfo>>(`/usuarios/${id}`);
  },

  /**
   * Obtener información del usuario actual
   * @returns Promise con respuesta del usuario actual
   */
  getCurrentUserInfo: async (): Promise<AxiosResponse<ApiResponse<UsuarioWithInfo>>> => {
    return await apiClient.get<ApiResponse<UsuarioWithInfo>>('/usuarios/me');
  },

  /**
   * Crear información para un usuario
   * @param userData - Datos del usuario a crear
   * @returns Promise con respuesta de la creación
   */
  create: async (
    userData: CreateUsuarioInfoDTO,
  ): Promise<AxiosResponse<ApiResponse<UsuarioWithInfo>>> => {
    return await apiClient.post<ApiResponse<UsuarioWithInfo>>('/usuarios', userData);
  },

  /**
   * Actualizar información de un usuario
   * @param id - ID del usuario
   * @param userData - Datos a actualizar
   * @returns Promise con respuesta de la actualización
   */
  update: async (
    id: string,
    userData: UpdateUsuarioInfoDTO,
  ): Promise<AxiosResponse<ApiResponse<UsuarioWithInfo>>> => {
    return await apiClient.put<ApiResponse<UsuarioWithInfo>>(`/usuarios/${id}`, userData);
  },

  /**
   * Eliminar información de un usuario
   * @param id - ID del usuario
   * @returns Promise con respuesta de la eliminación
   */
  delete: async (id: string): Promise<AxiosResponse<ApiResponse<null>>> => {
    return await apiClient.delete<ApiResponse<null>>(`/usuarios/${id}`);
  },

  /**
   * Invitar un nuevo usuario (envía email de invitación)
   * @param inviteData - Datos del usuario a invitar
   * @returns Promise con respuesta de la invitación
   */
  invite: async (inviteData: {
    email: string;
    nombre: string;
    apellido: string;
    telefono?: string;
    restaurante_id?: number | null;
  }): Promise<AxiosResponse<ApiResponse<UsuarioWithInfo>>> => {
    return await apiClient.post<ApiResponse<UsuarioWithInfo>>('/usuarios/invite', inviteData);
  },

  /**
   * Asignar rol personalizado a un usuario
   * @param userId - ID del usuario
   * @param rolPersonalizadoId - ID del rol personalizado
   * @returns Promise con respuesta de la asignación
   */
  assignRole: async (
    userId: string,
    rolPersonalizadoId: number | null
  ): Promise<AxiosResponse<ApiResponse<UsuarioWithInfo>>> => {
    return await apiClient.put<ApiResponse<UsuarioWithInfo>>(`/usuarios/${userId}`, {
      rol_personalizado_id: rolPersonalizadoId,
    });
  },
};

export default UsuariosService;
