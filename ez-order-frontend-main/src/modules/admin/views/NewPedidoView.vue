<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  InformationCircleIcon, 
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  ShoppingBagIcon
} from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth_store';
import type { Menu } from '@/interfaces/Menu';
import type { Cliente } from '@/interfaces/Cliente';
import type { CreatePedidoDTO, TipoPedido, EstadoPedido, Pedido } from '@/interfaces/Pedido';
import type { CreatePedidoItemDTO, PedidoItem } from '@/interfaces/PedidoItem';
import MenuService from '@/services/menu_service';
import PedidoService from '@/services/pedido_service';
import PedidoItemService from '@/services/pedidoItem_service';
import ClientesService from '@/services/clientes_service';
import RestaurantesService from '@/services/restaurantes_service';
import metodoPagoService from '@/services/metodo_pago_services';
import { CategoriasService, type CategoriaMenu } from '@/services/categorias_service';
import PDFService, { type InvoiceData } from '@/services/pdf_service';
import { inventarioService } from '@/services/inventario_service';
import { useToast } from 'vue-toastification';
import MenuItemInformationModal from '../components/MenuItemInformationModal.vue';
import ConfirmarPedidoModal from '../components/ConfirmarPedidoModal.vue';
import foodPlaceholder from '@/assets/food-placeholder.svg';
import CustomSelect from '@/components/ui/CustomSelect.vue';
import { cajaService } from '@/services/caja_service';
import { formatCurrencyHNL } from '@/utils/currency';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

// State
const isLoading = ref(false);
const menus = ref<Menu[]>([]);
const clientes = ref<Cliente[]>([]);
const categorias = ref<CategoriaMenu[]>([]);
const searchMenu = ref('');
const selectedMenuForInfo = ref<Menu | null>(null);
const isInfoModalOpen = ref(false);
const isConfirmModalOpen = ref(false);
const selectedCategoria = ref<string | null>(null);

// Formulario del pedido
const formData = ref<CreatePedidoDTO>({
  restaurante_id: authStore.userInfo?.restaurante_id || '',
  tipo_pedido: 'local' as TipoPedido,
  estado_pedido: 'pendiente',
  mesa: null,
  direccion_entrega: null,
  notas: null,
  total: 0,
  subtotal: 0,
  impuesto: 0,
  descuento: 0,
  pagado: false,
  metodo_pago_id: 1,
  importe_gravado: 0,
  importe_exento: 0,
  importe_exonerado: 0,
});

// Items del pedido
interface PedidoItemLocal extends CreatePedidoItemDTO {
  cantidad: number;
  es_exento?: boolean;
  es_exonerado?: boolean;
}

const pedidoItems = ref<PedidoItemLocal[]>([]);

const confirmarPedidoModal = ref<InstanceType<typeof ConfirmarPedidoModal> | null>(null);

// Layout state for resizable panels (only applied on pantallas grandes)
const layoutContainer = ref<HTMLElement | null>(null);
const defaultPanelWidth = 62;
const storedWidth = typeof window !== 'undefined'
  ? parseFloat(localStorage.getItem('newPedidoLeftPanelWidth') || `${defaultPanelWidth}`)
  : defaultPanelWidth;
const leftPanelWidth = ref<number>(isNaN(storedWidth) ? defaultPanelWidth : storedWidth);
const isDraggingDivider = ref(false);
const minLeftWidth = 55;
const maxLeftWidth = 75;

// Estado del acordeón de información del pedido
const isOrderInfoCollapsed = ref<boolean>(false);

const leftPanelStyle = computed(() => ({ flexBasis: `${leftPanelWidth.value}%` }));
const rightPanelStyle = computed(() => ({ flexBasis: `${100 - leftPanelWidth.value}%` }));

const tipoPedidoOptions = [
  { label: 'Local', value: 'local' as TipoPedido, icon: BuildingStorefrontIcon },
  { label: 'Domicilio', value: 'domicilio' as TipoPedido, icon: TruckIcon },
  { label: 'Para llevar', value: 'recoger' as TipoPedido, icon: ShoppingBagIcon },
  { label: 'Mesa', value: 'mesa' as TipoPedido }
];

// Primeros 3 tipos para mostrar como chips (con iconos)
const tipoPedidoChips = tipoPedidoOptions.slice(0, 3);

