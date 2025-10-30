import apiClient from '@/plugins/axios';
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  UsuariosInfo,
  RefreshTokenResponse,
} from '@/interfaces/Auth';
import type { AxiosResponse, AxiosRequestConfig } from 'axios';

/**
 * Token key para localStorage
 */
const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';
const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Servicio para gestionar la autenticación de usuarios
 */
export const AuthService = {
  /**
   * Iniciar sesión con email y contraseña
   * @param credentials - Credenciales del usuario (email y contraseña)
   * @returns Promise con la respuesta de autenticación
   */
  login: async (credentials: LoginCredentials): Promise<AxiosResponse<AuthResponse>> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

    // Si el login es exitoso, almacenar el token y datos del usuario
    if (response.data.ok && response.data.session) {
      AuthService.setToken(response.data.session.access_token);
      if (response.data.session.refresh_token) {
        AuthService.setRefreshToken(response.data.session.refresh_token);
      }
      AuthService.setUserData(response.data.user);
    }

    return response;
  },

  /**
   * Registrar un nuevo usuario
   * @param userData - Datos del nuevo usuario
   * @returns Promise con la respuesta del registro
   */
  register: async (userData: RegisterData): Promise<AxiosResponse<AuthResponse>> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData);

    // No almacenamos token después del registro porque generalmente se requiere
    // iniciar sesión explícitamente después
    return response;
  },

  /**
   * Verificar el estado de la sesión actual
   * @returns Promise con la respuesta de la verificación
   */
  checkSession: async (): Promise<AxiosResponse<AuthResponse>> => {
    return await apiClient.get<AuthResponse>('/auth/session');
  },

  /**
   * Renovar el token de autenticación
   * @returns Promise con la respuesta de la renovación
   */
  refreshToken: async (): Promise<AxiosResponse<AuthResponse>> => {
    const refreshToken = AuthService.getRefreshToken();

    if (!refreshToken) {
      console.error('No hay refresh token disponible en localStorage');
      throw new Error('No hay refresh token disponible');
    }

    try {
      const response = await apiClient.post<AuthResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      });

      // Si la renovación es exitosa, actualizar los tokens
      if (response.data.ok && response.data.session) {
        // Guardar el nuevo access token
        if (response.data.session.access_token) {
          AuthService.setToken(response.data.session.access_token);
        } else {
          console.warn('No se recibió access_token en la respuesta');
          throw new Error('No se recibió access_token en la respuesta');
        }

        // Guardar el nuevo refresh token si existe
        if (response.data.session.refresh_token) {
          AuthService.setRefreshToken(response.data.session.refresh_token);
        } else {
          console.warn('No se recibió nuevo refresh_token en la respuesta');
        }

        // Actualizar datos del usuario si existen
        if (response.data.user) {
          AuthService.setUserData(response.data.user);
        }

        return response;
      } else {
        console.warn('La respuesta de renovación no contiene sesión válida');
        throw new Error('La respuesta de renovación no contiene sesión válida');
      }
    } catch (error: unknown) {
      throw error;
    }
  },

  /**
   * Cerrar sesión del usuario actual
   * @returns Promise con la respuesta del cierre de sesión
   */
  logout: async (): Promise<AxiosResponse<AuthResponse>> => {
    let response;

    try {
      response = await apiClient.post<AuthResponse>('/auth/logout');
    } catch (error) {
      console.error('Error al cerrar sesión en el servidor:', error);
      // Si falla el logout en el servidor, continuamos limpiando los datos locales
    } finally {
      // Independientemente de la respuesta del servidor, limpiar el almacenamiento local
      AuthService.removeToken();
      AuthService.removeRefreshToken();
      AuthService.removeUserData();

      // Si no hubo respuesta (por error), creamos una respuesta sintética
      if (!response) {
        return {
          data: {
            ok: true,
            message: 'Sesión cerrada localmente (el servidor no respondió)',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosRequestConfig,
        } as AxiosResponse<AuthResponse>;
      }
    }

    return response;
  },

  /**
   * Almacena el token de autenticación en localStorage
   * @param token - Token de acceso del usuario
   */
  setToken: (token: string): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  /**
   * Obtiene el token de autenticación desde localStorage
   * @returns El token de autenticación o null si no existe
   */
  getToken: (): string | null => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * Elimina el token de autenticación de localStorage
   */
  removeToken: (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  /**
   * Almacena el refresh token en localStorage
   * @param token - Refresh token del usuario
   */
  setRefreshToken: (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  /**
   * Obtiene el refresh token desde localStorage
   * @returns El refresh token o null si no existe
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Elimina el refresh token de localStorage
   */
  removeRefreshToken: (): void => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Almacena los datos del usuario en localStorage
   * @param user - Datos del usuario
   */
  setUserData: (user?: User): void => {
    if (user) {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    }
  },

  /**
   * Obtiene los datos del usuario desde localStorage
   * @returns Los datos del usuario o null si no existen
   */
  getUserData: (): User | null => {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Elimina los datos del usuario de localStorage
   */
  removeUserData: (): void => {
    localStorage.removeItem(USER_DATA_KEY);
  },

  /**
   * Obtiene la información extendida del usuario desde la API
   * @returns Promise con la información extendida del usuario
   */
  getUserInfo: async (): Promise<UsuariosInfo | null> => {
    try {
      const response = await apiClient.get<{ ok: boolean; usuarios_info?: UsuariosInfo }>(
        '/auth/user-info',
      );

      if (response.data.ok && response.data.usuarios_info) {
        return response.data.usuarios_info;
      }

      return null;
    } catch (error) {
      console.error('Error al obtener información del usuario:', error);
      return null;
    }
  },

  /**
   * Verifica si hay un usuario autenticado
   * @returns true si hay un usuario autenticado, false en caso contrario
   */
  isAuthenticated: (): boolean => {
    return !!AuthService.getToken();
  },

  /**
   * Verificar si el refresh token almacenado es válido
   * @returns Promise con la respuesta de la verificación
   */
  checkRefreshToken: async (): Promise<{ valid: boolean; message: string }> => {
    const refreshToken = AuthService.getRefreshToken();

    // Verificar si hay un refresh token almacenado
    if (!refreshToken) {
      return { valid: false, message: 'No hay refresh token almacenado' };
    }

    try {
      const response = await apiClient.post<RefreshTokenResponse>('/auth/check-refresh', {
        refresh_token: refreshToken,
      });

      return {
        valid: response.data.ok,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error al verificar refresh token:', error);
      return { valid: false, message: 'Error al verificar refresh token' };
    }
  },

  /**
   * Actualizar contraseña usando access_token de invitación o recuperación
   * @param password - Nueva contraseña
   * @param accessToken - Token de acceso de la invitación o recuperación
   * @param refreshToken - Token de refresco (opcional)
   * @returns Promise con la respuesta de la actualización
   */
  updatePassword: async (
    password: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<AxiosResponse<AuthResponse>> => {
    return await apiClient.post<AuthResponse>(
      '/auth/update-password',
      { 
        password,
        refresh_token: refreshToken 
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  },
};

export default AuthService;
