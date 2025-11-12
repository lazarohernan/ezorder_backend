<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Pedidos</h1>
          <p class="text-sm font-medium text-gray-600">Administra todos los pedidos del sistema</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="openNewOrderModal"
            v-permission="'pedidos.crear'"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus class="h-5 w-5" />
            <span>Nuevo Pedido</span>
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

    <!-- Filters -->
    <div class="relative z-40 rounded-3xl border border-orange-100 bg-white/80 p-6 backdrop-blur">
      <div :class="isAdmin ? 'grid grid-cols-1 gap-4 md:grid-cols-3' : 'grid grid-cols-1 gap-4 md:grid-cols-2'">
        <!-- Filtro por Restaurante (solo si es admin) -->
        <div v-if="isAdmin" class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Filtrar por Restaurante</label>
          <CustomSelect
            v-model="filters.restaurante"
            :options="restauranteOptions"
            placeholder="Todos los restaurantes"
            @change="aplicarFiltros"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Filtro de Estado</label>
          <CustomSelect
            v-model="filters.estado"
            :options="estadoOptions"
            placeholder="Seleccione un estado"
            @change="aplicarFiltros"
          />
        </div>
        <!-- Add more filter fields as needed -->
      </div>
    </div>

    <!-- Orders Table -->
    <div v-if="filteredPedidos.length === 0" class="px-6 py-16">
      <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <ShoppingBag class="h-10 w-10 text-gray-300" stroke-width="1.5" />
          <h3 class="text-sm font-semibold text-gray-700">No hay pedidos registrados</h3>
          <p class="text-xs text-gray-500 max-w-sm">
            Cuando se registren pedidos, aparecerán listados aquí.
          </p>
        </div>
      </div>
    </div>

    <div v-else class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50/90 sticky top-0 z-10">
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
        </table>
      </div>
      <div class="max-h-[360px] overflow-y-auto overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="sr-only">
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
            <tr v-for="pedido in filteredPedidos" :key="pedido.id" class="transition hover:bg-orange-50/60">
              <td class="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-700 align-middle">
                #{{ pedido.numero_ticket || pedido.id.substring(0, 8) }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 align-middle">
                <div class="text-sm font-semibold text-gray-900">
                  {{ pedido.clientes?.nombre_cliente || 'Cliente no registrado' }}
                </div>
                <div class="text-xs font-medium uppercase text-gray-400">
                  {{ pedido.tipo_pedido ? formatTipo(pedido.tipo_pedido) : '' }}
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle">
                <div class="font-semibold text-gray-800">
                  {{ pedido.restaurantes?.nombre_restaurante || 'N/A' }}
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 align-middle">
                <span
                  class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200"
                  :class="getStatusBadgeClass(pedido.estado_pedido)"
                >
                  <span class="h-2 w-2 rounded-full" :class="getStatusDotClass(pedido.estado_pedido)"></span>
                  {{ formatEstado(pedido.estado_pedido) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 align-middle">
                {{ formatCurrency(pedido.total) }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500 align-middle">
                {{ formatDate(pedido.created_at) }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium align-middle">
                <div class="flex justify-end gap-2">
                  <button
                    @click="viewOrderDetails(pedido)"
                    v-permission="'pedidos.ver'"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Ver detalles"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    @click="changeOrderStatus(pedido)"
                    v-permission="'pedidos.cambiar_estado'"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Cambiar estado"
                  >
                    <RefreshCcw class="h-4 w-4" />
                  </button>
                  <button
                    @click="confirmDelete(pedido)"
                    v-permission="'pedidos.eliminar'"
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
    </div>

    <!-- Order Details Modal -->
    <OrderDetailsModal
      :is-open="isDetailsModalOpen"
      :order="selectedOrder"
      @close="closeDetailsModal"
      @status-updated="handleStatusUpdate"
    />

    <!-- Change Status Modal -->
    <CambioEstadoPedido
      :is-open="isStatusModalOpen"
      :pedido="selectedOrder"
      @close="closeStatusModal"
      @updated="handleStatusChange"
    />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
        <!-- Overlay con backdrop blur -->
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showDeleteDialog = false"></div>

        <!-- Modal Container -->
        <div class="relative inline-block w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
          <!-- Header con gradiente de advertencia -->
          <div class="bg-gradient-to-br from-red-50 via-white to-red-100 px-6 py-4 border-b border-red-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Trash2 class="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Eliminar Pedido</h3>
                  <p class="text-xs font-medium text-gray-600">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button
                @click="showDeleteDialog = false"
                class="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
              >
                <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="px-8 py-6">
            <!-- Icono de advertencia -->
            <div class="flex justify-center mb-4">
              <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Trash2 class="h-8 w-8 text-orange-600" />
              </div>
            </div>

            <!-- Mensaje -->
            <div class="text-center">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">¿Eliminar pedido?</h3>
              <p class="text-gray-600 text-sm">
                Esta acción no se puede deshacer. El pedido <strong>#{{ selectedOrder?.numero_ticket || selectedOrder?.id.substring(0, 8) }}</strong> será eliminado permanentemente.
              </p>
            </div>
          </div>

          <!-- Footer con botones -->
          <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div class="flex justify-end space-x-3">
              <button
                @click="showDeleteDialog = false"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
              <button
                @click="deletePedido"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-red-600 hover:to-red-700 shadow-lg"
              >
                <Trash2 class="h-5 w-5" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Plus,
  Eye,
  RefreshCcw,
  Clock3,
  Cog,
  CheckCircle,
  ShoppingBag,
  Trash2,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Pedido } from '@/interfaces/Pedido';
import PedidoService from '@/services/pedido_service';
import OrderDetailsModal from '../components/OrderDetailsModal.vue';
import CambioEstadoPedido from '../components/CambioEstadoPedido.vue';
import { useAuthStore } from '@/stores/auth_store';
import CustomSelect from '@/components/ui/CustomSelect.vue';
import { cajaService } from '@/services/caja_service';
import { useToast } from 'vue-toastification';
import { formatCurrencyHNL } from '@/utils/currency';
import { RestaurantesService } from '@/services/restaurantes_service';
import type { Restaurante } from '@/interfaces/Restaurante';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// State
const pedidos = ref<Pedido[]>([]);
const selectedOrder = ref<Pedido | null>(null);
const isDetailsModalOpen = ref(false);
const isStatusModalOpen = ref(false);
const showDeleteDialog = ref<boolean>(false);
const restaurantes = ref<Restaurante[]>([]);

// Filters
const filters = ref({
  estado: '',
  tipo: '',
  restaurante: '',
  fechaDesde: '',
  fechaHasta: '',
  search: '',
});

// Table headers
const tableHeaders = [
  { key: 'id', label: 'Ticket' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'restaurante', label: 'Restaurante' },
  { key: 'estado', label: 'Estado' },
  { key: 'total', label: 'Total' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'acciones', label: 'Acciones' },
];

// Stats
const stats = ref([
  { title: 'Pendientes', value: 0, icon: Clock3, color: 'yellow' as const },
  { title: 'En preparación', value: 0, icon: Cog, color: 'blue' as const },
  { title: 'Listos', value: 0, icon: CheckCircle, color: 'green' as const },
  { title: 'Entregados', value: 0, icon: ShoppingBag, color: 'indigo' as const },
]);

// Verificar si el usuario es administrador
const isAdmin = computed(() => {
  const rolId = authStore.userInfo?.rol_id;
  return rolId === 1 || rolId === 2 || authStore.userInfo?.es_super_admin === true;
});

// Computed para obtener restaurante principal
const restauranteId = computed(() => {
  return authStore.userInfo?.restaurante_id || '';
});

// Computed para opciones de restaurantes con badge de principal
const restauranteOptions = computed(() => {
  const options: Array<{ label: string; value: string; badge?: string }> = [
    { label: 'Todos los restaurantes', value: '' }
  ];
  
  restaurantes.value.forEach(restaurante => {
    const isPrincipal = restaurante.id === restauranteId.value;
    options.push({
      label: restaurante.nombre_restaurante,
      value: restaurante.id || '',
      badge: isPrincipal ? 'Principal' : undefined
    });
  });
  
  return options;
});

const estadoOptions = computed(() => [
  { label: 'Todos', value: '' },
  ...estadosPedido.map((estado) => ({
    label: formatEstado(estado),
    value: estado,
  })),
]);

const statCardStyles: Record<string, {
  container: string;
  iconWrapper: string;
  title: string;
  value: string;
  bar: string;
  barFill: string;
}> = {
  Pendientes: {
    container: 'bg-gradient-to-br from-orange-50 via-white to-orange-50 border border-orange-200 hover:border-orange-300 p-5',
    iconWrapper: 'w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
    title: 'text-orange-600',
    value: 'text-orange-700',
    bar: 'bg-orange-100',
    barFill: 'bg-gradient-to-r from-orange-500 to-orange-600'
  },
  'En preparación': {
    container: 'bg-gradient-to-br from-amber-50 via-white to-amber-50 border border-amber-200 hover:border-amber-300 p-5',
    iconWrapper: 'w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
    title: 'text-amber-600',
    value: 'text-amber-700',
    bar: 'bg-amber-100',
    barFill: 'bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600'
  },
  Listos: {
    container: 'bg-gradient-to-br from-orange-50 via-white to-red-50 border border-red-200/70 hover:border-red-300 p-5',
    iconWrapper: 'w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
    title: 'text-red-600',
    value: 'text-red-600',
    bar: 'bg-red-100',
    barFill: 'bg-gradient-to-r from-red-500 to-orange-500'
  },
  Entregados: {
    container: 'bg-gradient-to-br from-orange-50 via-white to-amber-50 border border-orange-200 hover:border-orange-300 p-5',
    iconWrapper: 'w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
    title: 'text-orange-600',
    value: 'text-orange-600',
    bar: 'bg-orange-100',
    barFill: 'bg-gradient-to-r from-orange-500 to-orange-600'
  }
};

// Constants
const estadosPedido = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo',
  'entregado',
  'cancelado',
];
//const tiposPedido = ['local', 'domicilio', 'recoger', 'mesa'];

// Computed
const filteredPedidos = computed(() => {
  return pedidos.value.filter((pedido) => {
    if (filters.value.estado && pedido.estado_pedido !== filters.value.estado) {
      return false;
    }
    if (filters.value.tipo && pedido.tipo_pedido !== filters.value.tipo) {
      return false;
    }
    if (filters.value.restaurante && pedido.restaurante_id !== filters.value.restaurante) {
      return false;
    }
    // Add more filter conditions as needed
    return true;
  });
});

// Cargar restaurantes para el filtro
const cargarRestaurantes = async () => {
  if (!isAdmin.value) return;
  
  try {
    const response = await RestaurantesService.getAll();
    if (response.data.success) {
      restaurantes.value = response.data.data || [];
    }
  } catch (err) {
    console.error('Error cargando restaurantes:', err);
  }
};

// Methods
const fetchPedidos = async () => {
  try {
    let response;
    
    // Si es admin y hay filtro de restaurante, usar getByRestauranteId
    if (isAdmin.value && filters.value.restaurante) {
      response = await PedidoService.getByRestauranteId(filters.value.restaurante);
    } else if (isAdmin.value && !filters.value.restaurante) {
      // Admin sin filtro: obtener todos los pedidos y filtrar por restaurantes del admin
      response = await PedidoService.getAll();
      // Filtrar solo los pedidos de los restaurantes del administrador
      if (response.data.success && response.data.data && restaurantes.value.length > 0) {
        const restauranteIds = restaurantes.value.map(r => r.id);
        response.data.data = response.data.data.filter((pedido: Pedido) => 
          restauranteIds.includes(pedido.restaurante_id)
        );
      }
    } else {
      // Usuario normal: usar getByRestauranteId con su restaurante
      response = await PedidoService.getByRestauranteId(
      authStore.userInfo?.restaurante_id ?? '',
    );
    }
    
    pedidos.value = response.data.data || [];
    updateStats();
  } catch (error) {
    console.error('Error al cargar los pedidos:', error);
  }
};

// Aplicar filtros
const aplicarFiltros = () => {
  fetchPedidos();
};

const updateStats = () => {
  stats.value = [
    {
      title: 'Pendientes',
      value: pedidos.value.filter((p) => p.estado_pedido === 'pendiente').length,
      icon: Clock3,
      color: 'yellow' as const,
    },
    {
      title: 'En preparación',
      value: pedidos.value.filter((p) => p.estado_pedido === 'en preparacion').length,
      icon: Cog,
      color: 'blue' as const,
    },
    {
      title: 'Listos',
      value: pedidos.value.filter((p) => p.estado_pedido === 'listo').length,
      icon: CheckCircle,
      color: 'green' as const,
    },
    {
      title: 'Entregados',
      value: pedidos.value.filter((p) => p.estado_pedido === 'entregado').length,
      icon: ShoppingBag,
      color: 'indigo' as const,
    },
  ];
};

const viewOrderDetails = (pedido: Pedido) => {
  selectedOrder.value = pedido;
  isDetailsModalOpen.value = true;
};

const openNewOrderModal = async () => {
  // Validar que la caja esté abierta antes de navegar a crear pedido
  if (!authStore.userInfo?.restaurante_id) {
    toast.error('No se pudo identificar el restaurante. Por favor, recarga la página.');
    return;
  }

  try {
    console.log('🔍 Verificando caja abierta para restaurante:', authStore.userInfo.restaurante_id);
    const cajaAbierta = await cajaService.verificarCajaAbierta(authStore.userInfo.restaurante_id);
    console.log('📊 Resultado verificación caja:', cajaAbierta);
    
    if (!cajaAbierta) {
      console.log('❌ Caja cerrada, bloqueando navegación a nuevo pedido');
      toast.error('No se puede crear un pedido. La caja debe estar abierta para realizar pedidos.');
      return;
    }

    console.log('✅ Caja abierta confirmada, navegando a nuevo pedido');
    router.push({ name: 'new-order' });
  } catch (error) {
    console.error('❌ Error al verificar caja abierta:', error);
    toast.error('Error al verificar el estado de la caja. Por favor, intenta nuevamente.');
  }
};

const confirmDelete = (pedido: Pedido) => {
  selectedOrder.value = pedido;
  showDeleteDialog.value = true;
};

const deletePedido = async () => {
  if (!selectedOrder.value) return;

  try {
    await PedidoService.delete(selectedOrder.value.id);
    await fetchPedidos();
    showDeleteDialog.value = false;
    selectedOrder.value = null;
  } catch (error) {
    console.error('Error al eliminar el pedido:', error);
    alert('Error al eliminar el pedido. Por favor, intente nuevamente.');
  }
};

const changeOrderStatus = (pedido: Pedido) => {
  selectedOrder.value = pedido;
  isStatusModalOpen.value = true;
};

const closeStatusModal = () => {
  isStatusModalOpen.value = false;
  selectedOrder.value = null;
};

const closeDetailsModal = () => {
  // Agregar un pequeño delay para evitar re-apertura inmediata
  setTimeout(() => {
    isDetailsModalOpen.value = false;
    selectedOrder.value = null;
  }, 100);
};

const handleStatusUpdate = () => {
  // Reload pedidos when status is updated
  fetchPedidos();
  closeDetailsModal();
};

const handleStatusChange = () => {
  // Reload pedidos when status is changed
  fetchPedidos();
  closeStatusModal();
};

// Formatters
const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: es });
};