const clienteOptions = computed(() => [
  { label: 'Sin cliente', value: null },
  ...clientes.value.map((cliente) => ({
    label: cliente.nombre_cliente,
    value: cliente.id,
  })),
]);

// Computed
const filteredMenus = computed(() => {
  let filtered = menus.value;

  // Filtrar por búsqueda de texto
  if (searchMenu.value) {
    filtered = filtered.filter(
      (menu) =>
        menu.nombre.toLowerCase().includes(searchMenu.value.toLowerCase()) ||
        menu.descripcion?.toLowerCase().includes(searchMenu.value.toLowerCase()),
    );
  }

  // Filtrar por categoría seleccionada
  if (selectedCategoria.value) {
    filtered = filtered.filter((menu) => menu.categoria_id === selectedCategoria.value);
  }

  return filtered;
});

const subtotal = computed(() => {
  return pedidoItems.value.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);
});

const totalImpuestos = computed(() => {
  return pedidoItems.value.reduce((sum, item) => {
    const impuestoItem = (item.impuesto_unitario || 0) * item.cantidad;
    return sum + impuestoItem;
  }, 0);
});

const total = computed(() => {
  return subtotal.value + totalImpuestos.value - (formData.value.descuento || 0);
});

// Computed para los campos de facturación según sistema fiscal hondureño
const importeExento = computed(() => {
  // Items marcados como exentos de ISV por ley
  return pedidoItems.value.reduce((sum, item) => {
    if (item.es_exento) {
      return sum + item.precio_unitario * item.cantidad;
    }
    return sum;
  }, 0);
});

const importeExonerado = computed(() => {
  // Items temporalmente liberados de ISV por decretos especiales
  return pedidoItems.value.reduce((sum, item) => {
    if (item.es_exonerado) {
      return sum + item.precio_unitario * item.cantidad;
    }
    return sum;
  }, 0);
});

const importeGravado = computed(() => {
  // Items que SÍ pagan ISV (15% en Honduras) - ni exentos ni exonerados
  return pedidoItems.value.reduce((sum, item) => {
    if (!item.es_exento && !item.es_exonerado) {
      return sum + item.precio_unitario * item.cantidad;
    }
    return sum;
  }, 0);
});

// Methods
const fetchMenus = async () => {
  try {
    if (!authStore.userInfo?.restaurante_id) {
      console.error('No se encontró restaurante_id');
      return;
    }

    const response = await MenuService.getByRestauranteId(authStore.userInfo.restaurante_id);
    menus.value = response.data.data.filter((menu) => menu.activo);
  } catch (error) {
    console.error('Error al cargar los menús:', error);
  }
};

const fetchClientes = async () => {
  try {
    if (!authStore.userInfo?.restaurante_id) {
      console.error('No se encontró restaurante_id');
      return;
    }

    const response = await ClientesService.getByRestauranteId(authStore.userInfo.restaurante_id);
    clientes.value = response.data.data;
  } catch (error) {
    console.error('Error al cargar los clientes:', error);
  }
};

const fetchCategorias = async () => {
  try {
    const response = await CategoriasService.getAll();
    categorias.value = response.data.data || [];
  } catch (error) {
    console.error('Error al cargar las categorías:', error);
  }
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  if (img) {
    img.src = foodPlaceholder;
  }
};

const showMenuInfo = (menu: Menu) => {
  selectedMenuForInfo.value = menu;
  isInfoModalOpen.value = true;
};

const closeInfoModal = () => {
  isInfoModalOpen.value = false;
  selectedMenuForInfo.value = null;
};

