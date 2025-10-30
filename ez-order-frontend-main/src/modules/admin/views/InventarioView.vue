<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Inventario</h1>
          <p class="text-sm font-medium text-gray-600">Control de stock y movimientos de productos</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="mostrarModalEntrada = true"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-800 hover:to-gray-900"
          >
            <Plus class="h-5 w-5" />
            <span>Entrada de Stock</span>
          </button>
          <button
            @click="mostrarModalAjuste = true"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <Settings class="h-5 w-5" />
            <span>Ajuste Manual</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="relative z-40 rounded-3xl border border-orange-100 bg-white/80 p-6 backdrop-blur">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Buscar producto</label>
          <input
            v-model="filtroBusqueda"
            type="text"
            placeholder="Nombre del producto..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Estado de stock</label>
          <CustomSelect
            v-model="filtroEstado"
            :options="estadoStockOptions"
            placeholder="Todos"
            class="w-full"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Requiere inventario</label>
          <CustomSelect
            v-model="filtroInventario"
            :options="requiereInventarioOptions"
            placeholder="Todos"
            class="w-full"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="aplicarFiltros"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 w-full"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>

    <!-- Alertas de stock bajo -->
    <div v-if="alertasStock.length > 0">
      <div class="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-red-50 p-6">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div>
            <h3 class="text-red-800 font-bold text-lg">Alertas de Stock</h3>
            <p class="text-red-600 text-sm font-medium mt-1">
              {{ alertasStock.length }} producto(s) con stock bajo o agotado
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de inventario -->
    <div class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
      <div class="overflow-x-auto">
        <!-- Estado vacío -->
        <div v-if="!cargando && inventarioFiltrado.length === 0" class="px-6 py-16">
          <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
            <div class="flex flex-col items-center gap-3">
              <Package class="h-10 w-10 text-gray-300" stroke-width="1.5" />
              <h3 class="text-sm font-semibold text-gray-700">No hay productos en inventario</h3>
              <p class="text-xs text-gray-500 max-w-sm">
                Cuando agregues productos con control de inventario, aparecerán listados aquí.
              </p>
            </div>
          </div>
        </div>

        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50/90">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Producto
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Stock Actual
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Stock Mínimo
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Estado
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Costo Unitario
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Última Actualización
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="item in inventarioFiltrado" :key="item.id" class="transition hover:bg-orange-50/60">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <img
                      v-if="item.menu.imagen"
                      :src="item.menu.imagen"
                      :alt="item.menu.nombre"
                      class="h-10 w-10 rounded-lg object-cover"
                    />
                    <div v-else class="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                      <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ item.menu.nombre }}</div>
                    <div class="text-sm text-gray-500">{{ item.unidad_medida }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">{{ item.stock_actual }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-500">{{ item.stock_minimo }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    getEstadoStock(item).clase
                  ]"
                >
                  {{ getEstadoStock(item).texto }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">L. {{ item.costo_unitario.toFixed(2) }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatearFecha(item.updated_at) }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium align-middle">
                <div class="flex justify-end gap-2">
                  <button
                    @click="verMovimientos(item)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Ver Movimientos"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                  <button
                    @click="editarInventario(item)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-blue-300 hover:text-blue-600"
                    title="Editar"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="totalPaginas > 1" class="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="paginaAnterior"
            :disabled="paginaActual === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            @click="paginaSiguiente"
            :disabled="paginaActual === totalPaginas"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Mostrando
              <span class="font-medium">{{ (paginaActual - 1) * itemsPorPagina + 1 }}</span>
              a
              <span class="font-medium">{{ Math.min(paginaActual * itemsPorPagina, inventarioFiltrado.length) }}</span>
              de
              <span class="font-medium">{{ inventarioFiltrado.length }}</span>
              resultados
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                v-for="pagina in paginasVisibles"
                :key="pagina"
                @click="irAPagina(pagina)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                  pagina === paginaActual
                    ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                ]"
              >
                {{ pagina }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Entrada de Stock -->
    <Modal
      v-model:show="mostrarModalEntrada"
      title="Entrada de Stock"
      size="md"
      @close="cerrarModalEntrada"
    >
      <form @submit.prevent="procesarEntradaStock" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Producto</label>
          <CustomSelect
            v-model="nuevaEntrada.inventario_id"
            :options="productosOptions"
            placeholder="Seleccionar producto"
            class="w-full"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
          <input
            v-model.number="nuevaEntrada.cantidad"
            type="number"
            min="1"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
            placeholder="Ingrese la cantidad"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
          <input
            v-model="nuevaEntrada.motivo"
            type="text"
            placeholder="Ej: Compra de proveedor, reposición de stock"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="cerrarModalEntrada"
            class="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            @click="procesarEntradaStock"
            class="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all duration-200 hover:-translate-y-0.5"
          >
            Registrar Entrada
          </button>
        </div>
      </template>
    </Modal>

    <!-- Modal de Ajuste Manual -->
    <Modal
      v-model:show="mostrarModalAjuste"
      title="Ajuste Manual de Stock"
      size="md"
      @close="cerrarModalAjuste"
    >
      <form @submit.prevent="procesarAjusteStock" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Producto</label>
          <CustomSelect
            v-model="nuevoAjuste.inventario_id"
            :options="productosOptions"
            placeholder="Seleccionar producto"
            class="w-full"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Ajuste</label>
          <input
            v-model.number="nuevoAjuste.cantidad"
            type="number"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
            placeholder="Positivo para aumentar, negativo para disminuir"
          />
          <p class="text-xs text-gray-500 mt-1">Use números positivos para aumentar stock, negativos para disminuir</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
          <input
            v-model="nuevoAjuste.motivo"
            type="text"
            placeholder="Ej: Ajuste por inventario físico, corrección de conteo"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="cerrarModalAjuste"
            class="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            @click="procesarAjusteStock"
            class="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:-translate-y-0.5"
          >
            Aplicar Ajuste
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { inventarioService } from '@/services/inventario_service';
import { Modal } from '@/components/ui';
import CustomSelect from '@/components/ui/CustomSelect.vue';
import { Plus, Settings, Package } from 'lucide-vue-next';

// Interfaces
interface Menu {
  id: string;
  nombre: string;
  imagen?: string;
  requiere_inventario: boolean;
}

interface InventarioItem {
  id: string;
  menu_id: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo?: number;
  unidad_medida: string;
  costo_unitario: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  menu: Menu;
}

// interface MovimientoInventario {
//   id: string;
//   inventario_id: string;
//   tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
//   cantidad: number;
//   motivo: string;
//   referencia?: string;
//   usuario_id?: string;
//   created_at: string;
// }

interface AlertaStock {
  id: string;
  inventario_id: string;
  tipo_alerta: 'stock_bajo' | 'stock_agotado' | 'stock_critico';
  mensaje: string;
  leida: boolean;
  created_at: string;
}

// Estado reactivo
const router = useRouter();
const inventario = ref<InventarioItem[]>([]);
const alertasStock = ref<AlertaStock[]>([]);
const cargando = ref(false);

// Filtros
const filtroBusqueda = ref('');
const filtroEstado = ref('');
const filtroInventario = ref('');

// Paginación
const paginaActual = ref(1);
const itemsPorPagina = 10;

// Modales
const mostrarModalEntrada = ref(false);
const mostrarModalAjuste = ref(false);

// Formularios
const nuevaEntrada = ref({
  inventario_id: '',
  cantidad: 1,
  motivo: ''
});

const nuevoAjuste = ref({
  inventario_id: '',
  cantidad: 0,
  motivo: ''
});

// Computed
const inventarioFiltrado = computed(() => {
  let items = inventario.value;

  // Filtro por búsqueda
  if (filtroBusqueda.value) {
    items = items.filter(item =>
      item.menu.nombre.toLowerCase().includes(filtroBusqueda.value.toLowerCase())
    );
  }

  // Filtro por estado de stock
  if (filtroEstado.value) {
    items = items.filter(item => {
      const estado = getEstadoStock(item).tipo;
      return estado === filtroEstado.value;
    });
  }

  // Filtro por requiere inventario
  if (filtroInventario.value) {
    const requiere = filtroInventario.value === 'true';
    items = items.filter(item => item.menu.requiere_inventario === requiere);
  }

  return items;
});

const totalPaginas = computed(() => {
  return Math.ceil(inventarioFiltrado.value.length / itemsPorPagina);
});

const paginasVisibles = computed(() => {
  const total = totalPaginas.value;
  const actual = paginaActual.value;
  const paginas = [];

  for (let i = Math.max(1, actual - 2); i <= Math.min(total, actual + 2); i++) {
    paginas.push(i);
  }

  return paginas;
});

// Opciones para filtros
const estadoStockOptions = computed(() => [
  { value: '', label: 'Todos' },
  { value: 'normal', label: 'Stock Normal' },
  { value: 'bajo', label: 'Stock Bajo' },
  { value: 'agotado', label: 'Agotado' }
]);

const requiereInventarioOptions = computed(() => [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' }
]);

const productosOptions = computed(() => [
  { value: '', label: 'Seleccionar producto' },
  ...inventario.value.map(item => ({
    value: item.id,
    label: item.menu.nombre
  }))
]);

// Métodos
const cargarInventario = async () => {
  cargando.value = true;
  try {
    // Llamada real al API
    const response = await inventarioService.obtenerInventario({
      pagina: paginaActual.value,
      limite: itemsPorPagina
    });

    if (response.ok) {
      inventario.value = response.data;
    } else {
      console.error('Error al cargar inventario:', response.message);
    }

    // Cargar alertas
    const alertasResponse = await inventarioService.obtenerAlertas({
      leida: false
    });

    if (alertasResponse.ok) {
      alertasStock.value = alertasResponse.data;
    }
  } catch (error) {
    console.error('Error al cargar inventario:', error);
  } finally {
    cargando.value = false;
  }
};

const getEstadoStock = (item: InventarioItem) => {
  if (item.stock_actual <= 0) {
    return { tipo: 'agotado', texto: 'Agotado', clase: 'bg-red-100 text-red-800' };
  } else if (item.stock_actual <= item.stock_minimo) {
    return { tipo: 'bajo', texto: 'Stock Bajo', clase: 'bg-yellow-100 text-yellow-800' };
  } else {
    return { tipo: 'normal', texto: 'Normal', clase: 'bg-green-100 text-green-800' };
  }
};

const formatearFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const aplicarFiltros = () => {
  paginaActual.value = 1;
};

const paginaAnterior = () => {
  if (paginaActual.value > 1) {
    paginaActual.value--;
  }
};

const paginaSiguiente = () => {
  if (paginaActual.value < totalPaginas.value) {
    paginaActual.value++;
  }
};

const irAPagina = (pagina: number) => {
  paginaActual.value = pagina;
};

const verMovimientos = (item: InventarioItem) => {
  // Navegar a vista de movimientos
  router.push(`/admin/inventory/movements/${item.id}`);
};

const editarInventario = (item: InventarioItem) => {
  // Abrir modal de edición
  console.log('Editar inventario:', item);
};

const cerrarModalEntrada = () => {
  mostrarModalEntrada.value = false;
  nuevaEntrada.value = {
    inventario_id: '',
    cantidad: 1,
    motivo: ''
  };
};

const cerrarModalAjuste = () => {
  mostrarModalAjuste.value = false;
  nuevoAjuste.value = {
    inventario_id: '',
    cantidad: 0,
    motivo: ''
  };
};

const procesarEntradaStock = async () => {
  try {
    const response = await inventarioService.crearMovimiento({
      inventario_id: nuevaEntrada.value.inventario_id,
      tipo_movimiento: 'entrada',
      cantidad: nuevaEntrada.value.cantidad,
      motivo: nuevaEntrada.value.motivo
    });

    if (response.ok) {
      cerrarModalEntrada();
      cargarInventario(); // Recargar datos
    } else {
      console.error('Error al procesar entrada:', response.message);
    }
  } catch (error) {
    console.error('Error al procesar entrada:', error);
  }
};

const procesarAjusteStock = async () => {
  try {
    const response = await inventarioService.crearMovimiento({
      inventario_id: nuevoAjuste.value.inventario_id,
      tipo_movimiento: 'ajuste',
      cantidad: Math.abs(nuevoAjuste.value.cantidad), // Asegurar que sea positivo
      motivo: nuevoAjuste.value.motivo
    });

    if (response.ok) {
      cerrarModalAjuste();
      cargarInventario(); // Recargar datos
    } else {
      console.error('Error al procesar ajuste:', response.message);
    }
  } catch (error) {
    console.error('Error al procesar ajuste:', error);
  }
};

// Lifecycle
onMounted(() => {
  cargarInventario();
});
</script>
