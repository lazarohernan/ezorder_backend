import apiClient from '@/plugins/axios';
import type {
  Pedido,
  CreatePedidoDTO,
  UpdatePedidoDTO,
  PedidoApiResponse,
  EstadoPedido,
  TipoPedido,
} from '@/interfaces/Pedido';
import type { AxiosResponse } from 'axios';

/**
 * Servicio para gestionar las operaciones relacionadas con pedidos
 */
export const PedidoService = {
  /**
   * Obtiene todos los pedidos
   * @returns Promise con la respuesta de la API conteniendo un array de pedidos
   */
  getAll: async (): Promise<AxiosResponse<PedidoApiResponse<Pedido[]>>> => {
    return await apiClient.get<PedidoApiResponse<Pedido[]>>('/pedidos');
  },

  /**
   * Obtiene un pedido por su ID
   * @param id - UUID del pedido a buscar
   * @returns Promise con la respuesta de la API conteniendo el pedido
   */
  getById: async (id: string): Promise<AxiosResponse<PedidoApiResponse<Pedido>>> => {
    return await apiClient.get<PedidoApiResponse<Pedido>>(`/pedidos/${id}`);
  },

  /**
   * Obtiene los pedidos de un restaurante específico
   * @param restauranteId - UUID del restaurante
   * @returns Promise con la respuesta de la API conteniendo un array de pedidos
   */
  getByRestauranteId: async (
    restauranteId: string,
  ): Promise<AxiosResponse<PedidoApiResponse<Pedido[]>>> => {
    return await apiClient.get<PedidoApiResponse<Pedido[]>>(
      `/pedidos/restaurante/${restauranteId}`,
    );
  },

  /**
   * Crea un nuevo pedido
   * @param pedido - Datos del pedido a crear
   * @returns Promise con la respuesta de la API conteniendo el pedido creado
   */
  create: async (pedido: CreatePedidoDTO): Promise<AxiosResponse<PedidoApiResponse<Pedido>>> => {
    return await apiClient.post<PedidoApiResponse<Pedido>>('/pedidos', pedido);
  },

  /**
   * Actualiza un pedido existente
   * @param id - UUID del pedido a actualizar
   * @param pedido - Datos a actualizar del pedido
   * @returns Promise con la respuesta de la API conteniendo el pedido actualizado
   */
  update: async (
    id: string,
    pedido: UpdatePedidoDTO,
  ): Promise<AxiosResponse<PedidoApiResponse<Pedido>>> => {
    return await apiClient.put<PedidoApiResponse<Pedido>>(`/pedidos/${id}`, pedido);
  },

  /**
   * Elimina un pedido
   * @param id - UUID del pedido a eliminar
   * @returns Promise con la respuesta de la API
   */
  delete: async (id: string): Promise<AxiosResponse<PedidoApiResponse<null>>> => {
    return await apiClient.delete<PedidoApiResponse<null>>(`/pedidos/${id}`);
  },

  /**
   * Actualiza el estado de un pedido
   * @param id - UUID del pedido
   * @param estado_pedido - Nuevo estado del pedido
   * @returns Promise con la respuesta de la API conteniendo el pedido actualizado
   */
  updateEstado: async (
    id: string,
    estado_pedido: EstadoPedido,
  ): Promise<AxiosResponse<PedidoApiResponse<Pedido>>> => {
    return await apiClient.put<PedidoApiResponse<Pedido>>(`/pedidos/${id}`, { estado_pedido });
  },

  /**
   * Marca un pedido como pagado
   * @param id - UUID del pedido
   * @returns Promise con la respuesta de la API conteniendo el pedido actualizado
   */
  marcarComoPagado: async (id: string): Promise<AxiosResponse<PedidoApiResponse<Pedido>>> => {
    return await apiClient.put<PedidoApiResponse<Pedido>>(`/pedidos/${id}`, {
      pagado: true,
    });
  },

  /**
   * Filtra los pedidos por tipo
   * @param tipo - Tipo de pedido a filtrar
   * @returns Promise con la respuesta de la API conteniendo los pedidos filtrados
   */
  filtrarPorTipo: async (tipo: TipoPedido): Promise<AxiosResponse<PedidoApiResponse<Pedido[]>>> => {
    return await apiClient.get<PedidoApiResponse<Pedido[]>>(`/pedidos?tipo_pedido=${tipo}`);
  },

  /**
   * Filtra los pedidos por estado
   * @param estado - Estado por el que filtrar
   * @returns Promise con la respuesta de la API conteniendo los pedidos filtrados
   */
  filtrarPorEstado: async (
    estado: EstadoPedido,
  ): Promise<AxiosResponse<PedidoApiResponse<Pedido[]>>> => {
    return await apiClient.get<PedidoApiResponse<Pedido[]>>(`/pedidos?estado=${estado}`);
  },
};

export default PedidoService;
