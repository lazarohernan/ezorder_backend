<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline';
import type { Pedido, EstadoPedido } from '@/interfaces/Pedido';
import PedidoService from '@/services/pedido_service';
import Modal from '@/components/ui/Modal.vue';
import { formatCurrencyHNL } from '@/utils/currency';

interface Props {
  isOpen: boolean;
  pedido: Pedido | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'updated'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const isLoading = ref(false);
const selectedEstado = ref<EstadoPedido>('pendiente');

// Estados disponibles con información visual
const estadosDisponibles = [
  {
    value: 'pendiente' as EstadoPedido,
    label: 'Pendiente',
    description: 'Pedido recibido, esperando confirmación',
    icon: ClockIcon,
    color: 'yellow',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-900',
    iconColor: 'text-gray-600',
  },
  {
    value: 'confirmado' as EstadoPedido,
    label: 'Confirmado',
    description: 'Pedido confirmado, listo para preparar',
    icon: CheckCircleIcon,
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-900',
    iconColor: 'text-gray-600',
  },
  {
    value: 'en preparacion' as EstadoPedido,
    label: 'En Preparación',
    description: 'Pedido siendo preparado en cocina',
    icon: TruckIcon,
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-900',
    iconColor: 'text-gray-600',
  },
  {
    value: 'listo' as EstadoPedido,
    label: 'Listo',
    description: 'Pedido terminado, listo para entrega',
    icon: CheckCircleIcon,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
  },
  {
    value: 'entregado' as EstadoPedido,
    label: 'Entregado',
    description: 'Pedido entregado al cliente',
    icon: ShoppingBagIcon,
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-900',
    iconColor: 'text-gray-600',
  },
  {
    value: 'cancelado' as EstadoPedido,
    label: 'Cancelado',
    description: 'Pedido cancelado',
    icon: ExclamationTriangleIcon,
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
  },
];

// Computed
const estadoActual = computed(() => {
  if (!props.pedido) return null;
  return estadosDisponibles.find((estado) => estado.value === props.pedido?.estado_pedido);
});

const estadosPermitidos = computed(() => {
  if (!props.pedido) return estadosDisponibles;

  const estadoActualValue = props.pedido.estado_pedido;

  // Lógica de transiciones permitidas
  switch (estadoActualValue) {
    case 'pendiente':
      return estadosDisponibles.filter((e) =>
        ['pendiente', 'confirmado', 'cancelado'].includes(e.value),
      );
    case 'confirmado':
      return estadosDisponibles.filter((e) =>
        ['confirmado', 'en preparacion', 'cancelado'].includes(e.value),
      );
    case 'en preparacion':
      return estadosDisponibles.filter((e) =>
        ['en preparacion', 'listo', 'cancelado'].includes(e.value),
      );
    case 'listo':
      return estadosDisponibles.filter((e) => ['listo', 'entregado'].includes(e.value));
    case 'entregado':
      return estadosDisponibles.filter((e) => e.value === 'entregado');
    case 'cancelado':
      return estadosDisponibles.filter((e) => e.value === 'cancelado');
    default:
      return estadosDisponibles;
  }
});

const canChangeStatus = computed(() => {
  return selectedEstado.value !== props.pedido?.estado_pedido;
});

// Methods
const closeModal = () => {
  selectedEstado.value = 'pendiente';
  emit('close');
};

const handleModalVisibility = (value: boolean) => {
  if (!value) {
    closeModal();
  }
};

const cambiarEstado = async () => {
  if (!props.pedido || !canChangeStatus.value) return;

  isLoading.value = true;

  try {
    await PedidoService.updateEstado(props.pedido.id, selectedEstado.value);
    emit('updated');
    closeModal();
  } catch (error) {
    console.error('Error al cambiar estado del pedido:', error);
    alert('Error al cambiar el estado del pedido. Por favor, intente nuevamente.');
  } finally {
    isLoading.value = false;
  }
};

// Watch for pedido changes to update selected estado
watch(
  () => props.pedido,
  (newPedido) => {
    if (newPedido) {
      selectedEstado.value = newPedido.estado_pedido;
    }
  },
  { immediate: true },
);
</script>

<template>
  <Modal
    :show="isOpen"
    title="Cambiar Estado del Pedido"
    size="lg"
    @update:show="handleModalVisibility"
  >
    <div class="max-h-[70vh] overflow-y-auto space-y-6 pr-1">
      <div v-if="pedido" class="bg-gray-50 rounded-lg p-4">
        <h4 class="font-medium text-gray-900 mb-2">Información del Pedido</h4>
        <div class="space-y-1 text-sm text-gray-600">
          <p><span class="font-medium">Ticket:</span> #{{ pedido.numero_ticket || pedido.id.substring(0, 8) }}</p>
          <p>
            <span class="font-medium">Cliente:</span>
            {{ pedido.clientes?.nombre_cliente || 'No registrado' }}
          </p>
          <p><span class="font-medium">Total:</span> {{ formatCurrencyHNL(pedido.total) }}</p>
        </div>
      </div>

      <div v-if="estadoActual" class="space-y-3">
        <h4 class="font-medium text-gray-900">Estado Actual</h4>
        <div
          :class="[
            estadoActual.bgColor,
            estadoActual.borderColor,
            estadoActual.textColor,
          ]"
          class="flex items-center p-3 border rounded-lg"
        >
          <component
            :is="estadoActual.icon"
            :class="estadoActual.iconColor"
            class="h-5 w-5 mr-3"
          />
          <div>
            <p class="font-medium">{{ estadoActual.label }}</p>
            <p class="text-xs opacity-75">{{ estadoActual.description }}</p>
          </div>
        </div>
      </div>

      <div>
        <h4 class="font-medium text-gray-900 mb-3">Cambiar a</h4>
        <div class="space-y-2">
          <label
            v-for="estado in estadosPermitidos"
            :key="estado.value"
            class="relative flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            :class="{
              [estado.borderColor]: selectedEstado === estado.value,
              [estado.bgColor]: selectedEstado === estado.value,
              'border-gray-200': selectedEstado !== estado.value,
            }"
          >
            <input
              v-model="selectedEstado"
              :value="estado.value"
              type="radio"
              class="sr-only"
            />
            <component
              :is="estado.icon"
              :class="selectedEstado === estado.value ? estado.iconColor : 'text-gray-400'"
              class="h-5 w-5 mr-3"
            />
            <div class="flex-1">
              <p
                class="font-medium"
                :class="selectedEstado === estado.value ? estado.textColor : 'text-gray-900'"
              >
                {{ estado.label }}
              </p>
              <p
                class="text-xs"
                :class="
                  selectedEstado === estado.value
                    ? estado.textColor + ' opacity-75'
                    : 'text-gray-500'
                "
              >
                {{ estado.description }}
              </p>
            </div>
            <div v-if="selectedEstado === estado.value" class="absolute top-2 right-2">
              <CheckCircleIcon class="h-5 w-5 text-gray-600" />
            </div>
          </label>
        </div>
      </div>

      <div v-if="!canChangeStatus" class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p class="text-sm text-gray-600">
          <span class="font-medium">Nota:</span> El estado seleccionado es el mismo que el actual.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          @click="closeModal"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
        >
          Cancelar
        </button>
        <button
          @click="cambiarEstado"
          :disabled="!canChangeStatus || isLoading"
          class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          <span v-if="isLoading">Cambiando...</span>
          <span v-else>Cambiar Estado</span>
        </button>
      </div>
    </template>
  </Modal>
</template>
