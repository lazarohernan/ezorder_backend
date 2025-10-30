/**
 * Interfaz que representa la información de usuario en la tabla usuarios_info
 */
export interface UsuarioInfo {
  id: string;
  created_at: string;
  nombre_usuario: string | null;
  rol_id: number | null;
  restaurante_id: string | null;
  updated_at: string | null;
  // Propiedades relacionales que se obtienen con joins
  restaurantes?: {
    id: string;
    nombre_restaurante: string;
  } | null;
  rol?: {
    id: number;
    rol: string;
  } | null;
  user_image?: string | null;
}

/**
 * Interfaz que representa un usuario autenticado en Supabase auth.users
 */
export interface AuthUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed_at: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

/**
 * Interfaz que combina la información de auth.users con usuarios_info
 */
export interface UsuarioWithInfo extends AuthUser {
  user_info: UsuarioInfo | null;
}

/**
 * DTO para crear información de usuario
 */
export interface CreateUsuarioInfoDTO {
  id: string;
  nombre_usuario?: string | null;
  rol_id?: number | null;
  restaurante_id?: string | null;
  user_image?: string | null;
}

/**
 * DTO para actualizar información de usuario
 */
export interface UpdateUsuarioInfoDTO {
  nombre_usuario?: string | null;
  rol_id?: number | null;
  restaurante_id?: string | null;
  user_image?: string | null;
}

/**
 * Tipo para respuestas del API
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
