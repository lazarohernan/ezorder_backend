import type { Menu } from './Menu';
import type { Pedido } from './Pedido';

/**
 * Interfaz que representa un ítem de pedido en el sistema
 */
export interface PedidoItem {
  id: string;
  created_at: string;
  pedido_id: string;
  menu_id: string;
  nombre_menu: string;
  cantidad: number;
  precio_unitario: number | null;
  impuesto_unitario: number;
  total_item: number;
  notas: string | null;
  enviado_a_cocina: boolean;

  // Relaciones
  menu?: Pick<Menu, 'id' | 'nombre'>;
  pedidos?: Pick<Pedido, 'id' | 'estado_pedido' | 'restaurante_id'> & {
    restaurantes?: {
      nombre_restaurante: string;
    };
  };
}

/**
 * Interfaz para los datos necesarios al crear un nuevo ítem de pedido
 */
export interface CreatePedidoItemDTO {
  pedido_id: string;
  menu_id: string;
  nombre_menu: string;
  cantidad?: number;
  precio_unitario: number;
  impuesto_unitario?: number;
  total_item?: number;
  notas?: string | null;
  enviado_a_cocina?: boolean;
}

/**
 * Interfaz para los datos que se pueden actualizar en un ítem de pedido
 */
export interface UpdatePedidoItemDTO {
  cantidad?: number;
  precio_unitario?: number;
  impuesto_unitario?: number;
  total_item?: number;
  notas?: string | null;
  enviado_a_cocina?: boolean;
}

/**
 * Interfaz para la respuesta de la API de ítems de pedido
 */
export interface PedidoItemApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
