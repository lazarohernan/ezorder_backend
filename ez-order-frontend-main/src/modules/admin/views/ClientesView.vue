<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Clientes</h1>
          <p class="text-sm font-medium text-gray-600">Administra todos los clientes del sistema</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="openCreateDialog"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="relative z-40 rounded-3xl border border-orange-100 bg-white/80 p-6 backdrop-blur">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Filtrar por Restaurante</label>
          <CustomSelect
            v-model="selectedRestauranteId"
            :options="restauranteOptions"
            placeholder="Todos los restaurantes"
            @update:modelValue="loadClientes"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Buscar clientes</label>
          <div class="relative">
            <input
              type="text"
              v-model="searchTerm"
              placeholder="Buscar clientes..."
              class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Indicador de carga -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
    </div>

    <!-- Mensaje si no hay clientes -->
    <div v-else-if="clientes.length === 0" class="px-6 py-16">
      <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 class="text-sm font-semibold text-gray-700">No hay clientes registrados</h3>
          <p class="text-xs text-gray-500 max-w-sm">
            Comienza a agregar clientes para tu restaurante.
          </p>
        </div>
      </div>
    </div>

    <!-- Orders Table -->
    <div v-else class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50/90">
            <tr>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Nombre
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                RTN
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Teléfono
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle hidden md:table-cell"
              >
                Correo
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle hidden sm:table-cell"
              >
                Restaurante
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="cliente in clientes" :key="cliente.id" class="transition hover:bg-orange-50/60">
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500 align-middle">
                <div class="text-sm font-semibold text-gray-900">{{ cliente.nombre_cliente }}</div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle">
                {{ cliente.rtn_cliente || 'N/A' }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle">
                {{ cliente.tel_cliente || 'N/A' }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle hidden md:table-cell">
                {{ cliente.correo_cliente || 'N/A' }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle hidden sm:table-cell">
                <div class="font-semibold text-gray-800">
                  {{ cliente.restaurantes?.nombre_restaurante || 'N/A' }}
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium align-middle">
                <div class="flex justify-end gap-2">
                  <button
                    @click="viewCliente(cliente)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Ver"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    @click="editCliente(cliente)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Editar"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    @click="confirmDelete(cliente)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:border-red-300 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Indicador de información responsive -->
      <div
        class="md:hidden bg-orange-50 p-2 text-xs text-orange-700 text-center border-t border-orange-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 inline-block mr-1"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        Desplaza horizontalmente para ver más información o pulsa Ver para detalles
      </div>

      <!-- Paginación Optimizada -->
      <div v-if="totalItems > 0" class="px-8 py-4 border-t border-gray-200 bg-white">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Información de resultados -->
          <div class="flex items-center gap-4 text-sm text-gray-600">
            <span>
              Mostrando <span class="font-semibold text-gray-900">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> a
              <span class="font-semibold text-gray-900">{{ Math.min(currentPage * itemsPerPage, totalItems) }}</span> de
              <span class="font-semibold text-gray-900">{{ totalItems }}</span> resultados
            </span>
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600">Mostrar:</label>
              <select
                :value="itemsPerPage"
                @change="(e) => { changeItemsPerPage(Number((e.target as HTMLSelectElement).value)); }"
                class="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
        </div>
          </div>

          <!-- Controles de paginación -->
          <div class="flex items-center gap-2">
            <!-- Botón Primera página -->
              <button
                @click="goToFirstPage"
              :disabled="!hasPreviousPage || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Primera página"
            >
              ««
              </button>

            <!-- Botón Anterior -->
              <button
                @click="goToPreviousPage"
              :disabled="!hasPreviousPage || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Página anterior"
              >
              ← Anterior
            </button>

            <!-- Números de página -->
            <div class="flex items-center gap-1">
              <template v-for="pageNum in getPageNumbers()" :key="pageNum">
                <button
                  v-if="pageNum !== '...'"
                  @click="goToPage(pageNum as number)"
                  :disabled="loading"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                    pageNum === currentPage
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border border-orange-500'
                      : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed'
                  ]"
                >
                  {{ pageNum }}
              </button>
                <span v-else class="px-2 text-gray-400">...</span>
              </template>
            </div>

            <!-- Botón Siguiente -->
              <button
                @click="goToNextPage"
              :disabled="!hasNextPage || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Página siguiente"
            >
              Siguiente →
              </button>

            <!-- Botón Última página -->
              <button
                @click="goToLastPage"
              :disabled="!hasNextPage || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Última página"
            >
              »»
              </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Ver Detalles del Cliente -->
    <div v-if="showViewDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <div class="fixed inset-0 transition-opacity" @click="closeViewDialog">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[60]"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Detalles del Cliente
                </h3>
                <div class="space-y-4">
                  <div>
                    <strong>Nombre:</strong>
                    <p class="text-gray-700">{{ selectedCliente?.nombre_cliente }}</p>
                  </div>
                  <div>
                    <strong>RTN:</strong>
                    <p class="text-gray-700">{{ selectedCliente?.rtn_cliente || 'N/A' }}</p>
                  </div>
                  <div>
                    <strong>Teléfono:</strong>
                    <p class="text-gray-700">{{ selectedCliente?.tel_cliente || 'N/A' }}</p>
                  </div>
                  <div>
                    <strong>Correo:</strong>
                    <p class="text-gray-700">{{ selectedCliente?.correo_cliente || 'N/A' }}</p>
                  </div>
                  <div>
                    <strong>Restaurante:</strong>
                    <p class="text-gray-700">
                      {{ selectedCliente?.restaurantes?.nombre_restaurante }}
                    </p>
                  </div>
                </div>
                <div class="flex justify-end mt-6">
                  <button
                    @click="closeViewDialog"
                    class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Diálogo de Crear/Editar -->
    <div v-if="showDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Overlay de fondo -->
        <div class="fixed inset-0 transition-opacity" @click="closeDialog">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <!-- Modal -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[60]"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {{ isEditing ? 'Editar Cliente' : 'Nuevo Cliente' }}
                </h3>
                <form @submit.prevent="saveCliente" class="space-y-4">
                  <!-- Restaurante -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Restaurante</label>
                    <CustomSelect
                      v-model="formData.restaurante_id"
                      :options="formRestauranteOptions"
                      placeholder="Seleccionar restaurante"
                    />
                  </div>
                  <!-- Nombre -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <input
                      v-model="formData.nombre_cliente"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <!-- RTN -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">RTN</label>
                    <input
                      v-model="formData.rtn_cliente"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <!-- Teléfono -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <input
                      v-model="formData.tel_cliente"
                      type="tel"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <!-- Correo -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Correo</label>
                    <input
                      v-model="formData.correo_cliente"
                      type="email"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <!-- Botones -->
                  <div class="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      @click="closeDialog"
                      class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      class="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md text-sm hover:from-orange-600 hover:to-orange-700"
                    >
                      {{ isEditing ? 'Guardar' : 'Crear' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Diálogo de Confirmación de Eliminación -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity" @click="showDeleteDialog = false">
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
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Confirmar Eliminación
                </h3>
                <p class="text-sm text-gray-500 mb-4">
                  ¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede
                  deshacer.
                </p>
                <div class="flex justify-end space-x-3">
                  <button
                    @click="showDeleteDialog = false"
                    class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    @click="deleteCliente"
                    class="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Cliente, CreateClienteDTO } from '@/interfaces/Cliente';
import type { Restaurante } from '@/interfaces/Restaurante';
import ClientesService from '@/services/clientes_service';
import RestaurantesService from '@/services/restaurantes_service';
import { useToast } from 'vue-toastification';
import { usePagination } from '@/composables/usePagination';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '@/interfaces/Usuario';
import type { PaginatedResponse } from '@/services/usuarios_service';
import CustomSelect from '@/components/ui/CustomSelect.vue';
import { Eye, Pencil, Trash2 } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth_store';

const toast = useToast();
const authStore = useAuthStore();

// Estado principal
const restaurantes = ref<Restaurante[]>([]);
const selectedRestauranteId = ref('');
const showDialog = ref(false);
const showDeleteDialog = ref(false);
const showViewDialog = ref(false);
const isEditing = ref(false);
const selectedCliente = ref<Cliente | null>(null);

// Búsqueda
const searchTerm = ref('');

// Función para obtener clientes paginados
const fetchPaginatedClientes = async (params: {
  page: number;
  limit: number;
}): Promise<AxiosResponse<ApiResponse<PaginatedResponse<Cliente>>>> => {
  try {
    // Si hay un restaurante seleccionado, filtrar por él
    if (selectedRestauranteId.value) {
      const response = await ClientesService.getByRestauranteId(selectedRestauranteId.value);

      // Simulamos la estructura de paginación ya que getByRestauranteId no soporta paginación
      return {
        ...response,
        data: {
          success: true,
          data: {
            items: response.data.data,
            total: response.data.data.length,
            totalPages: 1,
            page: params.page,
            limit: params.limit,
          },
        },
      };
    } else {
      // Si no hay filtro, obtenemos todos y simulamos paginación
      const response = await ClientesService.getAll();

      // Simular paginación básica para mantener compatibilidad con usePagination
      const allItems = response.data.data;
      const start = (params.page - 1) * params.limit;
      const end = start + params.limit;
      const paginatedItems = allItems.slice(start, end);

      return {
        ...response,
        data: {
          success: true,
          data: {
            items: paginatedItems,
            total: allItems.length,
            totalPages: Math.ceil(allItems.length / params.limit),
            page: params.page,
            limit: params.limit,
          },
        },
      };
    }
  } catch (error) {
    console.error(error);
    toast.error('Error al cargar los clientes');
    throw error;
  }
};

// Estado de paginación
const {
  items: clientes,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  isLoading: loading,
  hasPreviousPage,
  hasNextPage,
  goToFirstPage,
  goToPreviousPage,
  goToNextPage,
  goToLastPage,
  goToPage,
  changeItemsPerPage,
  refresh: loadClientes,
} = usePagination<Cliente>(fetchPaginatedClientes);

// Formulario
const formData = ref<CreateClienteDTO>({
  restaurante_id: '',
  nombre_cliente: '',
  rtn_cliente: null,
  tel_cliente: null,
  correo_cliente: null,
});

// Cargar datos iniciales
onMounted(async () => {
  await loadRestaurantes();
  // loadClientes se ejecutará automáticamente desde usePagination
});

// Cargar restaurantes
const loadRestaurantes = async () => {
  try {
    const response = await RestaurantesService.getAll();
    restaurantes.value = response.data.data as Restaurante[];
  } catch (error) {
    console.error(error);
    toast.error('Error al cargar los restaurantes');
  }
};

// Abrir diálogo de creación
const openCreateDialog = () => {
  isEditing.value = false;
  formData.value = {
    restaurante_id: selectedRestauranteId.value || '',
    nombre_cliente: '',
    rtn_cliente: null,
    tel_cliente: null,
    correo_cliente: null,
  };
  showDialog.value = true;
};

// Ver cliente
const viewCliente = (cliente: Cliente) => {
  selectedCliente.value = cliente;
  showViewDialog.value = true;
};
const closeViewDialog = () => {
  showViewDialog.value = false;
  selectedCliente.value = null;
};

// Editar cliente
const editCliente = (cliente: Cliente) => {
  isEditing.value = true;
  selectedCliente.value = cliente;
  formData.value = { ...cliente };
  showDialog.value = true;
};

// Cerrar diálogo
const closeDialog = () => {
  showDialog.value = false;
  selectedCliente.value = null;
};

// Guardar cliente
const saveCliente = async () => {
  try {
    if (isEditing.value && selectedCliente.value) {
      await ClientesService.update(selectedCliente.value.id, formData.value);
      toast.success('Cliente actualizado correctamente');
    } else {
      await ClientesService.create(formData.value);
      toast.success('Cliente creado correctamente');
    }
    closeDialog();
    await loadClientes();
  } catch (error) {
    console.error(error);
    toast.error('Error al guardar el cliente');
  }
};

// Confirmar eliminación
const confirmDelete = (cliente: Cliente) => {
  selectedCliente.value = cliente;
  showDeleteDialog.value = true;
};

// Eliminar cliente
const deleteCliente = async () => {
  if (!selectedCliente.value) return;

  try {
    await ClientesService.delete(selectedCliente.value.id);
    toast.success('Cliente eliminado correctamente');
    await loadClientes();
    showDeleteDialog.value = false;
  } catch (error) {
    console.error(error);
    toast.error('Error al eliminar el cliente');
  }
};

// Computed para obtener restaurante principal
const restauranteId = computed(() => {
  return authStore.userInfo?.restaurante_id || '';
});

// Computed properties para opciones de CustomSelect
const restauranteOptions = computed(() => {
  const options = [
    { label: 'Todos los restaurantes', value: '' }
  ];
  
  restaurantes.value.forEach((r) => {
    const isPrincipal = r.id === restauranteId.value;
    options.push({
    label: r.nombre_restaurante,
    value: r.id || '',
      badge: isPrincipal ? 'Principal' : undefined
    });
  });
  
  return options;
});

const formRestauranteOptions = computed(() => {
  return restaurantes.value.map((r) => {
    const isPrincipal = r.id === restauranteId.value;
    return {
    label: r.nombre_restaurante,
    value: r.id || '',
      badge: isPrincipal ? 'Principal' : undefined
    };
  });
});

// Función para generar números de página con elipsis
const getPageNumbers = (): (number | string)[] => {
  if (totalPages.value <= 0) return [];
  
  const page = currentPage.value;
  const pages = totalPages.value;
  const pageNumbers: (number | string)[] = [];
  
  if (pages <= 7) {
    // Si hay 7 o menos páginas, mostrar todas
    for (let i = 1; i <= pages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Si hay más de 7 páginas, mostrar con elipsis
    if (page <= 3) {
      // Al inicio: 1 2 3 4 ... última
      for (let i = 1; i <= 4; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(pages);
    } else if (page >= pages - 2) {
      // Al final: 1 ... (últimas 4)
      pageNumbers.push(1);
      pageNumbers.push('...');
      for (let i = pages - 3; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // En el medio: 1 ... (actual-1) (actual) (actual+1) ... última
      pageNumbers.push(1);
      pageNumbers.push('...');
      for (let i = page - 1; i <= page + 1; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(pages);
    }
  }
  
  return pageNumbers;
};
</script>

<style scoped></style>
