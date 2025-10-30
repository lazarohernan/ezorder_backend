import apiClient from '@/plugins/axios';
import type { Menu, CreateMenuDTO, UpdateMenuDTO, ApiResponse } from '@/interfaces/Menu';
import type { AxiosResponse } from 'axios';

/**
 * Servicio para gestionar las operaciones relacionadas con menús
 */
export const MenuService = {
  /**
   * Obtiene todos los menús
   * @returns Promise con la respuesta de la API conteniendo un array de menús
   */
  getAll: async (): Promise<AxiosResponse<ApiResponse<Menu[]>>> => {
    return await apiClient.get<ApiResponse<Menu[]>>('/menu');
  },

  /**
   * Obtiene los menús de un restaurante específico
   * @param restaurante_id - UUID del restaurante
   * @returns Promise con la respuesta de la API conteniendo un array de menús
   */
  getByRestauranteId: async (
    restaurante_id: string,
  ): Promise<AxiosResponse<ApiResponse<Menu[]>>> => {
    return await apiClient.get<ApiResponse<Menu[]>>(`/menu/restaurante/${restaurante_id}`);
  },

  /**
   * Obtiene un menú por su ID
   * @param id - UUID del menú a buscar
   * @returns Promise con la respuesta de la API conteniendo el menú
   */
  getById: async (id: string): Promise<AxiosResponse<ApiResponse<Menu>>> => {
    return await apiClient.get<ApiResponse<Menu>>(`/menu/${id}`);
  },

  /**
   * Crea un nuevo menú
   * @param menu - Datos del menú a crear
   * @returns Promise con la respuesta de la API conteniendo el menú creado
   */
  create: async (menu: CreateMenuDTO): Promise<AxiosResponse<ApiResponse<Menu>>> => {
    return await apiClient.post<ApiResponse<Menu>>('/menu', menu);
  },

  /**
   * Actualiza un menú existente
   * @param id - UUID del menú a actualizar
   * @param menu - Datos a actualizar del menú
   * @returns Promise con la respuesta de la API conteniendo el menú actualizado
   */
  update: async (id: string, menu: UpdateMenuDTO): Promise<AxiosResponse<ApiResponse<Menu>>> => {
    return await apiClient.put<ApiResponse<Menu>>(`/menu/${id}`, menu);
  },

  /**
   * Elimina un menú
   * @param id - UUID del menú a eliminar
   * @returns Promise con la respuesta de la API
   */
  delete: async (id: string): Promise<AxiosResponse<ApiResponse<null>>> => {
    return await apiClient.delete<ApiResponse<null>>(`/menu/${id}`);
  },
};

export default MenuService;
