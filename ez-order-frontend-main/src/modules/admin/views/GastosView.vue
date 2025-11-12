<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Gastos</h1>
          <p class="text-sm font-medium text-gray-600">Administra todos los gastos del sistema</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="openCreateDialog"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus class="h-5 w-5" />
            Nuevo Gasto
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="relative z-40 rounded-3xl border border-orange-100 bg-white/80 p-6 backdrop-blur">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Categoría</label>
          <CustomSelect
            v-model="selectedCategoria"
            :options="[{ value: '', label: 'Todas las categorías' }, ...categoriaOptions]"
            placeholder="Todas las categorías"
            @change="loadGastos"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Fecha Inicio</label>
          <input
            type="date"
            v-model="fechaInicio"
            @change="loadGastos"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Fecha Fin</label>
          <input
            type="date"
            v-model="fechaFin"
            @change="loadGastos"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div class="flex items-end">
          <button
            @click="limpiarFiltros"
            class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:border-gray-400"
          >
            <RefreshCcw class="h-4 w-4" />
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.title"
        class="group relative rounded-2xl transition-all duration-300"
        :class="getStatStyle(stat.title).container"
      >
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <p :class="getStatStyle(stat.title).title" class="text-sm font-medium">
              {{ stat.title }}
            </p>
            <p :class="getStatStyle(stat.title).value" class="text-2xl font-bold">
              {{ stat.value }}
            </p>
          </div>
          <div :class="getStatStyle(stat.title).iconWrapper">
            <component :is="stat.icon" class="h-5 w-5 text-white" />
          </div>
        </div>
        <div :class="getStatStyle(stat.title).bar" class="w-full rounded-full h-1.5">
          <div :class="getStatStyle(stat.title).barFill" class="h-1.5 rounded-full" style="width: 100%"></div>
        </div>
      </div>
    </div>

    <!-- Indicador de carga -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
    </div>

    <!-- Mensaje si no hay gastos -->
    <div v-else-if="gastos.length === 0" class="px-6 py-16">
      <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <Receipt class="h-10 w-10 text-gray-300" stroke-width="1.5" />
          <h3 class="text-sm font-semibold text-gray-700">No hay gastos registrados</h3>
          <p class="text-xs text-gray-500 max-w-sm">
            Comienza a registrar los gastos de tu restaurante.
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
                v-for="header in tableHeaders"
                :key="header.key"
                scope="col"
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                {{ header.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="gasto in gastos" :key="gasto.id" class="transition hover:bg-orange-50/60">
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500 align-middle">
                {{ formatFechaSolo(gasto.fecha_gasto) }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 align-middle">
                <span
                  class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200"
                  :class="getCategoriaBadgeClass(gasto.categoria)"
                >
                  <span class="h-2 w-2 rounded-full" :class="getCategoriaDotClass(gasto.categoria)"></span>
                  {{ gasto.categoria }}
                </span>
              </td>
              <td class="px-6 py-4 align-middle">
                <div class="text-sm font-semibold text-gray-900">{{ gasto.descripcion }}</div>
                <div v-if="gasto.usuario_nombre" class="text-xs font-medium text-gray-500 mt-1">
                  Registrado por: {{ gasto.usuario_nombre }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap hidden md:table-cell align-middle">
                <div class="text-sm text-gray-900">
                  {{ gasto.proveedor || '-' }}
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 align-middle">
                <div class="text-lg font-bold text-red-600">{{ formatMoneda(gasto.monto) }}</div>
                <div v-if="gasto.metodo_pago" class="text-xs text-gray-500">{{ gasto.metodo_pago }}</div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium align-middle">
                <div class="flex justify-end gap-2">
                  <button
                    @click="openEditDialog(gasto)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Editar"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    @click="confirmDelete(gasto)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-red-300 hover:text-red-600"
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

      <!-- Paginación -->
      <div class="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="previousPage"
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            @click="nextPage"
            :disabled="currentPage >= totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Mostrando
              <span class="font-medium">{{ (currentPage - 1) * limit + 1 }}</span>
              a
              <span class="font-medium">{{
                Math.min(currentPage * limit, totalRegistros)
              }}</span>
              de
              <span class="font-medium">{{ totalRegistros }}</span>
              resultados
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                @click="previousPage"
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span class="sr-only">Anterior</span>
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <button
                v-for="page in displayedPages"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                  page === currentPage
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                ]"
              >
                {{ page }}
              </button>
              <button
                @click="nextPage"
                :disabled="currentPage >= totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span class="sr-only">Siguiente</span>
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Crear/Editar Gasto -->
    <Modal :show="showDialog" @close="closeDialog" :title="isEditing ? 'Editar Gasto' : 'Nuevo Gasto'">
      <form @submit.prevent="saveGasto">
        <div class="space-y-6">
          <!-- Categoría -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
            <CustomSelect
              v-model="formData.categoria"
              :options="categoriaOptions"
              placeholder="Seleccione una categoría"
              class="w-full"
            />
          </div>

          <!-- Descripción -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Descripción *</label>
            <textarea
              v-model="formData.descripcion"
              required
              rows="3"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors duration-200"
              placeholder="Describe el gasto..."
            ></textarea>
          </div>

          <!-- Monto -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Monto *</label>
            <input
              type="number"
              v-model.number="formData.monto"
              required
              min="0.01"
              step="0.01"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors duration-200"
              placeholder="0.00"
            />
          </div>

          <!-- Proveedor -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Proveedor</label>
            <input
              type="text"
              v-model="formData.proveedor"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors duration-200"
              placeholder="Nombre del proveedor"
            />
          </div>

          <!-- Método de pago -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Método de Pago</label>
            <CustomSelect
              :model-value="formData.metodo_pago_id ?? null"
              @update:model-value="(value) => formData.metodo_pago_id = typeof value === 'number' ? value : null"
              :options="metodoPagoOptions"
              placeholder="Seleccione método de pago"
              class="w-full"
            />
          </div>
        </div>

        <!-- Botones -->
        <div class="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            @click="closeDialog"
            class="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 hover:-translate-y-0.5"
          >
            {{ saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Modal de Confirmación de Eliminación -->
    <Modal
      :show="showDeleteModal"
      @close="cancelDelete"
      :title="'¿Eliminar Gasto?'"
      size="sm"
    >
      <div class="space-y-4">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle class="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-600">
              Esta acción no se puede deshacer. Se eliminará permanentemente el gasto:
            </p>
            <div class="mt-2 p-3 bg-gray-50 rounded-lg">
              <p class="text-sm font-medium text-gray-900">
                "{{ gastoToDelete?.descripcion }}"
              </p>
              <p class="text-xs text-gray-500 mt-1">
                Monto: {{ gastoToDelete ? formatMoneda(gastoToDelete.monto) : '' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="cancelDelete"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="executeDelete"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Eliminar
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Plus,
  Receipt,
  DollarSign,
  TrendingUp,
  Pencil,
  Trash2,
  RefreshCcw
} from 'lucide-vue-next';
import { gastosService } from '@/services/gastos_service';
import metodoPagoService from '@/services/metodo_pago_services';
import { useAuthStore } from '@/stores/auth_store';
import Modal from '@/components/ui/Modal.vue';
import CustomSelect from '@/components/ui/CustomSelect.vue';
import type { Gasto, GastoCreate, GastoUpdate } from '@/interfaces/Gasto';
import { CATEGORIAS_GASTO } from '@/interfaces/Gasto';
import type { MetodoPago } from '@/interfaces/MetodoPago';
import { useToast } from 'vue-toastification';

const authStore = useAuthStore();
const toast = useToast();
const gastos = ref<Gasto[]>([]);
const metodosPago = ref<MetodoPago[]>([]);
const loading = ref(false);
const saving = ref(false);
const showDialog = ref(false);
const isEditing = ref(false);
const currentGastoId = ref<string | null>(null);

// Modal de eliminación
const showDeleteModal = ref(false);
const gastoToDelete = ref<Gasto | null>(null);

// Helper function para mostrar notificaciones usando vue-toastification
function showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string) {
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
    case 'info':
      toast.info(message);
      break;
  }
}

// Filtros
const selectedCategoria = ref('');
const fechaInicio = ref('');
const fechaFin = ref('');

// Paginación
const currentPage = ref(1);
const limit = ref(10);
const totalRegistros = ref(0);
const totalPages = ref(0);

// Estadísticas
const totalMonto = ref(0);
const cantidadGastos = ref(0);

// Función para actualizar estadísticas
const updateStats = () => {
  stats.value = [
    {
      title: 'Total Gastos',
      value: formatMoneda(totalMonto.value),
      icon: DollarSign,
      color: 'orange' as const,
    },
    {
      title: 'Esta Semana',
      value: formatMoneda(calculateWeeklyTotal()),
      icon: TrendingUp,
      color: 'amber' as const,
    },
    {
      title: 'Esta Mes',
      value: formatMoneda(calculateMonthlyTotal()),
      icon: Receipt,
      color: 'red' as const,
    },
    {
      title: 'Promedio',
      value: formatMoneda(cantidadGastos.value > 0 ? totalMonto.value / cantidadGastos.value : 0),
      icon: TrendingUp,
      color: 'orange' as const,
    },
  ];
};

// Función auxiliar para calcular total semanal
const calculateWeeklyTotal = () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return gastos.value
    .filter(gasto => new Date(gasto.fecha_gasto) >= startOfWeek)
    .reduce((total, gasto) => total + gasto.monto, 0);
};

// Función auxiliar para calcular total mensual
const calculateMonthlyTotal = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return gastos.value
    .filter(gasto => new Date(gasto.fecha_gasto) >= startOfMonth)
    .reduce((total, gasto) => total + gasto.monto, 0);
};

// Estadísticas
const stats = ref([
  {
    title: 'Total Gastos',
    value: '0',
    icon: DollarSign,
    color: 'orange' as const,
  },
  {
    title: 'Esta Semana',
    value: '0',
    icon: TrendingUp,
    color: 'amber' as const,
  },
  {
    title: 'Esta Mes',
    value: '0',
    icon: Receipt,
    color: 'red' as const,
  },
  {
    title: 'Promedio',
    value: '0',
    icon: TrendingUp,
    color: 'orange' as const,
  },
]);

// Headers de tabla
const tableHeaders = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'proveedor', label: 'Proveedor' },
  { key: 'monto', label: 'Monto' },
  { key: 'acciones', label: 'Acciones' },
];

