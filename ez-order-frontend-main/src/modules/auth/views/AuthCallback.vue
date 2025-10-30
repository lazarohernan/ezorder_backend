<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
    <div class="bg-white rounded-2xl p-8 max-w-md w-full">
      <!-- Loading State -->
      <div v-if="loading" class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">Procesando invitación...</h2>
        <p class="text-gray-600">Por favor espera un momento</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center">
        <div class="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">Error al procesar invitación</h2>
        <p class="text-gray-600 mb-6">{{ error }}</p>
        <button
          @click="goToLogin"
          class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Ir al inicio de sesión
        </button>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="text-center">
        <div class="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">¡Bienvenido a EZ Order!</h2>
        <p class="text-gray-600 mb-6">Tu cuenta ha sido activada exitosamente. Ahora puedes establecer tu contraseña.</p>
        
        <!-- Password Form -->
        <form @submit.prevent="setPassword" class="space-y-4">
          <div class="text-left">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Nueva Contraseña</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="6"
                class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <span v-if="showPassword">
                  <!-- Icono de ocultar -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                </span>
                <span v-else>
                  <!-- Icono de mostrar -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </span>
              </button>
            </div>
            <div class="mt-2 text-xs text-gray-600 space-y-1">
              <p class="font-medium">La contraseña debe contener:</p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li :class="password.length >= 6 ? 'text-green-600' : 'text-gray-500'">
                  Mínimo 6 caracteres
                </li>
                <li :class="/(?=.*[a-z])/.test(password) ? 'text-green-600' : 'text-gray-500'">
                  Al menos una letra minúscula
                </li>
                <li :class="/(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-gray-500'">
                  Al menos una letra mayúscula
                </li>
              </ul>
            </div>
          </div>
          <div class="text-left">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Confirmar Contraseña</label>
            <div class="relative">
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                minlength="6"
                class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Repite tu contraseña"
              />
              <button
                type="button"
                @click="toggleConfirmPasswordVisibility"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <span v-if="showConfirmPassword">
                  <!-- Icono de ocultar -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                </span>
                <span v-else>
                  <!-- Icono de mostrar -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
          <p v-if="passwordError" class="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">{{ passwordError }}</p>
          <button
            type="submit"
            :disabled="settingPassword"
            class="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {{ settingPassword ? 'Estableciendo...' : 'Establecer Contraseña' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AuthService from '@/services/auth_service';
