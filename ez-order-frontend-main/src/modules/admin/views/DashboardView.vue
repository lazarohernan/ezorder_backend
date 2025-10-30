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
            class="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 disabled:bg-gray-400"
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
            class="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
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
                L {{ venta.ingresos.toFixed(2) }}
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
              <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                No hay datos para mostrar en el período seleccionado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Métodos de pago -->
    <div class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
      <div class="p-6">
        <div class="flex items-center mb-6">
          <CreditCardIcon class="h-6 w-6 text-blue-600 mr-3" />
          <h3 class="text-lg font-semibold text-gray-800">Métodos de Pago</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="metodo in estadisticasRango.metodosPago"
            :key="metodo.metodo"
            class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200"
          >
            <div class="flex items-center justify-between mb-2">
              <p class="font-medium text-gray-900">{{ metodo.metodo }}</p>
              <p class="text-sm text-gray-600">{{ metodo.cantidad }} transacciones</p>
            </div>
            <p class="text-xl font-bold text-green-600">L {{ metodo.ingresos.toFixed(2) }}</p>
            <div class="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: getPaymentProgressWidth(metodo.ingresos) + '%' }"
              ></div>
            </div>
          </div>
          <div v-if="estadisticasRango.metodosPago.length === 0" class="col-span-2 text-center text-gray-500 py-8">
            No hay datos de métodos de pago para mostrar
          </div>
        </div>
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
  CreditCardIcon,
} from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth_store';
import PedidoService from '@/services/pedido_service';
import type { Pedido } from '@/interfaces/Pedido';

const authStore = useAuthStore();

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
    value: `L ${estadisticasHoy.value.ingresoTotal.toFixed(2)}`,
    icon: CurrencyDollarIcon,
  },
  {
    title: 'Clientes Únicos',
    value: estadisticasHoy.value.clientesUnicos,
    icon: UserGroupIcon,
  },
  {
    title: 'Ticket Promedio',
    value: `L ${estadisticasHoy.value.ticketPromedio.toFixed(2)}`,
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

  // Métodos de pago
  const metodosPago = pedidosConfirmados.reduce(
    (acc, pedido) => {
      const metodo = pedido.metodo_pago_id === 1 ? 'Efectivo' : 'Tarjeta/Otros';
      if (!acc[metodo]) {
        acc[metodo] = { cantidad: 0, ingresos: 0 };
      }
      acc[metodo].cantidad += 1;
      acc[metodo].ingresos += pedido.total;
      return acc;
    },
    {} as Record<string, { cantidad: number; ingresos: number }>,
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
    metodosPago: Object.entries(metodosPago).map(([metodo, data]) => ({ metodo, ...data })),
  };
});

// Métodos
const getStatStyle = (title: string) => {
  const styles = {
    'Pedidos Totales': {
      container: 'bg-gradient-to-br from-blue-500 to-blue-600 p-4',
      title: 'text-blue-100',
      value: 'text-white',
      iconWrapper: 'bg-blue-400/50',
      bar: 'bg-blue-400/50',
      barFill: 'bg-white',
    },
    'Ingreso Total': {
      container: 'bg-gradient-to-br from-green-500 to-green-600 p-4',
      title: 'text-green-100',
      value: 'text-white',
      iconWrapper: 'bg-green-400/50',
      bar: 'bg-green-400/50',
      barFill: 'bg-white',
    },
    'Clientes Únicos': {
      container: 'bg-gradient-to-br from-purple-500 to-purple-600 p-4',
      title: 'text-purple-100',
      value: 'text-white',
      iconWrapper: 'bg-purple-400/50',
      bar: 'bg-purple-400/50',
      barFill: 'bg-white',
    },
    'Ticket Promedio': {
      container: 'bg-gradient-to-br from-orange-500 to-orange-600 p-4',
      title: 'text-orange-100',
      value: 'text-white',
      iconWrapper: 'bg-orange-400/50',
      bar: 'bg-orange-400/50',
      barFill: 'bg-white',
    },
  };
  return styles[title as keyof typeof styles] || styles['Pedidos Totales'];
};

const getProgressWidth = (ingresos: number) => {
  const maxIngreso = Math.max(...estadisticasRango.value.ventasPorDia.map(v => v.ingresos));
  return maxIngreso > 0 ? (ingresos / maxIngreso) * 100 : 0;
};

const getPaymentProgressWidth = (ingresos: number) => {
  const maxIngreso = Math.max(...estadisticasRango.value.metodosPago.map(m => m.ingresos));
  return maxIngreso > 0 ? (ingresos / maxIngreso) * 100 : 0;
};

const fetchPedidosHoy = async () => {
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
    console.error('Error al obtener pedidos de hoy:', error);
  }
};

const fetchPedidosRango = async () => {
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