// Opciones para select de categoría
const categoriaOptions = CATEGORIAS_GASTO.map(cat => ({
  value: cat,
  label: cat
}));

// Opciones para select de método de pago
const metodoPagoOptions = computed<Array<{ value: number | null; label: string }>>(() => [
  { value: null, label: 'Seleccione método de pago' },
  ...metodosPago.value.map(metodo => ({
    value: metodo.id,
    label: metodo.metodo
  }))
]);

// Estilos para las cards de estadísticas (mismos colores que Gestión de Pedidos)
const getStatStyle = (title: string) => {
  const styles: Record<string, {
    container: string;
    iconWrapper: string;
    title: string;
    value: string;
    bar: string;
    barFill: string;
  }> = {
    'Total Gastos': {
      container: 'bg-gradient-to-br from-orange-50 via-white to-orange-50 border border-orange-200 hover:border-orange-300 p-5',
      iconWrapper: 'w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
      title: 'text-orange-600',
      value: 'text-orange-700',
      bar: 'bg-orange-100',
      barFill: 'bg-gradient-to-r from-orange-500 to-orange-600'
    },
    'Esta Semana': {
      container: 'bg-gradient-to-br from-amber-50 via-white to-amber-50 border border-amber-200 hover:border-amber-300 p-5',
      iconWrapper: 'w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
      title: 'text-amber-600',
      value: 'text-amber-700',
      bar: 'bg-amber-100',
      barFill: 'bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600'
    },
    'Esta Mes': {
      container: 'bg-gradient-to-br from-orange-50 via-white to-red-50 border border-red-200/70 hover:border-red-300 p-5',
      iconWrapper: 'w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
      title: 'text-red-600',
      value: 'text-red-600',
      bar: 'bg-red-100',
      barFill: 'bg-gradient-to-r from-red-500 to-orange-500'
    },
    'Promedio': {
      container: 'bg-gradient-to-br from-orange-50 via-white to-amber-50 border border-orange-200 hover:border-orange-300 p-5',
      iconWrapper: 'w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
      title: 'text-orange-600',
      value: 'text-orange-600',
      bar: 'bg-orange-100',
      barFill: 'bg-gradient-to-r from-orange-500 to-orange-600'
    }
  };
  return styles[title] || styles['Total Gastos'];
};

