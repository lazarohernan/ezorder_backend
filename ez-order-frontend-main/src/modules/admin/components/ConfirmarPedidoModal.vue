<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  CalculatorIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  PrinterIcon,
  DocumentIcon,
  HomeModernIcon,
  TruckIcon,
  ArchiveBoxIcon,
  UsersIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline';
import type { CreatePedidoDTO } from '@/interfaces/Pedido';
import type { CreatePedidoItemDTO } from '@/interfaces/PedidoItem';
import type { MetodoPago } from '@/interfaces/MetodoPago';
import metodoPagoService from '@/services/metodo_pago_services';
import CalculatorComponent from './CalculatorComponent.vue';
import WhatsAppDeliveryModal from './WhatsAppDeliveryModal.vue';
import Modal from '@/components/ui/Modal.vue';
import type { Menu } from '@/interfaces/Menu';
import foodPlaceholder from '@/assets/food-placeholder.svg';

interface Props {
  isOpen: boolean;
  pedidoData: CreatePedidoDTO;
  pedidoItems: CreatePedidoItemDTO[];
  subtotal: number;
  totalImpuestos: number;
  total: number;
  importeGravado: number;
  importeExento: number;
  importeExonerado: number;
  menuSource?: Menu[];
}

interface Emits {
  (e: 'close'): void;
  (
    e: 'confirm',
    metodoPagoId: number,
    deliveryMethod: string,
    estadoPedido: string,
    whatsappNumber?: string,
  ): void;
  (e: 'result', success: boolean, message: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const isLoading = ref(false);
const metodosPago = ref<MetodoPago[]>([]);
const selectedMetodoPago = ref<number | null>(null);
const showCalculator = ref(false);
const isLoadingMetodos = ref(false);
const selectedDeliveryMethod = ref<string>('print_80mm');
const showWhatsAppModal = ref(false);
const whatsappNumber = ref<string>('');
const selectedEstadoPedido = ref<string>('confirmado');
const showSuccessModal = ref(false);
const successMessage = ref<string>('');
const successState = ref<boolean>(true);

const menuLookup = computed<Record<string, Menu>>(() => {
  const map: Record<string, Menu> = {};
  if (props.menuSource) {
    for (const menu of props.menuSource) {
      map[menu.id] = menu;
    }
  }
  return map;
});

// Estado del pedido options
const estadoPedidoOptions = [
  {
    value: 'confirmado',
    label: 'Confirmado',
    description: 'El pedido está confirmado y pagado',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    value: 'pendiente',
    label: 'Pendiente',
    description: 'El pedido está pendiente de confirmación',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
];

// Delivery methods - Reordenados con 80mm primero
const deliveryMethods = [
  {
    id: 'print_80mm',
    name: 'Imprimir 80mm',
    description: 'Imprimir en impresora térmica de 80mm',
    icon: PrinterIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'print_normal',
    name: 'Imprimir Tamaño Carta',
    description: 'Imprimir en impresora normal (8.5" x 11")',
    icon: DocumentIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'whatsapp',
    name: 'Enviar por WhatsApp',
    description: 'Generar PDF y enviar por WhatsApp',
    icon: ChatBubbleLeftRightIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

// Computed
const selectedMetodoPagoInfo = computed(() => {
  if (!selectedMetodoPago.value) return null;
  return metodosPago.value.find((m) => m.id === selectedMetodoPago.value);
});

const isEfectivo = computed(() => {
  return selectedMetodoPagoInfo.value?.metodo.toLowerCase().includes('efectivo') || false;
});

const canConfirm = computed(() => {
  return selectedMetodoPago.value !== null && !isLoading.value;
});

const tiposPedidoLabels: Record<string, string> = {
  local: 'Local',
  domicilio: 'Domicilio',
  recoger: 'Para llevar',
  mesa: 'Mesa',
};

const tipoPedidoIconos: Record<string, typeof HomeModernIcon> = {
  local: HomeModernIcon,
  domicilio: TruckIcon,
  recoger: ArchiveBoxIcon,
  mesa: UsersIcon,
};

// Methods
const fetchMetodosPago = async () => {
  try {
    isLoadingMetodos.value = true;
    const response = await metodoPagoService.getAll();
    if (response.data.success) {
      metodosPago.value = response.data.data;
      // Seleccionar efectivo por defecto si existe
      const efectivo = metodosPago.value.find((m) => m.metodo.toLowerCase().includes('efectivo'));
      if (efectivo) {
        selectedMetodoPago.value = efectivo.id;
      }
    }
  } catch (error) {
    console.error('Error al cargar métodos de pago:', error);
  } finally {
    isLoadingMetodos.value = false;
  }
};

const closeModal = () => {
  showCalculator.value = false;
  selectedMetodoPago.value = null;
  emit('close');
};

const handleVisibility = (value: boolean) => {
  if (!value) {
    closeModal();
  }
};

const confirmPedido = () => {
  if (!selectedMetodoPago.value) return;

  // Si es WhatsApp, abrir modal para número
  if (selectedDeliveryMethod.value === 'whatsapp') {
    showWhatsAppModal.value = true;
    return;
  }

  // Para otros métodos, proceder directamente
  isLoading.value = true;
  emit(
    'confirm',
    selectedMetodoPago.value,
    selectedDeliveryMethod.value,
    selectedEstadoPedido.value,
  );
};

const handleWhatsAppConfirm = (phoneNumber: string) => {
  whatsappNumber.value = phoneNumber;
  showWhatsAppModal.value = false;
  isLoading.value = true;
  emit(
    'confirm',
    selectedMetodoPago.value!,
    selectedDeliveryMethod.value,
    selectedEstadoPedido.value,
    phoneNumber,
  );
};

const closeWhatsAppModal = () => {
  showWhatsAppModal.value = false;
};

const handleConfirmationResult = (success: boolean, message?: string) => {
  isLoading.value = false;
  successState.value = success;
  successMessage.value = message || (success
    ? 'El pedido y la factura se han procesado correctamente.'
    : 'El pedido se creó correctamente, pero hubo un problema al generar la factura.');
  closeModal();
  showSuccessModal.value = true;
  emit('result', success, successMessage.value);
};

const toggleCalculator = () => {
  showCalculator.value = !showCalculator.value;
};

const handleCalculatorVisibility = (value: boolean) => {
  showCalculator.value = value;
};

const closeCalculatorModal = () => {
  showCalculator.value = false;
};

watch(isEfectivo, (value) => {
  if (!value) {
    showCalculator.value = false;
  }
});

const handleSuccessVisibility = (value: boolean) => {
  if (!value) {
    closeSuccessModal();
  } else {
    showSuccessModal.value = value;
  }
};

const closeSuccessModal = () => {
  showSuccessModal.value = false;
};

defineExpose({ handleConfirmationResult });

const getMetodoPagoIcon = (metodo: string) => {
  const metodoBajo = metodo.toLowerCase();
  if (metodoBajo.includes('efectivo')) return BanknotesIcon;
  if (metodoBajo.includes('tarjeta') || metodoBajo.includes('card')) return CreditCardIcon;
  return CheckCircleIcon;
};

// Watch for modal open/close
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      fetchMetodosPago();
    } else {
      showCalculator.value = false;
    }
  },
);

// Lifecycle
onMounted(() => {
  if (props.isOpen) {
    fetchMetodosPago();
  }
});
</script>

<template>
  <Modal
    :show="isOpen"
    title="Confirmar Pedido"
    size="2xl"
    @update:show="handleVisibility"
  >
    <div class="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
      <div class="grid gap-6">
        <div class="grid gap-6 md:grid-cols-2">
          <section class="rounded-2xl border border-gray-100 bg-white/90 p-5">
            <header class="mb-4 flex items-center justify-between">
              <h4 class="text-sm font-semibold text-gray-900">Información del Pedido</h4>
              <span class="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
                {{ tiposPedidoLabels[pedidoData.tipo_pedido] || pedidoData.tipo_pedido }}
              </span>
            </header>
            <div class="space-y-6">
              <dl class="flex flex-col gap-3 text-sm text-gray-600">
                <div class="flex items-center justify-between">
                  <dt class="font-medium text-gray-700">Tipo</dt>
                  <dd class="flex items-center gap-2 text-gray-900">
                    <component
                      :is="tipoPedidoIconos[pedidoData.tipo_pedido] || HomeModernIcon"
                      class="h-4 w-4 text-orange-500"
                    />
                    <span>
                      {{ tiposPedidoLabels[pedidoData.tipo_pedido] || pedidoData.tipo_pedido }}
                    </span>
                  </dd>
                </div>
                <div v-if="pedidoData.mesa" class="flex justify-between">
                  <dt class="font-medium text-gray-700">Mesa</dt>
                  <dd class="text-gray-900">{{ pedidoData.mesa }}</dd>
                </div>
                <div v-if="pedidoData.direccion_entrega" class="flex justify-between">
                  <dt class="font-medium text-gray-700">Dirección</dt>
                  <dd class="ml-6 max-w-[18rem] text-right text-gray-900">
                    {{ pedidoData.direccion_entrega }}
                  </dd>
                </div>
                <div v-if="pedidoData.notas" class="flex justify-between">
                  <dt class="font-medium text-gray-700">Notas</dt>
                  <dd class="ml-6 max-w-[18rem] text-right text-gray-900">
                    {{ pedidoData.notas }}
                  </dd>
                </div>
              </dl>

              <div class="space-y-3 border-t border-orange-100 pt-4">
                <h5 class="text-xs font-semibold uppercase tracking-wide text-gray-400">Estado del Pedido</h5>
                <div class="flex flex-col gap-3 md:flex-row">
                  <label
                    v-for="estado in estadoPedidoOptions"
                    :key="estado.value"
                    class="relative flex flex-1 cursor-pointer flex-col rounded-xl border p-3 transition"
                    :class="{
                      [estado.borderColor + ' ' + estado.bgColor]: selectedEstadoPedido === estado.value,
                      'border-gray-200 hover:border-orange-200 hover:bg-orange-50/40': selectedEstadoPedido !== estado.value,
                    }"
                  >
                    <input
                      v-model="selectedEstadoPedido"
                      :value="estado.value"
                      type="radio"
                      class="sr-only"
                    />
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p
                          class="text-sm font-semibold"
                          :class="selectedEstadoPedido === estado.value ? estado.color : 'text-gray-900'"
                        >
                          {{ estado.label }}
                        </p>
                        <p
                          class="text-xs"
                          :class="
                            selectedEstadoPedido === estado.value
                              ? estado.color + ' opacity-75'
                              : 'text-gray-500'
                          "
                        >
                          {{ estado.description }}
                        </p>
                      </div>
                      <CheckCircleIcon
                        v-if="selectedEstadoPedido === estado.value"
                        :class="estado.color"
                        class="h-5 w-5"
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border border-gray-100 bg-white/90 p-5">
            <header class="mb-4 flex items-center justify-between">
              <h4 class="text-sm font-semibold text-gray-900">Resumen de Totales</h4>
              <span class="text-xs font-medium text-gray-400">Valores en Lempiras</span>
            </header>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between text-gray-600">
                <dt>Subtotal</dt>
                <dd class="font-semibold text-gray-900">L {{ subtotal.toFixed(2) }}</dd>
              </div>
              <div class="flex justify-between text-orange-600">
                <dt>Importe Exonerado</dt>
                <dd class="font-semibold">L {{ importeExonerado.toFixed(2) }}</dd>
              </div>
              <div class="flex justify-between text-orange-500">
                <dt>Importe Exento</dt>
                <dd class="font-semibold">L {{ importeExento.toFixed(2) }}</dd>
              </div>
              <div class="flex justify-between text-gray-600">
                <dt>Importe Gravado</dt>
                <dd class="font-semibold text-gray-900">L {{ importeGravado.toFixed(2) }}</dd>
              </div>
              <div
                v-if="pedidoData.descuento && pedidoData.descuento > 0"
                class="flex justify-between text-red-500"
              >
                <dt>Descuento</dt>
                <dd>-L {{ pedidoData.descuento.toFixed(2) }}</dd>
              </div>
              <div class="flex justify-between text-gray-600">
                <dt>Impuestos (ISV 15%)</dt>
                <dd class="font-semibold text-gray-900">L {{ totalImpuestos.toFixed(2) }}</dd>
              </div>
              <div class="flex justify-between border-t border-orange-100 pt-3 text-base font-semibold text-orange-600">
                <dt>Total a Cobrar</dt>
                <dd>L {{ total.toFixed(2) }}</dd>
              </div>
            </dl>
          </section>

