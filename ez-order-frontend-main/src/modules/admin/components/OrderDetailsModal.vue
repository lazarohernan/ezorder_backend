<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { CheckCircleIcon } from '@heroicons/vue/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EstadoPedido, Pedido, UpdatePedidoDTO } from '@/interfaces/Pedido';
import PedidoItemService from '@/services/pedidoItem_service';
import type { PedidoItem } from '@/interfaces/PedidoItem';
import PedidoService from '@/services/pedido_service';
import Modal from '@/components/ui/Modal.vue';
import { formatCurrencyHNL } from '@/utils/currency';

const props = defineProps<{
  isOpen: boolean;
  order: Pedido | null;
}>();

const emit = defineEmits(['close', 'status-updated']);

const orderItems = ref<PedidoItem[]>([]);
const isLoadingItems = ref(false);
const editingTicket = ref(false);
const editedTicketNumber = ref<number>(0);

const modalTitle = computed(() => 'Detalles del Pedido');

const fetchOrderItems = async () => {
  if (!props.order) {
    orderItems.value = [];
    return;
  }

  try {
    isLoadingItems.value = true;
    console.log('Cargando items para el pedido:', props.order.id);
    const response = await PedidoItemService.getByPedidoId(props.order.id);
    console.log('Respuesta de items:', response.data);

    if (response.data.success && response.data.data) {
      orderItems.value = response.data.data;
    } else {
      console.warn('No se encontraron items o respuesta no exitosa');
      orderItems.value = [];
    }
  } catch (error) {
    console.error('Error al cargar los ítems del pedido:', error);
    orderItems.value = [];
  } finally {
    isLoadingItems.value = false;
  }
};

const close = () => {
  // Limpiar items al cerrar
  orderItems.value = [];
  emit('close');
};

const handleModalVisibility = (value: boolean) => {
  if (!value) {
    close();
  }
};

const updateStatus = async (newStatus: EstadoPedido) => {
  if (!props.order) return;

  try {
    await PedidoService.updateEstado(props.order.id, newStatus as EstadoPedido);
    emit('status-updated');
    close();
  } catch (error) {
    console.error('Error al actualizar el estado del pedido:', error);
  }
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: es });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha inválida';
  }
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

const getStatusBadgeClass = (estado: string): string => {
  const classes: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    confirmado: 'bg-blue-100 text-blue-800',
    en_preparacion: 'bg-indigo-100 text-indigo-800',
    listo: 'bg-green-100 text-green-800',
    entregado: 'bg-gray-100 text-gray-800',
    cancelado: 'bg-red-100 text-red-800',
  };
  return classes[estado] || 'bg-gray-100 text-gray-800';
};

const formatTipo = (tipo: string): string => {
  const tipos: Record<string, string> = {
    local: 'Local',
    domicilio: 'Domicilio',
    recoger: 'Para Recoger',
    mesa: 'Mesa',
  };
  return tipos[tipo] || tipo;
};

const saveTicketNumber = async () => {
  if (!props.order || !editedTicketNumber.value) {
    editingTicket.value = false;
    return;
  }

  try {
    await PedidoService.update(props.order.id, { 
      numero_ticket: editedTicketNumber.value 
    } as UpdatePedidoDTO);
    editingTicket.value = false;
    emit('status-updated');
  } catch (error) {
    console.error('Error al actualizar el número de ticket:', error);
    editingTicket.value = false;
  }
};

watch(() => props.order, (newOrder) => {
  if (newOrder) {
    editedTicketNumber.value = newOrder.numero_ticket || 0;
    editingTicket.value = false;
  }
}, { immediate: true });

// Watch for order changes and modal open state
watch(
  [() => props.order, () => props.isOpen],
  ([newOrder, isOpen], [oldOrder, wasOpen]) => {
    // Solo cargar items si el modal se abre con una orden nueva o diferente
    if (isOpen && newOrder && (!wasOpen || newOrder?.id !== oldOrder?.id)) {
      console.log('Modal abierto, cargando items para pedido:', newOrder.id);
      fetchOrderItems();
    } else if (!isOpen) {
      // Limpiar items cuando se cierre el modal
      orderItems.value = [];
    }
  },
  { immediate: false },
);
</script>

