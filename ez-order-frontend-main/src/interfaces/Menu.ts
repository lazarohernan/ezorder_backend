import type { Restaurante } from './Restaurante';

/**
 * Interfaz que representa un menú en el sistema
 */
export interface Menu {
  id: string;
  created_at: string;
  restaurante_id: string;
  categoria_id?: string;
  num_menu?: string;
  nombre: string;
  descripcion?: string;
  otra_info?: string;
  precio?: number;
  imagen?: string;
  porcentaje_impuesto?: number;
  es_para_cocina?: boolean;
  activo: boolean;
  es_exento: boolean;
  es_exonerado: boolean;
  restaurantes?: Restaurante;
}

/**
 * Interfaz para los datos necesarios al crear un nuevo menú
 */
export interface CreateMenuDTO {
  restaurante_id: string;
  categoria_id?: string;
  num_menu?: string;
  nombre: string;
  descripcion?: string;
  otra_info?: string;
  precio?: number;
  imagen?: string;
  porcentaje_impuesto?: number;
  es_para_cocina?: boolean;
  activo?: boolean;
  es_exento?: boolean;
  es_exonerado?: boolean;
}

/**
 * Interfaz para los datos que se pueden actualizar en un menú
 */
export interface UpdateMenuDTO {
  restaurante_id?: string;
  categoria_id?: string;
  num_menu?: string;
  nombre?: string;
  descripcion?: string;
  otra_info?: string;
  precio?: number;
  imagen?: string;
  porcentaje_impuesto?: number;
  es_para_cocina?: boolean;
  activo?: boolean;
  es_exento?: boolean;
  es_exonerado?: boolean;
}

/**
 * Interfaz para la respuesta de la API
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