          <section class="rounded-2xl border border-gray-100 bg-white/90 p-5 md:col-span-2">
            <header class="mb-4">
              <h4 class="text-sm font-semibold text-gray-900">Items del Pedido</h4>
              <p class="text-xs text-gray-500">{{ pedidoItems.length }} productos seleccionados</p>
            </header>
            <div class="space-y-3 max-h-52 overflow-y-auto pr-1">
              <article
                v-for="(item, index) in pedidoItems"
                :key="index"
                class="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-orange-50/40 p-3"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-orange-100 bg-white">
                    <img
                      v-if="item.menu_id && menuLookup[item.menu_id]?.imagen"
                      :src="menuLookup[item.menu_id].imagen"
                      :alt="menuLookup[item.menu_id].nombre"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center bg-orange-50">
                      <div class="h-6 w-6 text-orange-400" v-html="foodPlaceholder"></div>
                    </div>
                  </div>
                  <div>
                    <h5 class="text-sm font-semibold text-gray-900">{{ item.nombre_menu }}</h5>
                    <p class="text-xs text-gray-600">
                      {{ item.cantidad || 0 }} × L {{ item.precio_unitario.toFixed(2) }}
                    </p>
                  </div>
                </div>
                <p class="text-sm font-semibold text-orange-600">
                  L {{ (item.precio_unitario * (item.cantidad || 0)).toFixed(2) }}
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>