// Estilos para badges de categoría
const getCategoriaBadgeClass = (categoria: string) => {
  const badgeClasses: Record<string, string> = {
    'Compras de insumos': 'bg-blue-100 text-blue-800',
    'Servicios': 'bg-green-100 text-green-800',
    'Salarios/Nómina': 'bg-purple-100 text-purple-800',
    'Mantenimiento': 'bg-orange-100 text-orange-800',
    'Alquiler': 'bg-indigo-100 text-indigo-800',
    'Marketing/Publicidad': 'bg-pink-100 text-pink-800',
    'Impuestos': 'bg-red-100 text-red-800',
    'Transporte': 'bg-cyan-100 text-cyan-800',
    'Otros': 'bg-gray-100 text-gray-800'
  };
  return badgeClasses[categoria] || 'bg-gray-100 text-gray-800';
};

const getCategoriaDotClass = (categoria: string) => {
  const dotClasses: Record<string, string> = {
    'Compras de insumos': 'bg-blue-500',
    'Servicios': 'bg-green-500',
    'Salarios/Nómina': 'bg-purple-500',
    'Mantenimiento': 'bg-orange-500',
    'Alquiler': 'bg-indigo-500',
    'Marketing/Publicidad': 'bg-pink-500',
    'Impuestos': 'bg-red-500',
    'Transporte': 'bg-cyan-500',
    'Otros': 'bg-gray-500'
  };
  return dotClasses[categoria] || 'bg-gray-500';
};

