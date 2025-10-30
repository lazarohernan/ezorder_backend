<template>
  <div class="p-6">
    <!-- Encabezado con título y botón para agregar -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Restaurantes</h1>
        <p class="text-gray-600 mt-1">Gestiona los restaurantes de tu plataforma</p>
      </div>
      <button
        @click="openModal('create')"
        class="mt-4 md:mt-0 flex items-center px-4 py-2 bg-[#FF6424] text-white rounded-lg hover:bg-[#e55b20] transition-colors duration-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clip-rule="evenodd"
          />
        </svg>
        Agregar Restaurante
      </button>
    </div>

    <!-- Estado de carga y errores -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6424]"></div>
    </div>

    <div
      v-else-if="error"
      class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded"
    >
      <p>{{ error }}</p>
      <button @click="loadRestaurantes" class="text-red-700 underline mt-2">Reintentar</button>
    </div>

    <!-- Mensaje si no hay restaurantes -->
    <div
      v-else-if="restaurantes.length === 0"
      class="bg-gray-50 p-8 text-center rounded-lg shadow-sm"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-16 w-16 mx-auto text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
      <h2 class="mt-4 text-xl font-medium text-gray-700">No hay restaurantes registrados</h2>
      <p class="mt-2 text-gray-500">
        Comienza a agregar restaurantes para gestionar tu plataforma.
      </p>
      <button
        @click="openModal('create')"
        class="mt-4 px-4 py-2 bg-[#FF6424] text-white rounded-lg hover:bg-[#e55b20] transition-colors duration-200"
      >
        Agregar mi primer restaurante
      </button>
    </div>

    <!-- Grid de restaurantes -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <!-- Card para cada restaurante -->
      <div
        v-for="restaurante in restaurantes"
        :key="restaurante.id"
        class="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200"
      >
        <!-- Imagen/Logo del restaurante -->
        <div class="h-48 bg-gray-200 overflow-hidden relative">
          <img
            v-if="restaurante.logo_restaurante"
            :src="restaurante.logo_restaurante"
            :alt="restaurante.nombre_restaurante"
            class="w-full h-full object-cover"
          />
          <div v-else class="h-full flex items-center justify-center bg-gray-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>

          <!-- Menú acciones contextual -->
          <div class="absolute top-2 right-2">
            <button
              @click="toggleMenu(restaurante.id!)"
              class="bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-gray-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
                />
              </svg>
            </button>
            <div
              v-if="activeMenu === restaurante.id"
              class="absolute top-10 right-0 bg-white rounded-lg shadow-lg py-2 w-48 z-10"
            >
              <button
                @click="viewDetails(restaurante)"
                class="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-2 text-blue-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fill-rule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                Ver detalles
              </button>
              <button
                @click="openModal('edit', restaurante)"
                class="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-2 text-yellow-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                  />
                </svg>
                Editar
              </button>
              <button
                @click="confirmDelete(restaurante)"
                class="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center text-red-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-2 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <!-- Información del restaurante -->
        <div class="p-4">
          <h3 class="text-lg font-semibold text-gray-800 truncate">
            {{ restaurante.nombre_restaurante }}
          </h3>
          <p v-if="restaurante.direccion_restaurante" class="text-gray-600 mt-1 text-sm">
            {{ restaurante.direccion_restaurante }}
          </p>
          <p v-else class="text-gray-400 mt-1 text-sm italic">Sin dirección registrada</p>

          <!-- Fecha de creación -->
          <div class="mt-4 flex items-center text-xs text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {{ formatDate(restaurante.created_at) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para crear/editar restaurante -->
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Overlay de fondo -->
        <div class="fixed inset-0 transition-opacity" @click="closeModal">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <!-- Modal -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[60]"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900">
                  {{ modalMode === 'create' ? 'Agregar nuevo restaurante' : 'Editar restaurante' }}
                </h3>

                <!-- Formulario -->
                <form @submit.prevent="submitForm" class="mt-4">
                  <!-- Nombre del restaurante -->
                  <div class="mb-4">
                    <label for="nombre" class="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del restaurante <span class="text-red-500">*</span>
                    </label>
                    <input
                      id="nombre"
                      v-model="formData.nombre_restaurante"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF6424] focus:border-[#FF6424]"
                      placeholder="Ej: Restaurante El Buen Sabor"
                    />
                  </div>

                  <!-- Dirección -->
                  <div class="mb-4">
                    <label for="direccion" class="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <textarea
                      id="direccion"
                      v-model="formData.direccion_restaurante"
                      rows="2"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF6424] focus:border-[#FF6424]"
                      placeholder="Ej: Av. Principal #123, Colonia Centro"
                    ></textarea>
                  </div>

                  <!-- URL del logo -->
                  <div class="mb-4">
                    <label for="logo" class="block text-sm font-medium text-gray-700 mb-1">
                      Logo del restaurante
                    </label>
                    <div class="flex flex-col space-y-3">
                      <!-- Selector de archivo -->
                      <input
                        id="logoFile"
                        type="file"
                        ref="logoFileInput"
                        @change="handleLogoChange"
                        accept="image/*"
                        class="hidden"
                      />
                      <div class="flex items-center">
                        <button
                          type="button"
                          @click="triggerFileInput"
                          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none"
                        >
                          Seleccionar imagen
                        </button>
                        <span v-if="logoFile" class="ml-3 text-sm text-gray-600">
                          {{ logoFile.name }}
                        </span>
                      </div>

                      <!-- Vista previa de la imagen seleccionada -->
                      <div v-if="logoPreview || formData.logo_restaurante" class="mt-2">
                        <img
                          :src="logoPreview || formData.logo_restaurante || ''"
                          alt="Vista previa del logo"
                          class="max-h-40 rounded-md shadow-sm border border-gray-200"
                        />
                      </div>

                      <!-- Mostrar URL si ya existe -->
                      <div
                        v-if="formData.logo_restaurante && !logoPreview"
                        class="mt-1 text-xs text-gray-500"
                      >
                        URL actual: {{ formData.logo_restaurante }}
                      </div>
                    </div>
                  </div>

                  <!-- Error del formulario si existe -->
                  <div v-if="formError" class="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {{ formError }}
                  </div>
                </form>
              </div>
            </div>
          </div>

          <!-- Botones del modal -->
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="submitForm"
              :disabled="formLoading"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#FF6424] text-base font-medium text-white hover:bg-[#e55b20] focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              <svg
                v-if="formLoading"
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
              {{ modalMode === 'create' ? 'Crear restaurante' : 'Guardar cambios' }}
            </button>
            <button
              @click="closeModal"
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para eliminar -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity" @click="showDeleteConfirm = false">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <!-- Modal de confirmación -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[60]"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
              >
                <svg
                  class="h-6 w-6 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Eliminar restaurante</h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    ¿Estás seguro que deseas eliminar este restaurante? Esta acción no se puede
                    deshacer.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="deleteRestaurante"
              :disabled="deleteLoading"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              <svg
                v-if="deleteLoading"
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
              Eliminar
            </button>
            <button
              @click="showDeleteConfirm = false"
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para ver detalles del restaurante -->
    <div v-if="showDetails" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity" @click="showDetails = false">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <!-- Modal de detalles -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[60]"
        >
          <div v-if="selectedRestaurante" class="bg-white">
            <!-- Imagen/Logo -->
            <div class="h-56 bg-gray-200">
              <img
                v-if="selectedRestaurante.logo_restaurante"
                :src="selectedRestaurante.logo_restaurante"
                :alt="selectedRestaurante.nombre_restaurante"
                class="w-full h-full object-cover"
              />
              <div v-else class="h-full flex items-center justify-center bg-gray-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-16 w-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            </div>

            <!-- Información detallada -->
            <div class="p-6">
              <h3 class="text-xl font-bold text-gray-800">
                {{ selectedRestaurante.nombre_restaurante }}
              </h3>

              <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-500">Dirección</h4>
                <p class="mt-1">
                  {{ selectedRestaurante.direccion_restaurante || 'No especificada' }}
                </p>
              </div>

              <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-500">Fecha de creación</h4>
                <p class="mt-1">{{ formatDate(selectedRestaurante.created_at) }}</p>
              </div>

              <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-500">ID</h4>
                <p class="mt-1 text-xs font-mono bg-gray-100 p-2 rounded">
                  {{ selectedRestaurante.id }}
                </p>
              </div>
            </div>

            <!-- Botones de acción -->
            <div class="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
              <button
                @click="openModal('edit', selectedRestaurante)"
                class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#FF6424] text-base font-medium text-white hover:bg-[#e55b20] focus:outline-none sm:w-auto sm:text-sm mr-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                  />
                </svg>
                Editar
              </button>
              <button
                @click="showDetails = false"
                type="button"
                class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth_store';
import type {
  Restaurante,
  CreateRestauranteDTO,
  UpdateRestauranteDTO,
} from '@/interfaces/Restaurante';
import RestaurantesService from '@/services/restaurantes_service';
import UploadService from '@/services/upload_service';

// Interface for form data that includes ID for edit mode
interface RestauranteFormData extends CreateRestauranteDTO {
  id?: string;
}

// Auth store para verificar autenticación
const authStore = useAuthStore();

// Estado para la lista de restaurantes
const restaurantes = ref<Restaurante[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Estado para los menús contextuales de las cards
const activeMenu = ref<string | null>(null);

// Estado para modales
const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const formData = ref<RestauranteFormData>({
  nombre_restaurante: '',
  direccion_restaurante: '',
  logo_restaurante: '',
});
const formLoading = ref(false);
const formError = ref<string | null>(null);

// Estado para confirmación de eliminación
const showDeleteConfirm = ref(false);
const restauranteToDelete = ref<Restaurante | null>(null);
const deleteLoading = ref(false);

// Estado para vista de detalles
const showDetails = ref(false);
const selectedRestaurante = ref<Restaurante | null>(null);

// Añade estas variables y funciones en <script setup>
const logoFile = ref<File | null>(null);
const logoPreview = ref<string | null>(null);
const logoFileInput = ref<HTMLInputElement | null>(null);

// Cargar restaurantes al montar el componente
onMounted(() => {
  checkAuthAndLoadData();
});

// También verificar cuando cambie el estado de inicialización
watch(
  () => authStore.isInitialized,
  (isInit) => {
    if (isInit) {
      checkAuthAndLoadData();
    }
  },
);

// Verificar autenticación y cargar datos
const checkAuthAndLoadData = async () => {
  if (!authStore.isInitialized) {
    // El store aún se está inicializando, esperamos
    loading.value = true;
    return;
  }

  if (!authStore.isAuthenticated) {
    // No autenticado, mostrar error
    error.value = 'Sesión no válida. Por favor inicia sesión nuevamente.';
    loading.value = false;
    return;
  }

  // Usuario autenticado, cargar restaurantes
  loadRestaurantes();
};

// Cargar lista de restaurantes
const loadRestaurantes = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await RestaurantesService.getAll();
    if (response.data.success) {
      restaurantes.value = response.data.data || [];
    } else {
      error.value = response.data.message || 'Error al cargar restaurantes';
    }
  } catch (err) {
    console.error('Error al cargar restaurantes:', err);
    error.value = 'No se pudieron cargar los restaurantes. Intenta nuevamente.';
  } finally {
    loading.value = false;
  }
};

