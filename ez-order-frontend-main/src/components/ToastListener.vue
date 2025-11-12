<template>
  <!-- Este componente escucha eventos personalizados y muestra toasts -->
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useToast } from 'vue-toastification';
import { setToastInstance } from '@/utils/toast';

const toast = useToast();

// Función para manejar eventos de toast
const handleToastEvent = (event: CustomEvent) => {
  const { type, message, options } = event.detail;
  
  switch (type) {
    case 'success':
      toast.success(message, options);
      break;
    case 'error':
      toast.error(message, options);
      break;
    case 'warning':
      toast.warning(message, options);
      break;
    case 'info':
      toast.info(message, options);
      break;
    default:
      toast(message, options);
  }
};

// Establecer la instancia del toast cuando el componente se monte
onMounted(() => {
  setToastInstance(toast);
  
  // Escuchar eventos personalizados para mostrar toasts
  window.addEventListener('show-toast', handleToastEvent as EventListener);
});

// Limpiar listener al desmontar
onBeforeUnmount(() => {
  window.removeEventListener('show-toast', handleToastEvent as EventListener);
});
</script>