// Formulario
const formData = ref<GastoCreate>({
  restaurante_id: '',
  usuario_id: '',
  categoria: '',
  descripcion: '',
  monto: 0,
  metodo_pago_id: null,
  proveedor: ''
});

// Computed
const displayedPages = computed(() => {
  const pages = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage.value - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages.value, startPage + maxPagesToShow - 1);

  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return pages;
});

// Métodos
async function loadGastos() {
  if (!authStore.userInfo?.restaurante_id) return;

  loading.value = true;
  try {
    const response = await gastosService.getGastos(
      authStore.userInfo.restaurante_id,
      currentPage.value,
      limit.value,
      selectedCategoria.value || undefined,
      fechaInicio.value || undefined,
      fechaFin.value || undefined
    );

    gastos.value = response.data || [];
    totalRegistros.value = response.pagination?.total || 0;
    totalPages.value = response.pagination?.pages || 0;

    // Actualizar estadísticas
    updateStats();
  } catch (error) {
    console.error('Error loading gastos:', error);
  } finally {
    loading.value = false;
  }
}

async function loadMetodosPago() {
  try {
    const response = await metodoPagoService.getAll();
    metodosPago.value = response.data?.data || [];
  } catch (error) {
    console.error('Error loading metodos pago:', error);
  }
}

function openCreateDialog() {
  isEditing.value = false;
  currentGastoId.value = null;
  formData.value = {
    restaurante_id: authStore.userInfo?.restaurante_id || '',
    usuario_id: authStore.userInfo?.id || '',
    categoria: '',
    descripcion: '',
    monto: 0,
    metodo_pago_id: null,
    proveedor: ''
  };
  showDialog.value = true;
}

function openEditDialog(gasto: Gasto) {
  isEditing.value = true;
  currentGastoId.value = gasto.id;
  formData.value = {
    restaurante_id: gasto.restaurante_id,
    usuario_id: gasto.usuario_id,
    categoria: gasto.categoria,
    descripcion: gasto.descripcion,
    monto: gasto.monto,
    metodo_pago_id: gasto.metodo_pago_id ?? null,
    proveedor: gasto.proveedor || ''
  };
  showDialog.value = true;
}

function closeDialog() {
  showDialog.value = false;
  isEditing.value = false;
  currentGastoId.value = null;
}

async function saveGasto() {
  saving.value = true;
  try {
    if (isEditing.value && currentGastoId.value) {
      await gastosService.updateGasto(currentGastoId.value, formData.value as GastoUpdate);
      showNotification('success', 'Gasto actualizado correctamente');
    } else {
      await gastosService.createGasto(formData.value);
      showNotification('success', 'Gasto creado correctamente');
    }

    closeDialog();
    await loadGastos();
  } catch (error) {
    console.error('Error saving gasto:', error);
    const errorMessage = error instanceof Error && 'response' in error 
      ? (error as { response?: { data?: { error?: string } } }).response?.data?.error 
      : 'Error al guardar el gasto';
    showNotification('error', errorMessage || 'Error al guardar el gasto');
  } finally {
    saving.value = false;
  }
}

function confirmDelete(gasto: Gasto) {
  gastoToDelete.value = gasto;
  showDeleteModal.value = true;
}

async function executeDelete() {
  if (!gastoToDelete.value) return;

  try {
    await gastosService.deleteGasto(gastoToDelete.value.id);
    showDeleteModal.value = false;
    gastoToDelete.value = null;
    await loadGastos();
    showNotification('success', 'Gasto eliminado correctamente');
  } catch (error) {
    console.error('Error deleting gasto:', error);
    const errorMessage = error instanceof Error && 'response' in error 
      ? (error as { response?: { data?: { error?: string } } }).response?.data?.error 
      : 'Error al eliminar el gasto';
    showNotification('error', errorMessage || 'Error al eliminar el gasto');
  }
}

function cancelDelete() {
  showDeleteModal.value = false;
  gastoToDelete.value = null;
}

function limpiarFiltros() {
  selectedCategoria.value = '';
  fechaInicio.value = '';
  fechaFin.value = '';
  loadGastos();
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadGastos();
  }
}

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadGastos();
  }
}

function goToPage(page: number) {
  currentPage.value = page;
  loadGastos();
}

function formatMoneda(monto: number): string {
  return gastosService.formatMoneda(monto);
}

function formatFechaSolo(fecha: string): string {
  return gastosService.formatFechaSolo(fecha);
}

// Lifecycle
onMounted(() => {
  loadGastos();
  loadMetodosPago();
  updateStats();
});
</script>

