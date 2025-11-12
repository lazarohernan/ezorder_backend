<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-white/30 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      @click="handleOverlayClick"
    >
      <div 
        class="bg-white rounded-xl shadow-2xl w-full mx-auto transform transition-all duration-300 scale-100"
        :class="modalSize"
        @click.stop
      >
        <!-- Header del modal -->
        <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div 
                v-if="icon"
                :class="[
                  'flex items-center justify-center w-8 h-8 rounded-full',
                  iconBg
                ]"
              >
                <component 
                  :is="icon" 
                  :class="['w-5 h-5', iconColor]"
                />
              </div>
              <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
            </div>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Contenido del modal -->
        <div class="px-6 py-4">
          <slot />
        </div>

        <!-- Footer del modal -->
        <div v-if="$slots.footer" class="px-6 py-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-b-xl">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts" name="BaseModal">
import { computed } from 'vue';

// Props
interface Props {
  show: boolean;
  title: string;
  icon?: object;
  iconBg?: string;
  iconColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  closeOnOverlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  iconBg: 'bg-orange-100',
  iconColor: 'text-orange-600',
  size: 'md',
  closeOnOverlay: true
});

// Emits
const emit = defineEmits<{
  'update:show': [value: boolean];
  close: [];
}>();

// Computed
const modalSize = computed(() => {
  const sizes: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full', string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-5xl',
    full: 'max-w-[95vw]'
  };

  const sizeKey = props.size ?? 'md';
  return sizes[sizeKey];
});

// Methods
const closeModal = () => {
  emit('update:show', false);
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    closeModal();
  }
};
</script>