const agregarMenuItem = async (menu: Menu) => {
  // Si el producto requiere inventario, verificar stock
  if (menu.requiere_inventario) {
    try {
      const existingItemIndex = pedidoItems.value.findIndex((item) => item.menu_id === menu.id);
      const cantidadSolicitada = existingItemIndex !== -1 ? pedidoItems.value[existingItemIndex].cantidad + 1 : 1;
      
      const { ok, disponible, stock_actual } = await inventarioService.verificarStockDisponible(
        menu.id,
        cantidadSolicitada
      );

      if (ok && !disponible) {
        toast.error(
          `Stock insuficiente. Disponible: ${stock_actual}. Solicitado: ${cantidadSolicitada}`
        );
        return;
      }
    } catch (error) {
      console.error('Error al verificar stock:', error);
      toast.error('Error al verificar disponibilidad de stock');
      return;
    }
  }

  // Agregar item al pedido
  const existingItemIndex = pedidoItems.value.findIndex((item) => item.menu_id === menu.id);

  if (existingItemIndex !== -1) {
    // Si ya existe, aumentar cantidad
    pedidoItems.value[existingItemIndex].cantidad++;
  } else {
    // Calcular impuesto solo si NO es exento ni exonerado
    const impuestoUnitario =
      !menu.es_exento && !menu.es_exonerado && menu.precio && menu.porcentaje_impuesto
        ? (menu.precio * menu.porcentaje_impuesto) / 100
        : 0;

    pedidoItems.value.push({
      pedido_id: '', // Se asignará después de crear el pedido
      menu_id: menu.id,
      nombre_menu: menu.nombre,
      cantidad: 1,
      precio_unitario: menu.precio || 0,
      impuesto_unitario: impuestoUnitario,
      total_item: (menu.precio || 0) + impuestoUnitario,
      notas: null,
      enviado_a_cocina: false,
      // Agregamos las propiedades del menú para los cálculos
      es_exento: menu.es_exento || false,
      es_exonerado: menu.es_exonerado || false,
    });
  }
};

const aumentarCantidad = async (index: number) => {
  const item = pedidoItems.value[index];
  const menu = menus.value.find(m => m.id === item.menu_id);
  
  // Si el producto requiere inventario, verificar stock
  if (menu?.requiere_inventario) {
    try {
      const { ok, disponible, stock_actual } = await inventarioService.verificarStockDisponible(
        item.menu_id,
        item.cantidad + 1
      );

      if (ok && !disponible) {
        toast.error(
          `Stock insuficiente. Disponible: ${stock_actual}. Solicitado: ${item.cantidad + 1}`
        );
        return;
      }
    } catch (error) {
      console.error('Error al verificar stock:', error);
      toast.error('Error al verificar disponibilidad de stock');
      return;
    }
  }

  pedidoItems.value[index].cantidad++;
};

const disminuirCantidad = (index: number) => {
  if (pedidoItems.value[index].cantidad > 1) {
    pedidoItems.value[index].cantidad--;
  } else {
    eliminarItem(index);
  }
};

const eliminarItem = (index: number) => {
  pedidoItems.value.splice(index, 1);
};

const limpiarPedido = () => {
  pedidoItems.value = [];
  formData.value.notas = null;
  formData.value.mesa = null;
  formData.value.direccion_entrega = null;
  formData.value.cliente_id = null;
  formData.value.descuento = 0;
  formData.value.estado_pedido = 'pendiente';
  // Los importes se calculan automáticamente, no necesitan reset manual
};

const abrirModalConfirmacion = () => {
  if (pedidoItems.value.length === 0) {
    alert('Debe agregar al menos un item al pedido');
    return;
  }

  // Actualizar totales en formData antes de mostrar el modal
  formData.value.total = total.value;
  formData.value.subtotal = subtotal.value;
  formData.value.impuesto = totalImpuestos.value;
  formData.value.importe_gravado = importeGravado.value;
  formData.value.importe_exento = importeExento.value;
  formData.value.importe_exonerado = importeExonerado.value;

  isConfirmModalOpen.value = true;
};

const cerrarModalConfirmacion = () => {
  isConfirmModalOpen.value = false;
};