<template>
  <Modal
    :show="isOpen"
    :title="modalTitle"
    size="2xl"
    @update:show="handleModalVisibility"
  >
    <div class="max-h-[75vh] overflow-y-auto space-y-6 pr-2">
      <div class="border border-gray-100 bg-gray-50 rounded-xl p-4">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div class="flex-1">
            <p class="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span>Ticket:</span>
              <input
                v-if="editingTicket"
                v-model.number="editedTicketNumber"
                type="number"
                min="1"
                @blur="saveTicketNumber"
                @keyup.enter="saveTicketNumber"
                class="w-20 rounded border border-gray-300 px-2 py-1 text-sm font-semibold"
              />
              <span v-else class="font-semibold text-orange-600 cursor-pointer hover:text-orange-700" @click="editingTicket = true">
                #{{ order?.numero_ticket || order?.id.substring(0, 8) || '---' }}
              </span>
            </p>
            <p class="text-xs text-gray-500">
              Creado: {{ formatDate(order?.created_at || '') }}
            </p>
          </div>
          <span
            :class="getStatusBadgeClass(order?.estado_pedido || '')"
            class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          >
            {{ formatEstado(order?.estado_pedido || '') }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <!-- Order Summary -->
        <div class="md:col-span-2 space-y-6">
          <div class="bg-white border border-gray-200 rounded-xl p-4">
            <h4 class="font-medium text-gray-900 mb-3">Resumen del Pedido</h4>

            <div v-if="isLoadingItems" class="text-center py-4">
              <div class="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-orange-500"></div>
              <p class="mt-2 text-sm text-gray-500">Cargando items...</p>
            </div>

            <div v-else-if="orderItems.length > 0" class="space-y-4">
              <div
                v-for="item in orderItems"
                :key="item.id"
                class="flex items-start justify-between border-b border-gray-100 pb-3"
              >
                <div class="flex-1 pr-3">
                  <div class="font-medium text-gray-900">{{ item.nombre_menu || 'Item sin nombre' }}</div>
                  <div class="text-sm text-gray-500">Cantidad: {{ item.cantidad || 0 }}</div>
                  <div v-if="item.notas" class="mt-1 text-xs text-gray-500">
                    Notas: {{ item.notas }}
                  </div>
                  <div class="mt-1 flex items-center gap-2">
                    <span
                      v-if="item.enviado_a_cocina"
                      class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700"
                    >
                      Enviado a cocina
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-semibold text-gray-900">
                    {{ formatCurrencyHNL((item.precio_unitario || 0) * (item.cantidad || 0)) }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ formatCurrencyHNL(item.precio_unitario || 0) }} c/u
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="py-4 text-center text-sm text-gray-500">
              No hay ítems en este pedido
            </div>

            <div class="mt-4 border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div class="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span class="font-medium text-gray-900">
                  {{ formatCurrencyHNL(order?.total ? order.total - (order.impuesto || 0) : 0) }}
                </span>
              </div>
              <div class="flex justify-between text-gray-600">
                <span>Impuesto</span>
                <span class="font-medium text-gray-900">{{ formatCurrencyHNL(order?.impuesto || 0) }}</span>
              </div>
              <div class="flex justify-between text-gray-900 font-semibold">
                <span>Total</span>
                <span>{{ formatCurrencyHNL(order?.total || 0) }}</span>
              </div>
            </div>
          </div>

          <div v-if="order?.notas" class="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 class="font-medium text-gray-900 mb-2">Notas del Pedido</h4>
            <p class="text-sm text-gray-700">{{ order.notas }}</p>
          </div>
        </div>

        <!-- Order Info -->
        <div class="space-y-6">
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <h4 class="font-medium text-gray-900 mb-3">Información del Cliente</h4>
            <div class="space-y-2 text-sm text-gray-700">
              <div>
                <span class="text-gray-500">Nombre:</span>
                <span class="ml-2 font-semibold text-gray-900">
                  {{ order?.clientes?.nombre_cliente || 'No especificado' }}
                </span>
              </div>
              <div v-if="order?.clientes?.tel_cliente">
                <span class="text-gray-500">Teléfono:</span>
                <span class="ml-2 font-semibold text-gray-900">{{ order.clientes.tel_cliente }}</span>
              </div>
              <div v-if="order?.clientes?.correo_cliente">
                <span class="text-gray-500">Email:</span>
                <span class="ml-2 font-semibold text-gray-900">{{ order.clientes.correo_cliente }}</span>
              </div>
              <div v-if="order?.tipo_pedido === 'domicilio' && order?.direccion_entrega">
                <span class="text-gray-500">Dirección de entrega:</span>
                <p class="mt-1 font-medium text-gray-900">{{ order.direccion_entrega }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <h4 class="font-medium text-gray-900 mb-3">Información del Pedido</h4>
            <div class="space-y-2 text-sm text-gray-700">
              <div>
                <span class="text-gray-500">Ticket:</span>
                <span class="ml-2 font-semibold text-orange-600">
                  #{{ order?.numero_ticket || order?.id.substring(0, 8) || '---' }}
                </span>
              </div>
              <div>
                <span class="text-gray-500">Tipo:</span>
                <span class="ml-2 font-semibold text-gray-900">
                  {{ formatTipo(order?.tipo_pedido || '') }}
                </span>
              </div>
              <div v-if="order?.mesa">
                <span class="text-gray-500">Mesa:</span>
                <span class="ml-2 font-semibold text-gray-900">{{ order.mesa }}</span>
              </div>
              <div v-if="order?.fecha_entrega">
                <span class="text-gray-500">Fecha de entrega:</span>
                <span class="ml-2 font-semibold text-gray-900">{{ formatDate(order.fecha_entrega) }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <h4 class="font-medium text-gray-900 mb-3">Estado del Pedido</h4>
            <div class="space-y-2">
              <div class="flex items-center">
                <div class="flex h-5 w-5 items-center justify-center text-emerald-500">
                  <CheckCircleIcon class="h-5 w-5" />
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-900">Pedido realizado</p>
                  <p class="text-sm text-gray-500">{{ formatDate(order?.created_at || '') }}</p>
                </div>
              </div>
              <!-- Additional tracking steps could go here -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          @click="close"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
        >
          Cerrar
        </button>
        <button
          v-if="order?.estado_pedido === 'pendiente'"
          type="button"
          @click="updateStatus('confirmado')"
          class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
        >
          Confirmar Pedido
        </button>
      </div>
    </template>
  </Modal>
</template>
