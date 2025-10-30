/**
 * Interfaz que representa un método de pago en el sistema
 */
export interface MetodoPago {
  id: number;
  metodo: string;
  descripcion: string | null;
}

/**
 * Interfaz para los datos necesarios al crear un nuevo método de pago
 */
export interface CreateMetodoPagoDTO {
  metodo: string;
  descripcion?: string | null;
}

/**
 * Interfaz para los datos que se pueden actualizar en un método de pago
 */
export interface UpdateMetodoPagoDTO {
  metodo?: string;
  descripcion?: string | null;
}

/**
 * Interfaz para la respuesta de la API de métodos de pago
 */
export interface MetodoPagoApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * Interfaz para la respuesta de la API cuando se obtienen múltiples métodos de pago
 */
export interface MetodosPagoListResponse {
  success: boolean;
  data: MetodoPago[];
}

/**
 * Interfaz para la respuesta de la API cuando se obtiene un método de pago específico
 */
export interface MetodoPagoSingleResponse {
  success: boolean;
  data: MetodoPago;
}

/**
 * Interfaz para la respuesta de la API cuando se crea o actualiza un método de pago
 */
export interface MetodoPagoMutationResponse {
  success: boolean;
  message?: string;
  data: MetodoPago;
}

/**
 * Interfaz para la respuesta de la API cuando se elimina un método de pago
 */
export interface MetodoPagoDeleteResponse {
  success: boolean;
  message?: string;
}
