import axios from 'axios';
import AuthService from '@/services/auth_service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Crear instancia personalizada de Axios
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para agregar el token de autenticación a las solicitudes
apiClient.interceptors.request.use(
  (config) => {
    // Solo agregar el token si no hay uno ya establecido en los headers
    if (!config.headers['Authorization']) {
      const token = AuthService.getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para manejar respuestas y errores
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Verificar si es un error 401 y no es una petición de refresh token o login
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      AuthService.getRefreshToken()
    ) {
      originalRequest._retry = true;

      try {
        const res = await AuthService.refreshToken();

        const newAccessToken = res.data.session?.access_token;
        if (!newAccessToken) {
          console.error('No se recibió nuevo access token');
          throw new Error('No se recibió nuevo access token');
        }

        // Actualizar tokens usando el servicio de autenticación
        AuthService.setToken(newAccessToken);
        if (res.data.session?.refresh_token) {
          AuthService.setRefreshToken(res.data.session.refresh_token);
        }

        // Actualizar headers
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError: unknown) {
        console.error('Error al renovar token:', refreshError);

        // Solo limpiar datos si el error es específicamente de autenticación
        const error = refreshError as { response?: { status: number } };
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('Error de autenticación, limpiando datos de sesión...');
          AuthService.removeToken();
          AuthService.removeRefreshToken();
          AuthService.removeUserData();
          window.location.href = '/auth/login';
        }

        return Promise.reject(refreshError);
      }
    }

    // Para otros tipos de errores, no limpiamos los datos
    return Promise.reject(error);
  },
);

// Funciones de ayuda para operaciones comunes
export const api = {
  // Operaciones genéricas
  get: (url: string, params = {}) => apiClient.get(url, { params }),
  post: (url: string, data = {}) => apiClient.post(url, data),
  put: (url: string, data = {}) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url),
};

// Exportar la instancia de Axios configurada
export default apiClient;
