/**
 * Interfaz para los datos de inicio de sesión
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Interfaz para los datos de registro de usuario
 */
export interface RegisterData extends LoginCredentials {
  name?: string;
  role?: string;
}

/**
 * Interfaz para representar un usuario autenticado
 */
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    role?: string;
  };
  name?: string;
  role?: string;
  aud: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Interfaz para la información extendida del usuario desde usuarios_info
 */
export interface UsuariosInfo {
  id: string;
  created_at: string;
  nombre_usuario?: string;
  rol_id?: number;
  rol_personalizado_id?: number;
  restaurante_id?: string;
  updated_at?: string;
  user_image?: string;
  permisos?: string[];
  rol_nombre?: string;
  es_super_admin?: boolean;
  es_propietario?: boolean;        // Indica si es propietario de al menos un restaurante
  restaurantes?: string[];         // Array de IDs de restaurantes del usuario
}

/**
 * Interfaz para la sesión del usuario
 */
export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: User;
}

/**
 * Interfaz para la respuesta de autenticación
 */
export interface AuthResponse {
  ok: boolean;
  message: string;
  user?: User;
  session?: Session;
  usuarios_info?: UsuariosInfo;
  error?: string;
  code?: string;
}

/**
 * Interfaz para la respuesta de validación de refresh token
 */
export interface RefreshTokenResponse {
  ok: boolean;
  message: string;
  validUntil?: number;
  error?: string;
  code?: string;
}