// Mostrar/ocultar menú contextual
const toggleMenu = (id: string) => {
  if (activeMenu.value === id) {
    activeMenu.value = null;
  } else {
    activeMenu.value = id;
  }
};

// Formatear fecha para mostrar
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Fecha desconocida';

  const date = new Date(dateString);
  return date.toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Tegucigalpa',
  });
};

// Abrir modal para crear o editar
const openModal = (mode: 'create' | 'edit', restaurante?: Restaurante) => {
  modalMode.value = mode;
  formError.value = null;

  if (mode === 'create') {
    formData.value = {
      nombre_restaurante: '',
      direccion_restaurante: '',
      logo_restaurante: '',
    };
  } else if (restaurante) {
    formData.value = {
      nombre_restaurante: restaurante.nombre_restaurante,
      direccion_restaurante: restaurante.direccion_restaurante || '',
      logo_restaurante: restaurante.logo_restaurante || '',
    };
    // Si es edición, guardamos el ID para la actualización
    formData.value.id = restaurante.id;
  }

  showDetails.value = false; // Cerrar detalles si está abierto
  showModal.value = true;
};

// Cerrar modal
const closeModal = () => {
  showModal.value = false;
};

// Maneja la selección de archivo
const handleLogoChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    logoFile.value = input.files[0];

    // Crear una URL para previsualizar la imagen
    if (logoPreview.value) {
      URL.revokeObjectURL(logoPreview.value);
    }
    logoPreview.value = URL.createObjectURL(input.files[0]);
  }
};

