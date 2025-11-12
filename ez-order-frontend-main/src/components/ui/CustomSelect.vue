<template>
  <div ref="wrapper" class="relative w-full" :class="{ 'z-[200]': isOpen, 'z-[10]': !isOpen }">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:bg-gray-100"
      :class="{ 'ring-2 ring-orange-200 border-orange-300': isOpen }"
      :disabled="disabled"
      @click="toggleDropdown"
    >
      <span :class="selectedOption ? 'text-gray-800' : 'text-gray-400'" class="flex items-center gap-2">
        <span>{{ selectedOption?.label ?? placeholder }}</span>
        <span v-if="selectedOption?.badge" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
          {{ selectedOption.badge }}
        </span>
      </span>
      <svg
        class="h-4 w-4 text-gray-400 transition-transform duration-200"
        :class="{ 'rotate-180 text-orange-500': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <ul
        v-if="isOpen"
        class="absolute z-[200] mt-2 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
      >
        <li
          v-for="option in options"
          :key="String(option.value ?? option.label)"
          @click="selectOption(option)"
          class="cursor-pointer px-4 py-2 text-sm text-gray-700 transition hover:bg-orange-50 flex items-center justify-between gap-2"
          :class="{
            'bg-orange-100 text-orange-700 font-semibold': option.value === modelValue,
            'opacity-60 cursor-not-allowed': option.disabled,
          }"
        >
          <span>{{ option.label }}</span>
          <span v-if="option.badge" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            {{ option.badge }}
          </span>
        </li>
        <li v-if="!options.length" class="px-4 py-2 text-sm text-gray-400">
          {{ emptyText }}
        </li>
      </ul>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

interface Option {
  label: string;
  value: string | number | null;
  disabled?: boolean;
  badge?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    emptyText?: string;
  }>(),
  {
    placeholder: 'Seleccionar',
    disabled: false,
    emptyText: 'Sin opciones disponibles',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: Option['value']];
  change: [value: Option['value']];
}>();

const isOpen = ref(false);
const wrapper = ref<HTMLElement | null>(null);
let closeHandler: ((event: Event) => void) | null = null;

const selectedOption = computed(() =>
  props.options.find((option) => option.value === props.modelValue) ?? null,
);

const toggleDropdown = () => {
  if (props.disabled) return;
  
  // Si se está abriendo, cerrar otros dropdowns
  if (!isOpen.value) {
    document.dispatchEvent(new CustomEvent('close-other-dropdowns', { 
      detail: { source: wrapper.value } 
    }));
  }
  
  isOpen.value = !isOpen.value;
};

const closeDropdown = () => {
  isOpen.value = false;
};

const selectOption = (option: Option) => {
  if (option.disabled) return;
  emit('update:modelValue', option.value);
  emit('change', option.value);
  closeDropdown();
};

const handleClickOutside = (event: MouseEvent) => {
  if (!wrapper.value) return;
  if (!wrapper.value.contains(event.target as Node)) {
    closeDropdown();
  }
};

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
  
  // Escuchar evento para cerrar este dropdown si otro se abre
  closeHandler = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.source !== wrapper.value && isOpen.value) {
      closeDropdown();
    }
  };
  document.addEventListener('close-other-dropdowns', closeHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside);
  if (closeHandler) {
    document.removeEventListener('close-other-dropdowns', closeHandler);
  }
});
</script>
