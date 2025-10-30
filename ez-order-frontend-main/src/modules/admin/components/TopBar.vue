<template>
  <header class="bg-gray-800 text-white z-10 rounded-lg">
    <div class="px-4 py-3 flex items-center justify-between">
      <!-- Mobile menu button -->
      <div class="lg:hidden flex items-center space-x-2">
        <button
          @click="$emit('toggle-sidebar')"
          class="text-gray-300 hover:text-white focus:outline-none"
        >
        <svg
          class="h-6 w-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        </button>

        <!-- Mobile Caja button -->
        <router-link
          to="/admin/caja"
          class="lg:hidden flex items-center text-orange-400 border border-orange-400 hover:bg-orange-400 hover:text-white focus:outline-none p-2 rounded-lg transition-all duration-200"
        >
          <Calculator class="h-5 w-5" />
        </router-link>
      </div>

      <!-- Caja button (visible on lg screens and up) -->
      <div class="hidden lg:flex items-center ml-4">
        <router-link
          to="/admin/caja"
          class="flex items-center px-3 py-2 text-sm font-medium text-white border border-orange-400 hover:bg-orange-400 hover:text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          <Calculator class="h-5 w-5 mr-2" />
          Control de Caja
        </router-link>
      </div>

      <!-- Right section -->
      <div class="flex items-center ml-auto">
        <!-- Notifications -->
        <div class="relative notification-container">
          <button
            @click="toggleNotifications"
            class="text-gray-300 hover:text-orange-400 relative p-2 rounded-full hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            <svg
              class="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <!-- Notification badge -->
            <span v-if="unreadNotifications > 0" class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-medium">
              {{ unreadNotifications > 9 ? '9+' : unreadNotifications }}
            </span>
          </button>

          <!-- Notification Popover -->
          <PopoverDeNotificaciones
            :show="showNotifications"
            :notifications="formattedNotifications"
            @close="showNotifications = false"
            @mark-as-read="handleNotificationRead"
            @mark-all-as-read="handleMarkAllAsRead"
            @action="handleNotificationAction"
          />
        </div>

        <!-- User menu -->
        <div class="ml-3 relative user-menu">
          <button
            @click="toggleUserMenu"
            class="relative group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full transition-all duration-200 ease-in-out hover:scale-105"
          >
            <!-- Status indicator -->
            <div class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-orange-400 border-2 border-white rounded-full z-10"></div>

            <!-- Avatar container with gradient background -->
            <div class="relative h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-0.5 shadow-lg hover:shadow-xl transition-all duration-200">
              <div class="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <img
                  v-if="imageUrl && imageUrl !== '@/assets/images/dummy-profile.png'"
                  class="h-full w-full object-cover"
                  :src="imageUrl"
                  alt="User avatar"
                />
                <div v-else class="h-full w-full bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                  <span class="text-orange-600 font-semibold text-lg">{{ userInitials }}</span>
                </div>
              </div>
            </div>
          </button>

          <!-- Dropdown menu -->
          <div
            v-if="showUserMenu"
            class="origin-top-right absolute right-0 mt-3 w-56 rounded-xl shadow-xl bg-white transform transition-all duration-200"
          >
            <!-- User info header -->
            <div class="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-xl">
              <div class="flex items-center">
                <!-- Mini avatar in dropdown -->
                <div class="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-0.5 mr-3">
                  <div class="h-full w-full rounded-full bg-white flex items-center justify-center">
                    <img
                      v-if="imageUrl && imageUrl !== '@/assets/images/dummy-profile.png'"
                      class="h-full w-full object-cover rounded-full"
                      :src="imageUrl"
                      alt="User avatar"
                    />
                    <div v-else class="h-full w-full bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center rounded-full">
                      <span class="text-orange-600 font-semibold text-sm">{{ userInitials }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ userName }}</p>
                  <p class="text-sm text-gray-500 truncate">{{ authStore.user?.email }}</p>
                </div>
              </div>
            </div>

            <!-- Menu items -->
            <div class="py-2">
              <div class="border-t border-gray-100 my-1"></div>
              <button
                @click="$emit('logout')"
                class="group flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200"
              >
                <svg class="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores/auth_store';
import { Calculator } from 'lucide-vue-next';
import PopoverDeNotificaciones from './PopoverDeNotificaciones.vue';
import notificacionesService, { type Notificacion } from '@/services/notificacionesService';

// Tipos para notificaciones
interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
  action: string;
}

const authStore = useAuthStore();

// Props y emits
defineEmits(['toggle-sidebar', 'logout']);

// Estado
const showUserMenu = ref(false);
const showNotifications = ref(false);
const userName = ref(authStore.userInfo?.nombre_usuario || 'Usuario');
const imageUrl = ref<string>(authStore.userInfo?.user_image || '@/assets/images/dummy-profile.png');

// Notificaciones desde la API
const notifications = ref<Notificacion[]>([]);
const loadingNotifications = ref(false);

// Computed properties
const userInitials = computed(() => {
  if (!userName.value) return 'U';
  return userName.value
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
});

const unreadNotifications = computed(() => {
  return notifications.value.filter(n => !n.leida).length;
});

// Transformar notificaciones al formato que espera el componente
const formattedNotifications = computed(() => {
  return notifications.value.map(n => ({
    id: n.id,
    type: n.tipo,
    title: n.titulo,
    message: n.mensaje,
    read: n.leida,
    created_at: n.created_at,
    actions: n.acciones
  }));
});

// Funciones para manejar notificaciones
const loadNotifications = async () => {
  try {
    loadingNotifications.value = true;
    const response = await notificacionesService.getNotificaciones({
      leida: false,
      limite: 5
    });
    notifications.value = response.data;
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
  } finally {
    loadingNotifications.value = false;
  }
};

const handleNotificationRead = async (notificationId: string) => {
  try {
    await notificacionesService.marcarNotificacionLeida(notificationId);
    // Actualizar localmente
    const notification = notifications.value.find(n => n.id === notificationId);
    if (notification) {
      notification.leida = true;
    }
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
  }
};

const handleMarkAllAsRead = async () => {
  try {
    await notificacionesService.marcarTodasNotificacionesLeidas();
    // Actualizar localmente
    notifications.value.forEach(n => n.leida = true);
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
  }
};

const handleNotificationAction = (notificationId: string, action: NotificationAction) => {
  console.log('Action clicked:', { notificationId, action });
  // Aquí iría la lógica adicional para manejar las acciones
  // Por ejemplo: navegar a una página, hacer una llamada API, etc.
};

// Métodos
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
  showUserMenu.value = false; // Cerrar menú de usuario si está abierto
};



// Cerrar menús cuando se hace clic fuera
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  // Cerrar menú de usuario
  if (!target.closest('.user-menu') && showUserMenu.value) {
    showUserMenu.value = false;
  }

  // Cerrar popover de notificaciones
  if (!target.closest('.notification-container') && showNotifications.value) {
    showNotifications.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  // Agregar event listener para el click outside
  document.addEventListener('click', handleClickOutside);
  // Cargar notificaciones iniciales
  loadNotifications();
});

onBeforeUnmount(() => {
  // Remover event listener
  document.removeEventListener('click', handleClickOutside);
});
</script>