const procesarEntregaFactura = async (
  pedido: Pedido,
  items: PedidoItem[],
  deliveryMethod: string,
  whatsappNumber?: string,
) => {
  try {
    // Obtener información real del restaurante
    const restauranteResponse = await RestaurantesService.getById(
      authStore.userInfo?.restaurante_id || '',
    );

    if (!restauranteResponse.data.data) {
      throw new Error('No se pudo obtener información del restaurante');
    }

    const restauranteInfo = restauranteResponse.data.data;

    // Obtener información del método de pago
    let metodoPagoInfo = undefined;
    try {
      const metodoPagoResponse = await metodoPagoService.getById(pedido.metodo_pago_id);
      metodoPagoInfo = metodoPagoResponse.data.data;
    } catch (error) {
      console.warn('No se pudo obtener información del método de pago:', error);
    }

    const invoiceData: InvoiceData = {
      pedido,
      items,
      restaurante: restauranteInfo,
      metodoPago: metodoPagoInfo,
    };

    switch (deliveryMethod) {
      case 'whatsapp':
        if (whatsappNumber) {
          const pdf = PDFService.generateNormalPDF(invoiceData);
          await PDFService.sendViaWhatsApp(pdf, whatsappNumber, pedido.id);
        }
        break;

      case 'print_normal':
        const normalPdf = PDFService.generateNormalPDF(invoiceData);
        PDFService.printPDF(normalPdf);
        break;

      case 'print_80mm':
        const thermalPdf = PDFService.generate80mmPDF(invoiceData);
        PDFService.printPDF(thermalPdf);
        break;
    }

    return {
      success: true,
      message: 'Pedido confirmado y factura generada correctamente.',
    };
  } catch (error) {
    console.error('Error al procesar entrega de factura:', error);
    return {
      success: false,
      message: 'El pedido se creó correctamente, pero hubo un problema con la factura.',
    };
  }
};

const crearPedido = async (
  metodoPagoId: number,
  deliveryMethod: string,
  estadoPedido: string,
  ticketNumber: number,
  whatsappNumber?: string,
) => {
  isLoading.value = true;

  try {

    // Asignar el método de pago, estado y número de ticket seleccionados
    formData.value.metodo_pago_id = metodoPagoId;
    formData.value.estado_pedido = estadoPedido as EstadoPedido;
    formData.value.numero_ticket = ticketNumber;

    // Si el estado es confirmado, marcar como pagado
    if (estadoPedido === 'confirmado') {
      formData.value.pagado = true;
    }

    // Crear el pedido
    const pedidoResponse = await PedidoService.create(formData.value);

    if (pedidoResponse.data.success) {
      const pedidoId = pedidoResponse.data.data.id;
      const pedidoCreado = pedidoResponse.data.data;

      // Preparar items con pedido_id
      const itemsToCreate = pedidoItems.value.map((item) => ({
        ...item,
        pedido_id: pedidoId,
        total_item:
          item.precio_unitario * item.cantidad + (item.impuesto_unitario || 0) * item.cantidad,
      }));

      // Crear items del pedido
      const itemsResponse = await PedidoItemService.createBatch(itemsToCreate);

      // Procesar entrega de factura
      let entrega = {
        success: true,
        message: 'Pedido confirmado correctamente.',
      };

      if (itemsResponse.data.success) {
        entrega = await procesarEntregaFactura(
          pedidoCreado,
          itemsResponse.data.data,
          deliveryMethod,
          whatsappNumber,
        );
      } else {
        entrega = {
          success: false,
          message: 'El pedido se creó, pero no se pudieron registrar los items del pedido.',
        };
      }

      confirmarPedidoModal.value?.handleConfirmationResult(
        entrega.success,
        entrega.message,
      );
      limpiarPedido();
    }
  } catch (error: any) {
    console.error('Error al crear el pedido:', error);
    const errorMessage = error?.response?.data?.message || error?.message || 'Error al crear el pedido. Por favor, intente nuevamente.';
    confirmarPedidoModal.value?.handleConfirmationResult(
      false,
      errorMessage,
    );
  } finally {
    isLoading.value = false;
  }
};

const goBack = () => {
  router.push({ name: 'orders' });
};

const toggleOrderInfo = () => {
  isOrderInfoCollapsed.value = !isOrderInfoCollapsed.value;
};

const selectCategoria = (categoriaId: string | null) => {
  selectedCategoria.value = categoriaId;
};

// Divider handlers
const updatePanelWidth = (clientX: number) => {
  const container = layoutContainer.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const relativeX = ((clientX - rect.left) / rect.width) * 100;
  const clamped = Math.min(maxLeftWidth, Math.max(minLeftWidth, relativeX));
  leftPanelWidth.value = clamped;
  if (typeof window !== 'undefined') {
    localStorage.setItem('newPedidoLeftPanelWidth', clamped.toFixed(1));
  }
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDraggingDivider.value) return;
  updatePanelWidth(event.clientX);
};

const stopDragging = () => {
  if (!isDraggingDivider.value) return;
  isDraggingDivider.value = false;
  document.body.style.cursor = '';
};

