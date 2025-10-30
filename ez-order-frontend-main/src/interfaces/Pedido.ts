import type { Cliente } from './Cliente';
import type { UsuarioInfo } from './Usuario';
import type { Restaurante } from './Restaurante';

/**
 * Tipos de pedido disponibles
 */
export type TipoPedido = 'local' | 'domicilio' | 'recoger' | 'mesa';

/**
 * Estados posibles de un pedido (según ENUM en Supabase)
 */
export type EstadoPedido =
  | 'pendiente'
  | 'confirmado'
  | 'en preparacion'
  | 'listo'
  | 'entregado'
  | 'cancelado';

/**
 * Interfaz que representa un pedido en el sistema
 */
export interface Pedido {
  id: string;
  created_at: string;
  restaurante_id: string;
  cliente_id: number | null;
  usuario_id: string | null;
  mesa: string | null;
  tipo_pedido: TipoPedido;
  estado_pedido: EstadoPedido;
  notas: string | null;
  total: number;
  subtotal: number;
  impuesto: number;
  descuento: number;
  metodo_pago_id: number;
  pagado: boolean;
  fecha_entrega: string | null;
  direccion_entrega: string | null;
  importe_gravado: number | null;
  importe_exento: number | null;
  importe_exonerado: number | null;

  // Relaciones
  clientes?: Cliente;
  usuarios_info?: UsuarioInfo;
  restaurantes?: Restaurante;
}

/**
 * Interfaz para los datos necesarios al crear un nuevo pedido
 */
export interface CreatePedidoDTO {
  restaurante_id: string;
  cliente_id?: number | null;
  usuario_id?: string | null;
  mesa?: string | null;
  tipo_pedido: TipoPedido;
  estado_pedido: EstadoPedido;
  notas?: string | null;
  total?: number;
  subtotal?: number;
  impuesto?: number;
  descuento?: number;
  metodo_pago_id: number;
  pagado?: boolean;
  fecha_entrega?: string | null;
  direccion_entrega?: string | null;
  importe_gravado?: number | null;
  importe_exento?: number | null;
  importe_exonerado?: number | null;
}

/**
 * Interfaz para los datos que se pueden actualizar en un pedido
 */
export interface UpdatePedidoDTO {
  restaurante_id?: string;
  cliente_id?: number | null;
  usuario_id?: string | null;
  mesa?: string | null;
  tipo_pedido: TipoPedido;
  estado_pedido: EstadoPedido;
  notas?: string | null;
  total?: number;
  subtotal?: number;
  impuesto?: number;
  descuento?: number;
  metodo_pago_id?: number;
  pagado?: boolean;
  fecha_entrega?: string | null;
  direccion_entrega?: string | null;
  importe_gravado?: number | null;
  importe_exento?: number | null;
  importe_exonerado?: number | null;
}

/**
 * Interfaz para la respuesta de la API de pedidos
 */
export interface PedidoApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
