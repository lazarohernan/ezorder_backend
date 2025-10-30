import apiClient from '@/plugins/axios';
import type { 
  PedidoItem, 
  CreatePedidoItemDTO, 
  UpdatePedidoItemDTO, 
  PedidoItemApiResponse
} from '@/interfaces/PedidoItem';
import type { AxiosResponse } from 'axios';

/**
 * Servicio para gestionar las operaciones relacionadas con ítems de pedido
 */
export const PedidoItemService = {
  /**
   * Obtiene todos los ítems de pedido
   * @returns Promise con la respuesta de la API conteniendo un array de ítems de pedido
   */
  getAll: async (): Promise<AxiosResponse<PedidoItemApiResponse<PedidoItem[]>>> => {
    return await apiClient.get<PedidoItemApiResponse<PedidoItem[]>>('/pedido-items');
  },

  /**
   * Obtiene un ítem de pedido por su ID
   * @param id - UUID del ítem de pedido a buscar
   * @returns Promise con la respuesta de la API conteniendo el ítem de pedido
   */
  getById: async (id: string): Promise<AxiosResponse<PedidoItemApiResponse<PedidoItem>>> => {
    return await apiClient.get<PedidoItemApiResponse<PedidoItem>>(`/pedido-items/${id}`);
  },

  /**
   * Obtiene los ítems de un pedido específico
   * @param pedidoId - UUID del pedido
   * @returns Promise con la respuesta de la API conteniendo un array de ítems de pedido
   */
  getByPedidoId: async (
    pedidoId: string
  ): Promise<AxiosResponse<PedidoItemApiResponse<PedidoItem[]>>> => {
    return await apiClient.get<PedidoItemApiResponse<PedidoItem[]>>(
      `/pedido-items/pedido/${pedidoId}`
    );
  },

  /**
   * Crea un nuevo ítem de pedido
   * @param item - Datos del ítem de pedido a crear
   * @returns Promise con la respuesta de la API conteniendo el ítem de pedido creado
   */
  create: async (
    item: CreatePedidoItemDTO
  ): Promise<AxiosResponse<PedidoItemApiResponse<PedidoItem>>> => {
    // Calcular el total si no se proporciona
    const itemData = { ...item };
    if (itemData.cantidad && itemData.precio_unitario && !itemData.total_item) {
      itemData.total_item = itemData.cantidad * itemData.precio_unitario;
    }
    
    return await apiClient.post<PedidoItemApiResponse<PedidoItem>>('/pedido-items', itemData);
  },

  /**
   * Actualiza un ítem de pedido existente
   * @param id - UUID del ítem de pedido a actualizar
   * @param updates - Datos a actualizar del ítem de pedido
   * @returns Promise con la respuesta de la API conteniendo el ítem de pedido actualizado
   */
  update: async (
    id: string,
    updates: UpdatePedidoItemDTO
  ): Promise<AxiosResponse<PedidoItemApiResponse<PedidoItem>>> => {
    // Recalcular el total si se actualiza la cantidad o el precio unitario
    const updateData = { ...updates };
    if (updateData.cantidad !== undefined || updateData.precio_unitario !== undefined) {
      updateData.total_item = 
        (updateData.cantidad || updates.cantidad || 0) * 
        (updateData.precio_unitario || updates.precio_unitario || 0);
    }
    
    return await apiClient.put<PedidoItemApiResponse<PedidoItem>>(
      `/pedido-items/${id}`, 
      updateData
    );
  },

  /**
   * Elimina un ítem de pedido
   * @param id - UUID del ítem de pedido a eliminar
   * @returns Promise con la respuesta de la API
   */
  delete: async (id: string): Promise<AxiosResponse<PedidoItemApiResponse<null>>> => {
    return await apiClient.delete<PedidoItemApiResponse<null>>(`/pedido-items/${id}`);
  },

  /**
   * Marca un ítem como enviado a cocina
   * @param id - UUID del ítem de pedido
   * @returns Promise con la respuesta de la API conteniendo el ítem actualizado
   */
  marcarEnviadoACocina: async (
    id: string
  ): Promise<AxiosResponse<PedidoItemApiResponse<PedidoItem>>> => {
    return await apiClient.put<PedidoItemApiResponse<PedidoItem>>(
      `/pedido-items/${id}/enviar-cocina`
    );
  },

  /**
   * Marca un ítem como preparado
   * @param id - UUID del ítem de pedido
   * @returns Promise con la respuesta de la API conteniendo el ítem actualizado
   */
  marcarPreparado: async (
    id: string
  ): Promise<AxiosResponse<PedidoItemApiResponse<PedidoItem>>> => {
    return await apiClient.put<PedidoItemApiResponse<PedidoItem>>(
      `/pedido-items/${id}/marcar-preparado`
    );
  },

  /**
   * Crea múltiples ítems de pedido a la vez
   * @param items - Array de ítems de pedido a crear
   * @returns Promise con la respuesta de la API conteniendo los ítems creados
   */
  createBatch: async (
    items: CreatePedidoItemDTO[]
  ): Promise<AxiosResponse<PedidoItemApiResponse<PedidoItem[]>>> => {
    // Calcular el total para cada ítem si no se proporciona
    const itemsWithTotals = items.map(item => {
      const itemData = { ...item };
      if (itemData.cantidad && itemData.precio_unitario && !itemData.total_item) {
        itemData.total_item = itemData.cantidad * itemData.precio_unitario;
      }
      return itemData;
    });
    
    return await apiClient.post<PedidoItemApiResponse<PedidoItem[]>>(
      '/pedido-items/batch', 
      { items: itemsWithTotals }
    );
  },
};

export default PedidoItemService;
