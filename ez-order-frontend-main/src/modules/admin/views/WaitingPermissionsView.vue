<template>
  <div class="flex min-h-full items-center justify-center p-4">
    <div class="max-w-2xl w-full">
      <!-- Welcome Card -->
      <div class="rounded-2xl border-2 border-gray-300/60 bg-white/80 backdrop-blur-sm p-8 md:p-12">
        <!-- Icon -->
        <div class="mb-6 flex justify-center">
          <div class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-50">
            <Building2 v-if="isRestaurantIssue" class="h-10 w-10 text-orange-500" />
            <UserCheck v-else class="h-10 w-10 text-orange-500" />
          </div>
        </div>

        <!-- Title -->
        <h1 class="mb-4 text-center text-3xl font-bold text-gray-900">
          ¡Bienvenido a EZOrder!
        </h1>

        <!-- Message -->
        <div class="mb-8 space-y-4 text-center">
          <p class="text-base leading-relaxed text-gray-600">
            Tu cuenta ha sido creada exitosamente. Estamos preparando tu acceso al sistema.
          </p>
          <p v-if="isRestaurantIssue" class="text-sm leading-relaxed text-gray-500">
            Por favor, espera a que tu administrador te asigne los accesos correspondientes. 
            Una vez configurado, podrás comenzar a utilizar todas las funcionalidades del sistema.
          </p>
          <p v-else class="text-sm leading-relaxed text-gray-500">
            Pronto se te asignarán los permisos necesarios para acceder a las operaciones del sistema. 
            Mientras tanto, puedes explorar la interfaz.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { UserCheck, Building2 } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth_store';
import { usePermissions } from '@/composables/usePermissions';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { userPermissions, hasRestaurant } = usePermissions();

// Determinar el tipo de error desde la query
const errorType = computed(() => route.query.error as string | undefined);

// Determinar si el problema es restaurante o permisos
const isRestaurantIssue = computed(() => {
  return errorType.value === 'no_restaurant' || !hasRestaurant.value;
});

// Verificar si el usuario ahora tiene permisos y restaurante para redirigir
const canAccessDashboard = computed(() => {
  const isSuperAdmin = authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin;
  const isAdmin = authStore.userInfo?.rol_id === 2;
  
  // Super Admin y Admin siempre pueden acceder
  if (isSuperAdmin || isAdmin) {
    return true;
  }
  
  // Otros usuarios necesitan restaurante y permisos
  return hasRestaurant.value && userPermissions.value.length > 0;
});

// Watcher para redirigir automáticamente cuando tenga permisos
watch(canAccessDashboard, (canAccess) => {
  if (canAccess && route.name === 'waiting-permissions') {
    router.push({ name: 'dashboard' });
  }
}, { immediate: false });

// Watcher adicional para observar cambios en userInfo y permisos directamente
watch(
  [() => authStore.userInfo, () => userPermissions.value, () => hasRestaurant.value],
  () => {
    // Solo redirigir si estamos en la ruta waiting-permissions
    if (route.name !== 'waiting-permissions') return;
    
    const isSuperAdmin = authStore.userInfo?.rol_id === 1 || authStore.userInfo?.es_super_admin;
    const isAdmin = authStore.userInfo?.rol_id === 2;
    
    if (isSuperAdmin || isAdmin) {
      router.push({ name: 'dashboard' });
      return;
    }
    
    if (hasRestaurant.value && userPermissions.value.length > 0) {
      router.push({ name: 'dashboard' });
    }
  },
  { deep: true, immediate: false }
);

// Polling para refrescar información del usuario cada 5 segundos
let refreshInterval: number | null = null;

onMounted(() => {
  // Refrescar información del usuario inmediatamente
  authStore.refreshUserInfo();
  
  // Configurar polling cada 5 segundos para verificar si se asignaron permisos
  refreshInterval = window.setInterval(async () => {
    await authStore.refreshUserInfo();
  }, 5000);
});

onBeforeUnmount(() => {
  // Limpiar intervalo al desmontar
  if (refreshInterval) {
    window.clearInterval(refreshInterval);
    refreshInterval = null;
  }
});
</script>