const formatCurrency = (amount: number) => {
  return formatCurrencyHNL(amount);
};

const formatEstado = (estado: string) => {
  const estados: Record<string, string> = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    en_preparacion: 'En preparación',
    listo: 'Listo',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };
  return estados[estado] || estado;
};

const formatTipo = (tipo: string) => {
  const tipos: Record<string, string> = {
    local: 'Local',
    domicilio: 'Domicilio',
    recoger: 'Para llevar',
    mesa: 'Mesa',
  };
  return tipos[tipo] || tipo;
};

const getStatusBadgeClass = (estado: string) => {
  const classes: Record<string, string> = {
    pendiente: 'bg-amber-100 text-amber-700',
    confirmado: 'bg-orange-100 text-orange-700',
    en_preparacion: 'bg-sky-100 text-sky-700',
    'en preparacion': 'bg-sky-100 text-sky-700',
    listo: 'bg-emerald-100 text-emerald-700',
    entregado: 'bg-gray-100 text-gray-700',
    cancelado: 'bg-rose-100 text-rose-700',
  };
  return classes[estado] || 'bg-gray-100 text-gray-800';
};

const getStatusDotClass = (estado: string) => {
  const classes: Record<string, string> = {
    pendiente: 'bg-amber-500',
    confirmado: 'bg-orange-500',
    en_preparacion: 'bg-sky-500',
    'en preparacion': 'bg-sky-500',
    listo: 'bg-emerald-500',
    entregado: 'bg-gray-500',
    cancelado: 'bg-rose-500',
  };
  return classes[estado] || 'bg-gray-400';
};

const getStatStyle = (title: string) => {
  return statCardStyles[title] || statCardStyles['Pendientes'];
};

// Lifecycle
onMounted(async () => {
  await cargarRestaurantes();
  await fetchPedidos();
});
</script>