import { useAuthStore } from '@/stores/auth_store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref('');
const success = ref(false);
const password = ref('');
const confirmPassword = ref('');
const passwordError = ref('');
const settingPassword = ref(false);
const accessToken = ref('');
const refreshToken = ref('');
const inviteType = ref<string>('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);

onMounted(async () => {
  try {
    // Función para parsear parámetros del hash fragment
    const parseHashParams = (): Record<string, string> => {
      const hash = window.location.hash.substring(1); // Remover el #
      const params: Record<string, string> = {};
      
      if (!hash) return params;
      
      hash.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
      
      return params;
    };

    // Obtener parámetros del hash fragment (OAuth2) o query string (fallback)
    const hashParams = parseHashParams();
    const type = (hashParams.type || route.query.type) as string;
    const access_token = (hashParams.access_token || route.query.access_token) as string;
    const refresh_token = (hashParams.refresh_token || route.query.refresh_token) as string;
    const error_code = (hashParams.error_code || route.query.error_code) as string;
    const error_description = (hashParams.error_description || route.query.error_description) as string;

    // Log para debugging
    console.log('Callback params:', {
      type,
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      error_code,
      error_description,
      hashParams,
      queryParams: route.query
    });

    // Limpiar el hash de la URL por seguridad (los tokens no deben quedar visibles)
    if (window.location.hash) {
      // Usar replaceState para no agregar una entrada al historial
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Si hay un error en la URL
    if (error_code || error_description) {
      error.value = error_description || 'Ocurrió un error en la autenticación';
      loading.value = false;
      return;
    }

    // Si no hay parámetros relevantes, mostrar error con recomendación
    if (!type && !access_token && !error_code) {
      error.value = 'No se recibieron parámetros de autenticación. El enlace puede estar incompleto o corrupto. Por favor, verifica que hayas copiado el enlace completo del correo o solicita un nuevo enlace.';
      loading.value = false;
      return;
    }

    // Manejar diferentes tipos de callback
    switch (type) {
      case 'invite':
      case 'signup':
        // Invitación de usuario o registro
        if (access_token) {
          accessToken.value = access_token;
          refreshToken.value = refresh_token || '';
          inviteType.value = type;
          success.value = true;
          loading.value = false;
        } else {
          error.value = 'Enlace de invitación inválido o expirado. Por favor, solicita una nueva invitación.';
          loading.value = false;
        }
        break;

      case 'recovery':
        // Recuperación de contraseña
        if (access_token) {
          accessToken.value = access_token;
          refreshToken.value = refresh_token || '';
          inviteType.value = type;
          success.value = true;
          loading.value = false;
        } else {
          error.value = 'Enlace de recuperación inválido o expirado. Estos enlaces solo son válidos por 1 hora. Por favor, solicita uno nuevo.';
          loading.value = false;
        }
        break;

      case 'magiclink':
        // Enlace mágico de inicio de sesión
        if (access_token && refresh_token) {
          // Guardar tokens y redirigir al dashboard
          AuthService.setToken(access_token);
          AuthService.setRefreshToken(refresh_token);
          await authStore.checkSession();
          await router.push({ 
            name: 'dashboard',
            query: { message: '¡Bienvenido de nuevo!' }
          });
        } else {
          error.value = 'Enlace de inicio de sesión inválido o expirado. Por favor, solicita uno nuevo.';
          loading.value = false;
        }
        break;

      case 'email_change':
        // Cambio de correo electrónico
        if (access_token) {
          AuthService.setToken(access_token);
          await authStore.checkSession();
          await router.push({ 
            name: 'dashboard',
            query: { message: 'Tu correo electrónico ha sido actualizado exitosamente' }
          });
        } else {
          error.value = 'Enlace de cambio de correo inválido o expirado. Por favor, intenta el proceso nuevamente.';
          loading.value = false;
        }
        break;

      default:
        // Si hay token pero no tipo específico, intentar procesar como invitación
        if (access_token) {
          console.log('Token recibido sin tipo específico, procesando como invitación');
          accessToken.value = access_token;
          refreshToken.value = refresh_token || '';
          inviteType.value = 'invite';
          success.value = true;
          loading.value = false;
        } else {
          // Si no hay tipo reconocido ni token, mostrar error detallado
          error.value = 'El enlace no contiene información válida. Esto puede ocurrir si:\n- El enlace está incompleto\n- El enlace ha expirado\n- El enlace ya fue utilizado\n\nPor favor, solicita un nuevo enlace.';
          loading.value = false;
        }
        break;
    }
  } catch (err) {
    console.error('Error en callback:', err);
    error.value = 'Ocurrió un error al procesar la autenticación';
    loading.value = false;
  }
});

const setPassword = async () => {
  passwordError.value = '';

  // Validaciones
  if (password.value !== confirmPassword.value) {
    passwordError.value = 'Las contraseñas no coinciden';
    return;
  }

  if (password.value.length < 6) {
    passwordError.value = 'La contraseña debe tener al menos 6 caracteres';
    return;
  }

  if (!/(?=.*[a-z])/.test(password.value)) {
    passwordError.value = 'La contraseña debe contener al menos una letra minúscula';
    return;
  }

  if (!/(?=.*[A-Z])/.test(password.value)) {
    passwordError.value = 'La contraseña debe contener al menos una letra mayúscula';
    return;
  }

  try {
    settingPassword.value = true;

    console.log('=== ENVIANDO REQUEST ===');
    console.log('Password length:', password.value.length);
    console.log('Access Token length:', accessToken.value.length);
    console.log('Refresh Token length:', refreshToken.value.length);
    console.log('Access Token preview:', accessToken.value.substring(0, 30) + '...');

    // Llamar al backend para actualizar la contraseña usando el access_token y refresh_token
    const response = await AuthService.updatePassword(password.value, accessToken.value, refreshToken.value);
    
    console.log('Response:', response.data);

    if (response.data.ok) {
      // Contraseña establecida exitosamente
      // Redirigir al login para que ingrese manualmente
      const email = response.data.user?.email;
      
      await router.push({ 
        name: 'login',
        query: { 
          message: '¡Contraseña establecida exitosamente! Ahora puedes iniciar sesión.',
          email: email || undefined
        }
      });
    } else {
      passwordError.value = response.data.message || 'Error al establecer la contraseña';
    }
  } catch (err: unknown) {
    console.error('❌ Error al establecer contraseña:', err);
    
    // Manejo de errores específicos con type narrowing
    const error = err as { response?: { status?: number; data?: { message?: string; error?: string } }; code?: string; message?: string };
    
    console.error('Error status:', error.response?.status);
    console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error completo:', JSON.stringify(error, null, 2));
    
    if (error.response?.status === 401) {
      const errorMsg = error.response.data?.error || error.response.data?.message;
      passwordError.value = `El enlace ha expirado o es inválido. ${errorMsg ? `Detalle: ${errorMsg}` : 'Por favor, solicita uno nuevo.'}`;
    } else if (error.response?.status === 400) {
      const errorMsg = error.response.data?.error || error.response.data?.message;
      passwordError.value = errorMsg || 'Los datos proporcionados no son válidos.';
    } else if (error.response?.status === 422) {
      passwordError.value = 'La contraseña no cumple con los requisitos de seguridad.';
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      passwordError.value = 'La solicitud tardó demasiado. Por favor, verifica tu conexión e intenta nuevamente.';
    } else if (!navigator.onLine) {
      passwordError.value = 'No hay conexión a internet. Por favor, verifica tu conexión.';
    } else {
      passwordError.value = 'Ocurrió un error inesperado. Por favor intenta nuevamente o solicita un nuevo enlace.';
    }
  } finally {
    settingPassword.value = false;
  }
};

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const toggleConfirmPasswordVisibility = () => {
  showConfirmPassword.value = !showConfirmPassword.value;
};

const goToLogin = () => {
  router.push({ name: 'login' });
};
</script>