// Función para activar el input file
const triggerFileInput = () => {
  if (logoFileInput.value) {
    logoFileInput.value.click();
  }
};

// Modificar la función submitForm para incluir la carga de la imagen
const submitForm = async () => {
  formLoading.value = true;
  formError.value = null;

  try {
    // Si hay un archivo seleccionado, subirlo primero
    if (logoFile.value) {
      const fileFormData = new FormData();
      fileFormData.append('file', logoFile.value);
      fileFormData.append('folder', 'logos'); // Carpeta específica para logos

      try {
        const uploadResult = await UploadService.uploadFile(logoFile.value, 'logos');

        if (!uploadResult.success) {
          formError.value = uploadResult.message || 'Error al subir la imagen. Intenta nuevamente.';
          formLoading.value = false;
          return;
        }

        // Continuar con el resto del código usando uploadResult.url
        formData.value.logo_restaurante = uploadResult.data?.publicUrl;
      } catch (error) {
        console.error('Error al subir el archivo:', error);
        formError.value = 'Error al subir la imagen. Intenta nuevamente.';
        formLoading.value = false;
        return;
      }
    }

    // Continuar con la creación/actualización del restaurante
    if (modalMode.value === 'create') {
      // Crear nuevo restaurante
      const response = await RestaurantesService.create(formData.value);

      if (response.data.success) {
        // Agregar el nuevo restaurante a la lista
        if (response.data.data) {
          restaurantes.value.push(response.data.data);
        }
        closeModal();

        // Limpiar después de un envío exitoso
        logoFile.value = null;
        if (logoPreview.value) {
          URL.revokeObjectURL(logoPreview.value);
          logoPreview.value = null;
        }
      } else {
        formError.value = response.data.message || 'Error al crear restaurante';
      }
    } else {
      // Editar restaurante existente
      const id = formData.value.id;
      if (!id) {
        formError.value = 'ID de restaurante no válido';
        return;
      }

      const updateData: UpdateRestauranteDTO = {
        nombre_restaurante: formData.value.nombre_restaurante,
        direccion_restaurante: formData.value.direccion_restaurante,
        logo_restaurante: formData.value.logo_restaurante,
      };

      const response = await RestaurantesService.update(id, updateData);

      if (response.data.success) {
        // Actualizar el restaurante en la lista
        const index = restaurantes.value.findIndex((r) => r.id === id);
        if (index !== -1 && response.data.data) {
          restaurantes.value[index] = response.data.data;
        }
        closeModal();

        // Limpiar después de un envío exitoso
        logoFile.value = null;
        if (logoPreview.value) {
          URL.revokeObjectURL(logoPreview.value);
          logoPreview.value = null;
        }
      } else {
        formError.value = response.data.message || 'Error al actualizar restaurante';
      }
    }
  } catch (err) {
    console.error('Error al guardar restaurante:', err);
    formError.value = 'Error al procesar la solicitud. Intenta nuevamente.';
  } finally {
    formLoading.value = false;
  }
};

// Confirmar eliminación
const confirmDelete = (restaurante: Restaurante) => {
  restauranteToDelete.value = restaurante;
  showDeleteConfirm.value = true;
  activeMenu.value = null; // Cerrar menú contextual
};

// Eliminar restaurante
const deleteRestaurante = async () => {
  if (!restauranteToDelete.value || !restauranteToDelete.value.id) return;

  deleteLoading.value = true;

  try {
    const response = await RestaurantesService.delete(restauranteToDelete.value.id);

    if (response.data.success) {
      // Eliminar restaurante de la lista
      restaurantes.value = restaurantes.value.filter((r) => r.id !== restauranteToDelete.value?.id);
      showDeleteConfirm.value = false;
    } else {
      error.value = response.data.message || 'Error al eliminar restaurante';
    }
  } catch (err) {
    console.error('Error al eliminar restaurante:', err);
    error.value = 'Error al eliminar el restaurante. Intenta nuevamente.';
  } finally {
    deleteLoading.value = false;
  }
};

// Ver detalles del restaurante
const viewDetails = (restaurante: Restaurante) => {
  selectedRestaurante.value = restaurante;
  showDetails.value = true;
  activeMenu.value = null; // Cerrar menú contextual
};
</script>
