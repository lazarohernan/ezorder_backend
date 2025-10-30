import apiClient from '@/plugins/axios';
import type {
  Restaurante,
  CreateRestauranteDTO,
  UpdateRestauranteDTO,
  ApiResponse,
} from '@/interfaces/Restaurante';
import type { AxiosResponse } from 'axios';

/**
 * Servicio para gestionar las operaciones relacionadas con restaurantes
 */
export const RestaurantesService = {
  /**
   * Obtiene todos los restaurantes
   * @returns Promise con la respuesta de la API conteniendo un array de restaurantes
   */
  getAll: async (): Promise<AxiosResponse<ApiResponse<Restaurante[]>>> => {
    return await apiClient.get<ApiResponse<Restaurante[]>>('/restaurantes');
  },

  /**
   * Obtiene un restaurante por su ID
   * @param id - UUID del restaurante a buscar
   * @returns Promise con la respuesta de la API conteniendo el restaurante
   */
  getById: async (id: string): Promise<AxiosResponse<ApiResponse<Restaurante>>> => {
    return await apiClient.get<ApiResponse<Restaurante>>(`/restaurantes/${id}`);
  },

  /**
   * Crea un nuevo restaurante
   * @param restaurante - Datos del restaurante a crear
   * @returns Promise con la respuesta de la API conteniendo el restaurante creado
   */
  create: async (
    restaurante: CreateRestauranteDTO,
  ): Promise<AxiosResponse<ApiResponse<Restaurante>>> => {
    return await apiClient.post<ApiResponse<Restaurante>>('/restaurantes', restaurante);
  },

  /**
   * Actualiza un restaurante existente
   * @param id - UUID del restaurante a actualizar
   * @param restaurante - Datos a actualizar del restaurante
   * @returns Promise con la respuesta de la API conteniendo el restaurante actualizado
   */
  update: async (
    id: string,
    restaurante: UpdateRestauranteDTO,
  ): Promise<AxiosResponse<ApiResponse<Restaurante>>> => {
    return await apiClient.put<ApiResponse<Restaurante>>(`/restaurantes/${id}`, restaurante);
  },

  /**
   * Elimina un restaurante
   * @param id - UUID del restaurante a eliminar
   * @returns Promise con la respuesta de la API
   */
  delete: async (id: string): Promise<AxiosResponse<ApiResponse<null>>> => {
    return await apiClient.delete<ApiResponse<null>>(`/restaurantes/${id}`);
  },
};

export default RestaurantesService;