const startDragging = (event: MouseEvent) => {
  if (!layoutContainer.value) return;
  isDraggingDivider.value = true;
  document.body.style.cursor = 'col-resize';
  updatePanelWidth(event.clientX);
  event.preventDefault();
};

// Lifecycle
onMounted(() => {
  fetchMenus();
  fetchClientes();
  fetchCategorias();
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', stopDragging);
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', stopDragging);
  stopDragging();
});
</script>

<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <span class="inline-flex items-center gap-2 rounded-full bg-orange-100/70 px-3 py-1 text-xs font-semibold text-orange-600">
            Nuevo Pedido
          </span>
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Crea una Orden</h1>
          <p class="text-sm text-gray-600">
            Selecciona los menús disponibles y completa la información para generar un pedido.
          </p>
        </div>
        <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            @click="goBack"
            class="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white/80 px-4 py-2 text-sm font-semibold text-orange-600 transition hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-700"
          >
            <ArrowLeftIcon class="h-5 w-5" />
            <span>Volver a pedidos</span>
          </button>
          <div class="rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-2 text-sm text-orange-700">
            <p class="font-semibold">Items agregados</p>
            <p class="text-xs text-orange-500">{{ pedidoItems.length }} artículos seleccionados</p>
          </div>
        </div>
      </div>
    </div>

    <div
      ref="layoutContainer"
      class="flex flex-col gap-6 xl:flex-row xl:items-stretch"
    >
        <!-- Formulario y Menús -->
        <div
          class="space-y-6 xl:flex xl:flex-col"
          :style="leftPanelStyle"
        >
          <div class="rounded-2xl border border-gray-100 bg-white/90 p-6 backdrop-blur">
            <div class="mb-5 flex items-center justify-between">
              <h2 class="text-xl font-semibold text-gray-900">Información del Pedido</h2>
              <div class="flex items-center gap-3">
                <span class="text-xs font-medium text-gray-400">Completa los datos principales</span>
                <button
                  @click="toggleOrderInfo"
                  class="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:text-orange-700"
                >
                  <svg 
                    class="h-4 w-4 transition-transform duration-200" 
                    :class="{ 'rotate-180': isOrderInfoCollapsed }"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  {{ isOrderInfoCollapsed ? 'Mostrar' : 'Ocultar' }}
                </button>
              </div>
            </div>

            <!-- Transición para el formulario -->
            <transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-screen"
              leave-active-class="transition-all duration-300 ease-in"
              leave-from-class="opacity-100 max-h-screen"
              leave-to-class="opacity-0 max-h-0"
            >
              <form v-show="!isOrderInfoCollapsed" @submit.prevent class="space-y-6 overflow-visible">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <!-- Tipo de Pedido -->
              <div class="space-y-2">
                <label class="text-sm font-semibold text-gray-700">Tipo de Pedido</label>
                <!-- Chips para los primeros 3 tipos con iconos -->
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in tipoPedidoChips"
                    :key="option.value"
                    type="button"
                    @click="formData.tipo_pedido = option.value"
                    :class="[
                      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
                      formData.tipo_pedido === option.value
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                        : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                    ]"
                  >
                    <component :is="option.icon" class="h-5 w-5" />
                    <span>{{ option.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Cliente (opcional) -->
              <div class="relative z-[100] space-y-2">
                <label class="text-sm font-semibold text-gray-700">Cliente (Opcional)</label>
                <CustomSelect
                  v-model="formData.cliente_id"
                  :options="clienteOptions"
                  placeholder="Selecciona un cliente"
                />
              </div>
            </div>

            <!-- Mesa (solo si es tipo mesa) -->
            <div v-if="formData.tipo_pedido === 'mesa'" class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-semibold text-gray-700">Mesa</label>
                <input
                  v-model="formData.mesa"
                  type="text"
                  placeholder="Número de mesa"
                  class="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-700 transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            </div>

            <!-- Dirección (solo si es domicilio) -->
            <div v-if="formData.tipo_pedido === 'domicilio'" class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Dirección de Entrega</label>
              <textarea
                v-model="formData.direccion_entrega"
                placeholder="Dirección completa de entrega"
                rows="3"
                class="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-700 transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              ></textarea>
            </div>

            <!-- Notas -->
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Notas del Pedido</label>
              <textarea
                v-model="formData.notas"
                placeholder="Instrucciones especiales o comentarios adicionales"
                rows="3"
                class="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-700 transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              ></textarea>
            </div>
              </form>
            </transition>
          </div>

        <!-- Menús Disponibles -->
        <div class="rounded-2xl border border-gray-100 bg-white/90 p-6 backdrop-blur">
          <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Menús Disponibles</h2>
              <p class="text-sm text-gray-500">Explora y agrega productos al pedido</p>
            </div>
            <span class="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
              {{ filteredMenus.length }} opciones
            </span>
          </div>

          <!-- Búsqueda de menús -->
          <div class="mb-6">
            <div class="relative">
              <MagnifyingGlassIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="searchMenu"
                type="text"
                placeholder="Buscar por nombre o descripción..."
                class="w-full rounded-xl border border-gray-200 bg-white/70 py-2 pl-10 pr-3 text-sm text-gray-700 transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>

          <!-- Carrusel de Categorías -->
          <div class="mb-6">
            <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <!-- Chip "Todas" -->
              <button
                @click="selectCategoria(null)"
                :class="[
                  'flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
                  selectedCategoria === null
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                ]"
              >
                Todas
              </button>
              
              <!-- Chips de categorías -->
              <button
                v-for="categoria in categorias"
                :key="categoria.id"
                @click="selectCategoria(categoria.id)"
                :class="[
                  'flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
                  selectedCategoria === categoria.id
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                ]"
              >
                {{ categoria.nombre }}
              </button>
            </div>
          </div>

          <!-- Lista de menús -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="menu in filteredMenus"
              :key="menu.id"
              class="group rounded-2xl border border-gray-200 bg-white/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-orange-300"
            >
              <div class="flex items-start gap-3">
                <!-- Imagen del menú -->
                <div class="flex-shrink-0 overflow-hidden rounded-xl border border-orange-100 bg-orange-50">
                  <img
                    v-if="menu.imagen"
                    :src="menu.imagen"
                    :alt="menu.nombre"
                    class="h-16 w-16 object-cover"
                    @error="handleImageError"
                  />
                  <div v-else class="flex h-16 w-16 items-center justify-center">
                    <div class="h-10 w-10 text-orange-500" v-html="foodPlaceholder"></div>
                  </div>
                </div>

                <!-- Información del menú -->
                <div class="min-w-0 flex-1">
                  <h3 class="truncate text-sm font-semibold text-gray-900">{{ menu.nombre }}</h3>
                  <p class="mt-1 line-clamp-2 text-xs text-gray-500">{{ menu.descripcion }}</p>
                  <p class="mt-3 text-sm font-semibold text-orange-600">{{ formatCurrencyHNL(menu.precio || 0) }}</p>
                </div>

                <!-- Botones de acción -->
                <div class="flex flex-col items-center gap-2">
                  <button
                    @click="showMenuInfo(menu)"
                    class="rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Ver información completa"
                  >
                    <InformationCircleIcon class="h-4 w-4" />
                  </button>
                  <button
                    @click="agregarMenuItem(menu)"
                    class="rounded-full bg-gradient-to-br from-orange-500 to-orange-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:from-orange-600 hover:to-orange-700"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="filteredMenus.length === 0" class="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-8 text-center text-sm text-gray-500">
            No se encontraron menús disponibles
          </div>
        </div>
      </div>

      <!-- Divider for resizing on desktop -->
      <div class="hidden xl:flex xl:w-5 xl:flex-shrink-0 xl:items-stretch xl:justify-center">
        <div
          class="my-8 w-1 rounded-full bg-orange-200 transition hover:bg-orange-300"
          :class="{ 'bg-orange-300': isDraggingDivider }"
          @mousedown="startDragging"
        ></div>
      </div>

      <!-- Resumen del Pedido -->
      <div
        class="xl:flex xl:flex-col"
        :style="rightPanelStyle"
      >
        <div class="sticky top-8 space-y-6">
          <div class="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 backdrop-blur">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Resumen del Pedido</h2>
              <span class="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                {{ pedidoItems.length }} ítems
              </span>
            </div>

            <!-- Items del pedido -->
            <div class="space-y-3">
              <div
                v-for="(item, index) in pedidoItems"
                :key="index"
                class="flex items-center justify-between rounded-xl border border-orange-100 bg-white/80 p-3"
              >
                <div class="flex-1 pr-3">
                  <h4 class="text-sm font-semibold text-gray-900">{{ item.nombre_menu }}</h4>
                  <p class="text-xs text-gray-500">{{ formatCurrencyHNL(item.precio_unitario || 0) }} c/u</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="disminuirCantidad(index)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                  >
                    -
                  </button>
                  <span class="w-6 text-center text-sm font-semibold text-gray-700">{{ item.cantidad }}</span>
                  <button
                    @click="aumentarCantidad(index)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                  >
                    +
                  </button>
                  <button
                    @click="eliminarItem(index)"
                    class="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100"
                  >
                    <TrashIcon class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="pedidoItems.length === 0" class="rounded-xl border border-dashed border-orange-200 bg-white/60 py-6 text-center text-sm text-orange-500">
              No hay items en el pedido
            </div>

            <!-- Totales -->
            <div class="mt-6 space-y-3 rounded-xl border border-orange-100 bg-white/70 p-4 text-sm text-gray-600">
              <div class="flex justify-between">
                <span>Subtotal</span>
                <span class="font-semibold text-gray-900">{{ formatCurrencyHNL(subtotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-orange-600">Importe Exonerado</span>
                <span class="font-semibold text-orange-600">{{ formatCurrencyHNL(importeExonerado) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-orange-500">Importe Exento</span>
                <span class="font-semibold text-orange-500">{{ formatCurrencyHNL(importeExento) }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <label for="descuento-general" class="text-gray-600">Descuento general</label>
                <div class="flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-2 py-1">
                  <span class="text-xs text-gray-400">L</span>
                  <input
                    id="descuento-general"
                    v-model.number="formData.descuento"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="w-20 border-none bg-transparent text-right text-sm font-semibold text-gray-700 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Importe Gravado</span>
                <span class="font-semibold text-gray-900">{{ formatCurrencyHNL(importeGravado) }}</span>
              </div>
              <div class="rounded-lg border border-orange-100 bg-orange-50 p-3 text-xs text-orange-700">
                <p class="font-semibold">Sistema Fiscal Honduras</p>
                <p class="mt-1 leading-relaxed">
                  • <span class="font-semibold text-orange-600">Exonerado:</span> temporalmente libre de ISV<br />
                  • <span class="font-semibold text-orange-500">Exento:</span> sin ISV por ley<br />
                  • <span class="font-semibold text-gray-600">Gravado:</span> aplica ISV (15%)
                </p>
              </div>
              <div class="flex justify-between">
                <span>Impuestos</span>
                <span class="font-semibold text-gray-900">{{ formatCurrencyHNL(totalImpuestos) }}</span>
              </div>
              <div class="flex justify-between border-t border-orange-100 pt-3 text-base font-semibold text-orange-600">
                <span>Total</span>
                <span>{{ formatCurrencyHNL(total) }}</span>
              </div>
            </div>
          </div>

          <!-- Botones de acción -->
          <div class="rounded-2xl border border-orange-100 bg-white/80 p-4">
            <div class="space-y-3">
              <button
                @click="abrirModalConfirmacion"
                :disabled="pedidoItems.length === 0 || isLoading"
                class="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400"
              >
                <span v-if="isLoading" class="flex items-center justify-center gap-2">
                  <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Procesando...
                </span>
                <span v-else>Crear Pedido</span>
              </button>
              <button
                @click="limpiarPedido"
                class="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:border-orange-300 hover:text-orange-600"
              >
                Limpiar Pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de información del menú -->
    <MenuItemInformationModal
      :is-open="isInfoModalOpen"
      :menu="selectedMenuForInfo"
      @close="closeInfoModal"
      @add-to-order="agregarMenuItem"
    />

    <!-- Modal de confirmación del pedido -->
    <ConfirmarPedidoModal
      ref="confirmarPedidoModal"
      :is-open="isConfirmModalOpen"
      :pedido-data="formData"
      :pedido-items="pedidoItems"
      :subtotal="subtotal"
      :total-impuestos="totalImpuestos"
      :total="total"
      :importe-gravado="importeGravado"
      :importe-exento="importeExento"
      :importe-exonerado="importeExonerado"
      :menu-source="menus"
      @close="cerrarModalConfirmacion"
      @confirm="crearPedido"
    />
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
