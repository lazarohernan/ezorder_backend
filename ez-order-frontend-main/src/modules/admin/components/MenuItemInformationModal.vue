<template>
  <Modal
    :show="isOpen"
    title="Información del Menú"
    size="lg"
    @update:show="handleVisibility"
  >
    <div v-if="menu" class="space-y-6">
      <!-- Imagen del menú -->
      <div class="flex justify-center">
        <img
          v-if="menu.imagen"
          :src="menu.imagen"
          :alt="menu.nombre"
          class="h-32 w-32 rounded-xl border border-orange-100 object-cover"
          @error="handleImageError"
        />
        <div
          v-else
          class="flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-orange-200 bg-orange-50"
        >
          <div class="h-20 w-20 text-orange-500" v-html="foodPlaceholder"></div>
        </div>
      </div>

      <!-- Información básica -->
      <div class="space-y-4">
        <div class="text-center space-y-1">
          <h3 class="text-lg font-semibold text-gray-900">{{ menu.nombre }}</h3>
          <p v-if="menu.num_menu" class="text-sm font-medium text-orange-500">
            Código: {{ menu.num_menu }}
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-gray-100 bg-white/80 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Precio base</p>
            <p class="text-xl font-bold text-orange-600">
              L {{ menu.precio?.toFixed(2) || '0.00' }}
            </p>
            <p v-if="aplicaImpuesto" class="mt-1 text-xs text-gray-500">
              ISV ({{ menu.porcentaje_impuesto }}%):
              <span class="font-medium text-gray-700">
                L {{ impuestoCalculado.toFixed(2) }}
              </span>
            </p>
            <p v-else-if="menu.es_exento || menu.es_exonerado" class="mt-1 text-xs text-orange-500">
              {{ menu.es_exento ? 'Exento por ley' : 'Exonerado temporalmente' }}
            </p>
          </div>

          <div class="rounded-xl border border-gray-100 bg-white/80 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Total a pagar</p>
            <p class="text-xl font-bold text-emerald-600">
              L {{ precioConImpuesto.toFixed(2) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">
              Incluye impuestos y exenciones aplicables.
            </p>
          </div>
        </div>

        <div class="space-y-4">
          <div v-if="menu.descripcion" class="rounded-xl border border-gray-100 bg-white/80 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Descripción</p>
            <p class="mt-2 text-sm text-gray-700">{{ menu.descripcion }}</p>
          </div>

          <div v-if="menu.otra_info" class="rounded-xl border border-gray-100 bg-white/80 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Información adicional</p>
            <p class="mt-2 text-sm text-gray-700">{{ menu.otra_info }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="rounded-xl border border-gray-100 bg-white/80 p-3 text-center">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Estado</p>
            <p :class="menu.activo ? 'text-emerald-600' : 'text-red-500'" class="mt-1 text-sm font-semibold">
              {{ menu.activo ? 'Activo' : 'Inactivo' }}
            </p>
          </div>
          <div class="rounded-xl border border-gray-100 bg-white/80 p-3 text-center">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Para cocina</p>
            <p :class="menu.es_para_cocina ? 'text-orange-500' : 'text-gray-500'" class="mt-1 text-sm font-semibold">
              {{ menu.es_para_cocina ? 'Sí' : 'No' }}
            </p>
          </div>
          <div class="rounded-xl border border-gray-100 bg-white/80 p-3 text-center">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Restaurante</p>
            <p class="mt-1 text-sm font-semibold text-gray-700">
              {{ menu.restaurantes?.nombre_restaurante || 'N/D' }}
            </p>
          </div>
        </div>

        <div class="rounded-xl border border-orange-100 bg-orange-50/80 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-orange-500">Clasificación ISV</p>
          <div class="mt-3 grid grid-cols-1 gap-3 text-sm text-gray-600">
            <div class="flex items-center justify-between">
              <span>Exento de ISV</span>
              <span :class="menu.es_exento ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'" class="rounded-full px-3 py-1 text-xs font-semibold">
                {{ menu.es_exento ? 'Sí' : 'No' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Exonerado temporal</span>
              <span :class="menu.es_exonerado ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'" class="rounded-full px-3 py-1 text-xs font-semibold">
                {{ menu.es_exonerado ? 'Sí' : 'No' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Gravado con ISV</span>
              <span :class="!menu.es_exento && !menu.es_exonerado ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'" class="rounded-full px-3 py-1 text-xs font-semibold">
                {{ !menu.es_exento && !menu.es_exonerado ? 'Sí (15%)' : 'No' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-orange-300 hover:text-orange-600"
          @click="emitClose"
        >
          Cerrar
        </button>
        <button
          v-if="menu?.activo"
          type="button"
          class="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-orange-600 hover:to-orange-700"
          @click="addToOrder"
        >
          Agregar al Pedido
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Menu } from '@/interfaces/Menu';
import foodPlaceholder from '@/assets/food-placeholder.svg';
import Modal from '@/components/ui/Modal.vue';

interface Props {
  isOpen: boolean;
  menu: Menu | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'add-to-order', menu: Menu): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const impuestoCalculado = computed(() => {
  if (!props.menu || !props.menu.precio || !props.menu.porcentaje_impuesto) return 0;
  return (props.menu.precio * props.menu.porcentaje_impuesto) / 100;
});

const precioConImpuesto = computed(() => {
  if (!props.menu || !props.menu.precio) return 0;
  return props.menu.precio + (props.menu.es_exento || props.menu.es_exonerado ? 0 : impuestoCalculado.value);
});

const aplicaImpuesto = computed(() => {
  return (
    props.menu &&
    !props.menu.es_exento &&
    !props.menu.es_exonerado &&
    !!props.menu.porcentaje_impuesto
  );
});

const emitClose = () => {
  emit('close');
};

const handleVisibility = (value: boolean) => {
  if (!value) {
    emitClose();
  }
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  if (img) {
    img.src = foodPlaceholder;
  }
};

const addToOrder = () => {
  if (props.menu) {
    emit('add-to-order', props.menu);
    emitClose();
  }
};
</script>
