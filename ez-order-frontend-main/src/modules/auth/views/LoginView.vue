<template>
  <AuthLayout>
    <div class="bg-white p-8 rounded-xl">
      <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Iniciar sesión</h2>

      <!-- Mostrar mensaje de éxito si existe -->
      <div v-if="successMessage" class="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
        {{ successMessage }}
      </div>

      <!-- Mostrar mensaje de error si existe -->
      <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit">
        <!-- Campo de correo electrónico -->
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1"
            >Correo electrónico</label
          >
          <input
            id="email"
            v-model="email"
            type="email"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6424] focus:border-transparent transition duration-200"
            placeholder="tucorreo@ejemplo.com"
            autocomplete="email"
            required
          />
        </div>

        <!-- Campo de contraseña -->
        <div class="mb-6">
          <div class="flex justify-between mb-1">
            <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
          </div>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6424] focus:border-transparent transition duration-200"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />

            <button
              type="button"
              @click="togglePasswordVisibility"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <span v-if="showPassword">
                <!-- Icono de ocultar -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </span>
              <span v-else>
                <!-- Icono de mostrar -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </span>
            </button>
          </div>
          <RouterLink
            to="/auth/forgot-password"
            class="text-sm text-[#FF6424] hover:text-orange-600 transition duration-200"
          >
            ¿Olvidaste tu contraseña?
          </RouterLink>
        </div>

        <!-- Recordarme -->
        <div class="flex items-center mb-6">
          <input
            id="remember"
            v-model="rememberMe"
            type="checkbox"
            class="h-4 w-4 text-[#FF6424] focus:ring-[#FF6424] border-gray-300 rounded"
          />
          <label for="remember" class="ml-2 block text-sm text-gray-700"> Recordarme </label>
        </div>

        <!-- Botón de inicio de sesión -->
        <button
          type="submit"
          class="w-full bg-[#FF6424] hover:bg-[#e55b20] text-white font-medium py-2.5 px-4 rounded-lg transition duration-200 flex justify-center items-center"
          :disabled="isLoading"
        >
          <svg
            v-if="isLoading"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {{ isLoading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
        </button>
      </form>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AuthLayout from '../layout/AuthLayout.vue';
import { useAuthStore } from '@/stores/auth_store';

// Router
const router = useRouter();
const route = useRoute();

// Store de autenticación
const authStore = useAuthStore();

// Estado del formulario
const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const showPassword = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// Capturar mensaje y email de la URL al montar
onMounted(() => {
  if (route.query.message) {
    successMessage.value = route.query.message as string;
  }
  if (route.query.email) {
    email.value = route.query.email as string;
  }
});

// Obtener estado de carga del store
const isLoading = computed(() => authStore.isLoading);

// Alternar visibilidad de la contraseña
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

// Manejar envío del formulario
const handleSubmit = async () => {
  // Limpiar mensajes anteriores
  errorMessage.value = '';
  successMessage.value = '';

  try {
    // Llamar al método login del store de autenticación
    const result = await authStore.login({
      email: email.value,
      password: password.value,
    });

    // Si el login es exitoso, redirigir al dashboard
    if (result.success) {
      // Si se marca "recordarme", podríamos hacer algo adicional aquí
      // Por ejemplo, configurar un tiempo de expiración más largo

      // Redirigir al dashboard
      router.push('/admin/dashboard');
    } else {
      // Mostrar mensaje de error
      errorMessage.value = result.error || 'Error al iniciar sesión';
    }
  } catch (error) {
    console.error('Error inesperado:', error);
    errorMessage.value = 'Error inesperado al intentar iniciar sesión';
  }
};
</script>
