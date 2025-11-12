<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        class="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all duration-300"
        :class="{ 'scale-100': show, 'scale-95': !show }"
      >
        <!-- Close button -->
        <button
          @click="close"
          class="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600"
        >
          <X class="h-5 w-5" />
        </button>

        <!-- Content -->
        <div class="p-8">
          <!-- Icon -->
          <div class="mb-6 flex justify-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-50">
              <UserCheck class="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <!-- Title -->
          <h2 class="mb-3 text-center text-2xl font-bold text-gray-900">
            ¡Bienvenido!
          </h2>

          <!-- Message -->
          <p class="mb-6 text-center text-sm leading-relaxed text-gray-600">
            Tu cuenta ha sido creada exitosamente. Pronto se te asignarán los permisos necesarios para acceder a las operaciones del sistema.
          </p>

          <!-- Action button -->
          <div class="flex justify-center">
            <button
              @click="close"
              class="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-lg"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { UserCheck, X } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth_store';
import { usePermissions } from '@/composables/usePermissions';

const authStore = useAuthStore();
const route = useRoute();
const { userPermissions } = usePermissions();

const show = ref(false);

const checkPermissions = () => {
  // No mostrar el modal si estamos en la vista de espera de permisos
  if (route.name === 'waiting-permissions') {
    show.value = false;
    return;
  }

  // Verificar si ya se mostró el modal anteriormente para este usuario
  const userId = authStore.userInfo?.id;
  const modalKey = userId ? `welcome_modal_shown_${userId}` : 'welcome_modal_shown';
  const alreadyShown = localStorage.getItem(modalKey);
  
  if (alreadyShown === 'true') {
    show.value = false;
    return;
  }

  // Verificar si el usuario tiene permisos asignados
  const hasPermissions = userPermissions.value.length > 0;
  
  // Verificar si es Super Admin o Admin (tienen acceso total)
  const isSuperAdmin = authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin;
  const isAdmin = authStore.userInfo?.rol_id === 2;
  
  // Mostrar modal solo si NO tiene permisos y NO es Super Admin/Admin
  show.value = !hasPermissions && !isSuperAdmin && !isAdmin;
};

const close = () => {
  show.value = false;
  // Guardar en localStorage que ya se mostró el modal para este usuario específico
  const userId = authStore.userInfo?.id;
  const modalKey = userId ? `welcome_modal_shown_${userId}` : 'welcome_modal_shown';
  localStorage.setItem(modalKey, 'true');
};

onMounted(() => {
  // Esperar a que se cargue la información del usuario
  if (authStore.userInfo) {
    checkPermissions();
  } else {
    // Si aún no se ha cargado, esperar un poco
    setTimeout(() => {
      checkPermissions();
    }, 500);
  }
});

// Observar cambios en la ruta
watch(
  () => route.name,
  () => {
    checkPermissions();
  }
);

// Observar cambios en userInfo para verificar permisos cuando se actualicen
watch(
  () => authStore.userInfo,
  () => {
    if (authStore.userInfo) {
      checkPermissions();
    }
  },
  { deep: true }
);

// Observar cambios en los permisos
watch(
  () => userPermissions.value,
  () => {
    checkPermissions();
  },
  { deep: true }
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

