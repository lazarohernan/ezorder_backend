import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import AuthService from '@/services/auth_service';
import type { LoginCredentials, RegisterData, User, UsuariosInfo } from '@/interfaces/Auth';
import type { AxiosError } from 'axios';

interface ErrorResponse {
  message?: string;
}

// Interfaz para el payload del JWT
interface JwtPayload {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export const useAuthStore = defineStore('auth', () => {
  // Estado
  const user = ref<User | null>(null);
  const userInfo = ref<UsuariosInfo | undefined>(undefined);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isInitialized = ref(false);
  let tokenRefreshTimer: number | null = null;

  // Getters
  const isAuthenticated = computed(() => !!user.value);

  const userRole = computed(() => user.value?.user_metadata?.role || 'guest');

  const userName = computed(
    () => user.value?.user_metadata?.name || user.value?.email || 'Usuario',
  );

  // Utilidades privadas para manejo de tokens
  const parseJwt = (token: string): JwtPayload | null => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error al decodificar el token JWT:', e);
      return null;
    }
  };

  const getTokenExpirationTime = (token: string): number | null => {
    const decoded = parseJwt(token);
    if (!decoded || !decoded.exp) return null;
    return decoded.exp * 1000; // Convertir a milisegundos
  };

  const scheduleTokenRefresh = (token: string) => {
    // Limpiar temporizador existente si hay uno
    if (tokenRefreshTimer) {
      window.clearTimeout(tokenRefreshTimer);
      tokenRefreshTimer = null;
    }

    const expirationTime = getTokenExpirationTime(token);
    if (!expirationTime) {
      console.warn('No se pudo determinar la expiración del token');
      return;
    }

    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;

    // Programar renovación 5 minutos antes de la expiración
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0);

    if (refreshTime <= 0) {
      // Si el token ya está por expirar, renovarlo inmediatamente
      refreshAuthToken();
      return;
    }

