/**
 * Interfaz que representa la estructura de un restaurante en la base de datos
 */
export interface Restaurante {
  id?: string; // UUID generado por Supabase
  created_at?: string; // Fecha de creación generada por Supabase
  nombre_restaurante: string; // Nombre del restaurante (obligatorio)
  direccion_restaurante?: string | null; // Dirección del restaurante (opcional)
  logo_restaurante?: string | null; // URL del logo del restaurante (opcional)
}

/**
 * Interfaz para crear un nuevo restaurante
 * Omite los campos que son generados automáticamente por la base de datos
 */
export interface CreateRestauranteDTO {
  nombre_restaurante: string;
  direccion_restaurante?: string | null;
  logo_restaurante?: string | null;
}

/**
 * Interfaz para actualizar un restaurante existente
 * Todos los campos son opcionales
 */
export interface UpdateRestauranteDTO {
  nombre_restaurante?: string;
  direccion_restaurante?: string | null;
  logo_restaurante?: string | null;
}

/**
 * Respuesta genérica de la API
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
