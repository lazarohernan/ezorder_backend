<template>
  <!-- Notification Popover -->
  <div
    v-if="props.show"
    class="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 transform transition-all duration-200"
    @click.stop
  >
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-xl">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Notificaciones</h3>
        <div class="flex items-center space-x-2">
          <!-- Mark all as read button -->
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200"
          >
            Marcar todas como leídas
          </button>
          <!-- Notification count badge -->
          <span
            v-if="unreadCount > 0"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
          >
            {{ unreadCount }}
          </span>
        </div>
      </div>
    </div>

    <!-- Notifications List -->
    <div class="max-h-96 overflow-y-auto">
      <div v-if="notifications.length === 0" class="p-8 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No hay notificaciones</h3>
        <p class="mt-1 text-sm text-gray-500">Todas las notificaciones aparecerán aquí.</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'p-4 hover:bg-orange-50 transition-colors duration-200 cursor-pointer',
            !notification.read && 'bg-orange-25 border-l-4 border-orange-400'
          ]"
          @click="markAsRead(notification.id)"
        >
          <div class="flex items-start">
            <!-- Notification Icon -->
            <div class="flex-shrink-0">
              <div :class="[
                'flex items-center justify-center h-8 w-8 rounded-full',
                getNotificationIconBg(notification.type)
              ]">
                <svg :class="['h-4 w-4', getNotificationIconColor(notification.type)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getNotificationIconPath(notification.type)" />
                </svg>
              </div>
            </div>

            <!-- Notification Content -->
            <div class="ml-3 flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p :class="[
                  'text-sm font-medium',
                  !notification.read ? 'text-gray-900' : 'text-gray-700'
                ]">
                  {{ notification.title }}
                </p>
                <p class="text-xs text-gray-500">{{ formatTime(notification.created_at) }}</p>
              </div>
              <p :class="[
                'mt-1 text-sm',
                !notification.read ? 'text-gray-700' : 'text-gray-500'
              ]">
                {{ notification.message }}
              </p>

              <!-- Action buttons for certain notification types -->
              <div v-if="notification.actions && notification.actions.length > 0" class="mt-3 flex space-x-2">
                <button
                  v-for="action in notification.actions"
                  :key="action.id"
                  @click.stop="handleAction(notification.id, action)"
                  :class="[
                    'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200',
                    action.type === 'primary'
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>

            <!-- Unread indicator -->
            <div v-if="!notification.read" class="flex-shrink-0 ml-2">
              <div class="h-2 w-2 bg-orange-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
      <button
        @click="viewAllNotifications"
        class="w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200"
      >
        Ver todas las notificaciones
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

// Types
interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
  action: string;
}

interface Notification {
  id: string;
  type: 'order' | 'system' | 'user' | 'payment' | 'warning' | 'stock' | 'gasto';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  actions?: NotificationAction[];
}

// Props y emits
const props = defineProps<{
  show: boolean;
  notifications: Notification[];
}>();

const emit = defineEmits<{
  close: [];
  'mark-as-read': [id: string];
  'mark-all-as-read': [];
  action: [notificationId: string, action: NotificationAction];
}>();

// Estado
const notifications = ref<Notification[]>(props.notifications);

// Computed
const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length;
});

// Métodos
const markAsRead = (notificationId: string) => {
  const notification = notifications.value.find(n => n.id === notificationId);
  if (notification && !notification.read) {
    notification.read = true;
    emit('mark-as-read', notificationId);
  }
};

const markAllAsRead = () => {
  notifications.value.forEach(n => n.read = true);
  emit('mark-all-as-read');
};

const handleAction = (notificationId: string, action: NotificationAction) => {
  console.log('Action clicked:', { notificationId, action });
  emit('action', notificationId, action);
  // Aquí iría la lógica adicional para manejar las acciones
  // Por ejemplo: navegar a una página, hacer una llamada API, etc.
};

const viewAllNotifications = () => {
  console.log('View all notifications');
  // Aquí iría la lógica para navegar a la página de todas las notificaciones
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `hace ${minutes}m`;
  } else if (hours < 24) {
    return `hace ${hours}h`;
  } else {
    return `hace ${days}d`;
  }
};

// Icon helpers
const getNotificationIconBg = (type: string) => {
  const colors = {
    order: 'bg-orange-100',
    system: 'bg-orange-200',
    user: 'bg-orange-100',
    payment: 'bg-orange-200',
    warning: 'bg-orange-300'
  };
  return colors[type as keyof typeof colors] || 'bg-orange-100';
};

const getNotificationIconColor = (type: string) => {
  const colors = {
    order: 'text-orange-600',
    system: 'text-orange-700',
    user: 'text-orange-600',
    payment: 'text-orange-700',
    warning: 'text-orange-800'
  };
  return colors[type as keyof typeof colors] || 'text-orange-600';
};

const getNotificationIconPath = (type: string) => {
  const paths = {
    order: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    system: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    payment: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
  };
  return paths[type as keyof typeof paths] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
};

// Cerrar popover cuando se hace clic fuera
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.notification-container') && props.show) {
    emit('close');
  }
};

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
/* Custom scrollbar for notifications */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