    // Configurar temporizador para renovar el token
    tokenRefreshTimer = window.setTimeout(async () => {
      await refreshAuthToken();
    }, refreshTime);
  };

  const refreshAuthToken = async () => {
    try {
      const response = await AuthService.refreshToken();

      if (response.data.ok && response.data.session?.access_token) {
        // Programar la próxima renovación
        scheduleTokenRefresh(response.data.session.access_token);
        return true;
      } else {
        console.warn('No se pudo renovar el token');
        return false;
      }
    } catch (err) {
      // No es crítico si falla el refresh, continuar con getUserInfo
      console.warn('Error al renovar el token (continuando con getUserInfo):', err);
      return false;
    }
  };

  // Acciones
  const logout = async () => {
    isLoading.value = true;

    // Limpiar temporizador de renovación de token
    if (tokenRefreshTimer) {
      window.clearTimeout(tokenRefreshTimer);
      tokenRefreshTimer = null;
    }

    try {
      await AuthService.logout();
    } catch (err) {
      console.error('Error al cerrar sesión en el servidor', err);
    } finally {
      // Incluso si hay error, limpiar los datos locales
      user.value = null;
      userInfo.value = undefined;
      isLoading.value = false;
    }
  };

  const checkSession = async () => {
    isLoading.value = true;

    try {
      // Primero verificamos si hay token en localStorage
      const token = AuthService.getToken();
      if (!token) {
        user.value = null;
        return { success: false };
      }

      // Programar renovación automática si el token es válido
      scheduleTokenRefresh(token);

      const response = await AuthService.checkSession();

      if (response.data.ok && response.data.session?.user) {
        // Actualizar el usuario con los datos de la sesión
        user.value = response.data.session.user;

        // Asegurarse de que los datos en localStorage estén actualizados
        AuthService.setUserData(response.data.session.user);

        return { success: true };
      } else {
        // Si la sesión no es válida, limpiar datos
        console.log('Sesión inválida. Cerrando sesión...');
        await logout();
        return { success: false };
      }
    } catch (err) {
      console.error('Error al verificar la sesión:', err);
      // En caso de error, asumir que la sesión no es válida
      await logout();
      return { success: false };
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await AuthService.login(credentials);

      if (response.data.ok && response.data.user) {
        user.value = response.data.user;
        userInfo.value = response.data.usuarios_info;

        // Si no se obtuvo userInfo del login, intentar obtenerla por separado
        if (!userInfo.value) {
          try {
            const fetchedUserInfo = await AuthService.getUserInfo();
            userInfo.value = fetchedUserInfo || undefined;
          } catch (error) {
            console.warn('Error al obtener información extendida del usuario después del login:', error);
            userInfo.value = undefined;
          }
        }

        // Programar renovación automática del token
        if (response.data.session?.access_token) {
          scheduleTokenRefresh(response.data.session.access_token);
        }

        return { success: true };
      } else {
        error.value = response.data.message || 'Error al iniciar sesión';
        return { success: false, error: error.value };
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ErrorResponse>;
      error.value = axiosError.response?.data?.message || 'Error al conectar con el servidor';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (userData: RegisterData) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await AuthService.register(userData);

      if (response.data.ok) {
        return { success: true };
      } else {
        error.value = response.data.message || 'Error al registrar usuario';
        return { success: false, error: error.value };
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ErrorResponse>;
      error.value = axiosError.response?.data?.message || 'Error al conectar con el servidor';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };

  const verifyRefreshToken = async () => {
    try {
      const result = await AuthService.checkRefreshToken();
      console.log('Verificación de refresh token:', result);
      return result;
    } catch (err) {
      console.error('Error al verificar refresh token:', err);
      return { valid: false, message: 'Error al verificar refresh token' };
    }
  };

  // Inicializar el store con los datos guardados en localStorage
  const initializeStore = async () => {
    // Primero cargar los datos locales para evitar un flash de contenido no autenticado
    const savedUser = AuthService.getUserData();
    const savedToken = AuthService.getToken();

    if (savedUser && savedToken) {
      user.value = savedUser;

      // Obtener información extendida del usuario desde la API
      try {
        const fetchedUserInfo = await AuthService.getUserInfo();
        userInfo.value = fetchedUserInfo || undefined;
      } catch (error) {
        console.warn('Error al obtener información extendida del usuario:', error);
        userInfo.value = undefined;
      }
    }

    // Solo verificar la sesión si tenemos un token
    if (savedToken) {
      try {
        const response = await AuthService.checkSession();

        if (response.data.ok && response.data.session?.user) {
          user.value = response.data.session.user;
          AuthService.setUserData(response.data.session.user);

          // Si no tenemos userInfo cargada, obtenerla desde la API
          if (!userInfo.value) {
            try {
              const fetchedUserInfo = await AuthService.getUserInfo();
              userInfo.value = fetchedUserInfo || undefined;
            } catch (error) {
              console.warn('Error al obtener información extendida del usuario:', error);
              userInfo.value = undefined;
            }
          }

          // Programar renovación automática si hay token
          if (response.data.session?.access_token) {
            scheduleTokenRefresh(response.data.session.access_token);
          }
        } else {
          console.log('Sesión inválida en el servidor');
          // No limpiamos los datos aquí, dejamos que el interceptor maneje los errores 401
        }
      } catch (error) {
        console.error('Error al verificar sesión:', error);
        // No limpiamos los datos aquí, dejamos que el interceptor maneje los errores
      }
    } else {
      console.log('No hay token guardado, usuario no autenticado');
    }

    isInitialized.value = true;
  };

  // Refrescar información del usuario (útil después de actualizar roles/permisos)
  const refreshUserInfo = async () => {
    try {
      // Primero refrescar el token para obtener los nuevos permisos del JWT si están disponibles
      await refreshAuthToken();
      
      // Luego obtener la información actualizada del usuario desde la API
      const fetchedUserInfo = await AuthService.getUserInfo();
      if (fetchedUserInfo) {
        userInfo.value = fetchedUserInfo;
        return { success: true };
      } else {
        console.warn('No se pudo obtener información actualizada del usuario');
        return { success: false, error: 'No se pudo obtener información del usuario' };
      }
    } catch (error) {
      console.error('Error al refrescar información del usuario:', error);
      return { success: false, error: 'Error al refrescar información del usuario' };
    }
  };

  // Limpiar temporizador al desmontar el store
  const cleanup = () => {
    if (tokenRefreshTimer) {
      window.clearTimeout(tokenRefreshTimer);
      tokenRefreshTimer = null;
    }
  };

  // Llamar a initializeStore al crear el store
  initializeStore();

  // Exponer el estado, getters y acciones
  return {
    user,
    userInfo,
    isLoading,
    error,
    isInitialized,
    isAuthenticated,
    userRole,
    userName,
    login,
    register,
    checkSession,
    logout,
    verifyRefreshToken,
    refreshAuthToken,
    refreshUserInfo,
    cleanup,
  };
});
