import type { Restaurante } from './Restaurante';

export interface Cliente {
  id: number;
  created_at: string;
  restaurante_id: string;
  nombre_cliente: string;
  rtn_cliente?: string | null;
  tel_cliente?: string | null;
  correo_cliente?: string | null;
  restaurantes?: Restaurante;
  direccion_cliente?: string | null;
}

export interface CreateClienteDTO {
  restaurante_id: string;
  nombre_cliente: string;
  rtn_cliente?: string | null;
  tel_cliente?: string | null;
  correo_cliente?: string | null;
  direccion_cliente?: string | null;
}

export interface UpdateClienteDTO {
  restaurante_id?: string;
  nombre_cliente?: string;
  rtn_cliente?: string | null;
  tel_cliente?: string | null;
  correo_cliente?: string | null;
  direccion_cliente?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ClientesApiResponse {
  success: boolean;
  message?: string;
  data: Cliente[];
}

export interface ClienteApiResponse {
  success: boolean;
  message?: string;
  data: Cliente;
}
