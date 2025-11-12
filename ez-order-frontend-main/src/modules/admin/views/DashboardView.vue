<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p class="text-sm font-medium text-gray-600">Bienvenido de nuevo, <span class="font-semibold">{{ authStore.userInfo?.nombre_usuario || 'Usuario' }}</span></p>
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
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Fecha Inicio</label>
          <input
            v-model="fechaInicio"
            type="date"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Fecha Fin</label>
          <input
            v-model="fechaFin"
            type="date"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="fetchPedidosRango"
            :disabled="isLoading"
            class="w-full inline-flex items-center justify-center rounded-xl border border-gray-300 bg-transparent px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Cargando...</span>
            <span v-else>Generar Reporte</span>
          </button>
        </div>
        <div class="flex items-end">
          <button
            @click="() => {
              fechaInicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              fechaFin = new Date().toISOString().split('T')[0];
              fetchPedidosRango();
            }"
            class="w-full inline-flex items-center justify-center rounded-xl border border-gray-300 bg-transparent px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-400"
          >
            Última Semana
          </button>
        </div>
      </div>
    </div>

    <!-- Reportes Table -->
    <div class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
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
            <tr
              v-for="venta in estadisticasRango.ventasPorDia"
              :key="venta.fecha"
              class="transition hover:bg-orange-50/60"
            >
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500 align-middle">
                {{ new Date(venta.fecha).toLocaleDateString('es-HN') }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle">
                {{ venta.pedidos }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 align-middle">
                {{ formatCurrencyHNL(venta.ingresos) }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 align-middle">
                <div class="flex items-center justify-center">
                  <div class="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: getProgressWidth(venta.ingresos) + '%' }"
                    ></div>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="estadisticasRango.ventasPorDia.length === 0">
              <td colspan="4" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center gap-2">
                  <div class="h-8 w-8 text-gray-300">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <p class="text-xs font-medium text-gray-500">No hay datos para mostrar en el período seleccionado</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth_store';
import { usePermissions } from '@/composables/usePermissions';
import PedidoService from '@/services/pedido_service';
import type { Pedido } from '@/interfaces/Pedido';
import type { AxiosError } from 'axios';
import { formatCurrencyHNL } from '@/utils/currency';

const authStore = useAuthStore();
const { hasPermission } = usePermissions();

// Estado
const isLoading = ref(false);
const pedidosHoy = ref<Pedido[]>([]);
const pedidosRango = ref<Pedido[]>([]);

// Fechas - por defecto hoy para KPIs, y rango para análisis
const fechaInicio = ref(new Date().toISOString().split('T')[0]);
const fechaFin = ref(new Date().toISOString().split('T')[0]);

// Computed para estadísticas del día (KPIs)
const estadisticasHoy = computed(() => {
  const pedidosConfirmados = pedidosHoy.value.filter((p) => p.estado_pedido === 'confirmado');

  return {
    totalPedidos: pedidosConfirmados.length,
    ingresoTotal: pedidosConfirmados.reduce((sum, p) => sum + p.total, 0),
    ingresoEfectivo: pedidosConfirmados
      .filter((p) => p.metodo_pago_id === 1) // Asumiendo que 1 es efectivo
      .reduce((sum, p) => sum + p.total, 0),
    ingresoTarjeta: pedidosConfirmados
      .filter((p) => p.metodo_pago_id !== 1)
      .reduce((sum, p) => sum + p.total, 0),
    clientesUnicos: new Set(pedidosConfirmados.map((p) => p.cliente_id).filter(Boolean)).size,
    ticketPromedio:
      pedidosConfirmados.length > 0
        ? pedidosConfirmados.reduce((sum, p) => sum + p.total, 0) / pedidosConfirmados.length
        : 0,
  };
});

// Stats for the cards
const stats = computed(() => [
  {
    title: 'Pedidos Totales',
    value: estadisticasHoy.value.totalPedidos,
    icon: ShoppingBagIcon,
  },
  {
    title: 'Ingreso Total',
    value: formatCurrencyHNL(estadisticasHoy.value.ingresoTotal),
    icon: CurrencyDollarIcon,
  },
  {
    title: 'Clientes Únicos',
    value: estadisticasHoy.value.clientesUnicos,
    icon: UserGroupIcon,
  },
  {
    title: 'Ticket Promedio',
    value: formatCurrencyHNL(estadisticasHoy.value.ticketPromedio),
    icon: ChartBarIcon,
  },
]);

// Table headers
const tableHeaders = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'progreso', label: 'Progreso' },
];

// Computed para estadísticas del rango de fechas
const estadisticasRango = computed(() => {
  const pedidosConfirmados = pedidosRango.value.filter((p) => p.estado_pedido === 'confirmado');

  // Ventas por día
  const ventasPorDia = pedidosConfirmados.reduce(
    (acc, pedido) => {
      const fecha = new Date(pedido.created_at).toISOString().split('T')[0];
      if (!acc[fecha]) {
        acc[fecha] = { pedidos: 0, ingresos: 0 };
      }
      acc[fecha].pedidos += 1;
      acc[fecha].ingresos += pedido.total;
      return acc;
    },
    {} as Record<string, { pedidos: number; ingresos: number }>,
  );

  return {
    totalPedidos: pedidosConfirmados.length,
    ingresoTotal: pedidosConfirmados.reduce((sum, p) => sum + p.total, 0),
    clientesUnicos: new Set(pedidosConfirmados.map((p) => p.cliente_id).filter(Boolean)).size,
    ticketPromedio:
      pedidosConfirmados.length > 0
        ? pedidosConfirmados.reduce((sum, p) => sum + p.total, 0) / pedidosConfirmados.length
        : 0,
    ventasPorDia: Object.entries(ventasPorDia)
      .map(([fecha, data]) => ({ fecha, ...data }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
  };
});

// Métodos
const getStatStyle = (title: string) => {
  const statCardStyles: Record<string, {
    container: string;
    iconWrapper: string;
    title: string;
    value: string;
    bar: string;
    barFill: string;
  }> = {
    'Pedidos Totales': {
      container: 'bg-gradient-to-br from-orange-50 via-white to-orange-50 border border-orange-200 hover:border-orange-300 p-5',
      iconWrapper: 'w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
      title: 'text-orange-600',
      value: 'text-orange-700',
      bar: 'bg-orange-100',
      barFill: 'bg-gradient-to-r from-orange-500 to-orange-600'
    },
    'Ingreso Total': {
      container: 'bg-gradient-to-br from-amber-50 via-white to-amber-50 border border-amber-200 hover:border-amber-300 p-5',
      iconWrapper: 'w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
      title: 'text-amber-600',
      value: 'text-amber-700',
      bar: 'bg-amber-100',
      barFill: 'bg-gradient-to-r from-amber-500 to-orange-600'
    },
    'Clientes Únicos': {
      container: 'bg-gradient-to-br from-orange-50 via-white to-amber-50 border border-orange-200 hover:border-orange-300 p-5',
      iconWrapper: 'w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
      title: 'text-orange-600',
      value: 'text-orange-700',
      bar: 'bg-orange-100',
      barFill: 'bg-gradient-to-r from-orange-400 to-amber-600'
    },
    'Ticket Promedio': {
      container: 'bg-gradient-to-br from-orange-50 via-white to-orange-100 border border-orange-300 hover:border-orange-400 p-5',
      iconWrapper: 'w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
      title: 'text-orange-700',
      value: 'text-orange-800',
      bar: 'bg-orange-200',
      barFill: 'bg-gradient-to-r from-orange-600 to-orange-700'
    }
  };
  return statCardStyles[title] || statCardStyles['Pedidos Totales'];
};

const getProgressWidth = (ingresos: number) => {
  const maxIngreso = Math.max(...estadisticasRango.value.ventasPorDia.map(v => v.ingresos));
  return maxIngreso > 0 ? (ingresos / maxIngreso) * 100 : 0;
};


const fetchPedidosHoy = async () => {
  // Verificar permiso antes de cargar datos
  if (!hasPermission('pedidos.ver').value) {
    return;
  }

  try {
    const hoy = new Date().toISOString().split('T')[0];
    const response = await PedidoService.getAll();

    if (response.data.success) {
      pedidosHoy.value = response.data.data.filter((pedido) => {
        const fechaPedido = new Date(pedido.created_at).toISOString().split('T')[0];
        return fechaPedido === hoy && pedido.restaurante_id === authStore.userInfo?.restaurante_id;
      });
    }
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response?.status === 403) {
      console.info('Permiso pedidos.ver no asignado, omitiendo datos del dashboard.');
      return;
    }

    console.error('Error al obtener pedidos de hoy:', error);
  }
};

const fetchPedidosRango = async () => {
  // Verificar permiso antes de cargar datos
  if (!hasPermission('pedidos.ver').value) {
    return;
  }

  if (!fechaInicio.value || !fechaFin.value) return;

  isLoading.value = true;
  try {
    const response = await PedidoService.getAll();

    if (response.data.success) {
      pedidosRango.value = response.data.data.filter((pedido) => {
        const fechaPedido = new Date(pedido.created_at).toISOString().split('T')[0];
        return (
          fechaPedido >= fechaInicio.value &&
          fechaPedido <= fechaFin.value &&
          pedido.restaurante_id === authStore.userInfo?.restaurante_id
        );
      });
    }
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response?.status === 403) {
      console.info('Permiso pedidos.ver no asignado, omitiendo datos del dashboard.');
      return;
    }

    console.error('Error al obtener pedidos del rango:', error);
  } finally {
    isLoading.value = false;
  }
};

// Lifecycle
onMounted(() => {
  fetchPedidosHoy();
  fetchPedidosRango();
});
</script>