      <section class="rounded-2xl border border-gray-100 bg-white/90 p-5">
        <h4 class="mb-3 text-sm font-semibold text-gray-900">Método de Entrega</h4>
        <div class="flex flex-col gap-3 md:flex-row md:flex-nowrap">
          <label
            v-for="method in deliveryMethods"
            :key="method.id"
            class="relative flex flex-1 cursor-pointer items-start gap-3 rounded-xl border p-3 transition"
            :class="{
              [method.borderColor + ' ' + method.bgColor]: selectedDeliveryMethod === method.id,
              'border-gray-200 hover:border-orange-200 hover:bg-orange-50/40': selectedDeliveryMethod !== method.id,
            }"
          >
            <input
              v-model="selectedDeliveryMethod"
              :value="method.id"
              type="radio"
              class="sr-only"
            />
            <component
              :is="method.icon"
              :class="selectedDeliveryMethod === method.id ? method.color : 'text-gray-400'"
              class="mt-0.5 h-5 w-5"
            />
            <div class="flex-1">
              <p
                class="text-sm font-semibold"
                :class="selectedDeliveryMethod === method.id ? method.color : 'text-gray-900'"
              >
                {{ method.name }}
              </p>
              <p
                class="text-xs"
                :class="
                  selectedDeliveryMethod === method.id
                    ? method.color + ' opacity-75'
                    : 'text-gray-500'
                "
              >
                {{ method.description }}
              </p>
            </div>
            <CheckCircleIcon
              v-if="selectedDeliveryMethod === method.id"
              :class="method.color"
              class="h-5 w-5"
            />
          </label>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-100 bg-white/90 p-5">
        <div class="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h4 class="text-sm font-semibold text-gray-900">Método de Pago</h4>
          <button
            v-if="isEfectivo"
            @click="toggleCalculator"
            class="inline-flex items-center gap-2 self-start rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:text-orange-700"
          >
            <CalculatorIcon class="h-4 w-4" />
            <span>{{ showCalculator ? 'Ocultar' : 'Calculadora' }}</span>
          </button>
        </div>

        <div v-if="isLoadingMetodos" class="py-6 text-center">
          <div class="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-orange-500"></div>
          <p class="mt-2 text-xs font-medium text-gray-500">Cargando métodos de pago...</p>
        </div>

        <div v-else class="flex flex-col gap-3 md:flex-row md:flex-nowrap">
          <label
            v-for="metodo in metodosPago"
            :key="metodo.id"
            class="relative flex flex-1 cursor-pointer items-start gap-3 rounded-xl border p-3 transition"
            :class="{
              'border-orange-300 bg-orange-50': selectedMetodoPago === metodo.id,
              'border-gray-200 hover:border-orange-200 hover:bg-orange-50/40': selectedMetodoPago !== metodo.id,
            }"
          >
            <input
              v-model="selectedMetodoPago"
              :value="metodo.id"
              type="radio"
              class="sr-only"
            />
            <component :is="getMetodoPagoIcon(metodo.metodo)" class="mt-0.5 h-5 w-5 text-gray-500" />
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-900">{{ metodo.metodo }}</p>
              <p v-if="metodo.descripcion" class="text-xs text-gray-500">
                {{ metodo.descripcion }}
              </p>
            </div>
            <CheckCircleIcon
              v-if="selectedMetodoPago === metodo.id"
              class="h-5 w-5 text-orange-500"
            />
          </label>
        </div>
      </section>

    </div>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          @click="closeModal"
          class="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-orange-300 hover:text-orange-600"
        >
          Cancelar
        </button>
        <button
          @click="confirmPedido"
          :disabled="!canConfirm"
          class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400"
        >
          <span v-if="isLoading" class="flex items-center gap-2">
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            Procesando...
          </span>
          <span v-else>Confirmar Pedido</span>
        </button>
      </div>
    </template>
  </Modal>

  <WhatsAppDeliveryModal
    :is-open="showWhatsAppModal"
    @close="closeWhatsAppModal"
    @confirm="handleWhatsAppConfirm"
  />

  <Modal
    :show="showCalculator && isEfectivo"
    title="Calculadora"
    size="sm"
    @update:show="handleCalculatorVisibility"
    @close="closeCalculatorModal"
  >
    <CalculatorComponent :total-pedido="total" />
  </Modal>

  <Modal
    :show="showSuccessModal"
    :title="successState ? 'Pedido Confirmado' : 'Pedido con Observaciones'"
    size="sm"
    @update:show="handleSuccessVisibility"
    @close="closeSuccessModal"
  >
    <div class="space-y-4 text-center">
      <div
        class="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
        :class="successState ? 'bg-orange-100' : 'bg-red-100'"
      >
        <component
          :is="successState ? CheckCircleIcon : ExclamationTriangleIcon"
          :class="successState ? 'h-7 w-7 text-orange-500' : 'h-7 w-7 text-red-500'"
        />
      </div>
      <p class="text-sm" :class="successState ? 'text-gray-700' : 'text-red-600'">
        {{ successMessage }}
      </p>
      <p class="text-xs text-gray-400">
        Puedes continuar gestionando los pedidos o imprimir la factura nuevamente desde el historial.
      </p>
    </div>
    <template #footer>
      <div class="flex justify-center gap-3">
        <button
          class="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-orange-600 hover:to-orange-700"
          @click="closeSuccessModal"
        >
          Entendido
        </button>
      </div>
    </template>
  </Modal>
</template>
