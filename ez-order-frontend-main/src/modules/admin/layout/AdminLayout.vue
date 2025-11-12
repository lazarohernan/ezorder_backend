<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex">
    <!-- Sidebar Component -->
    <SideBar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" @logout="logout" />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden m-4 mr-6">
      <!-- TopBar Component -->
      <div class="bg-white rounded-xl border border-gray-200 mb-4">
        <TopBar @toggle-sidebar="toggleSidebar" @logout="logout" />
      </div>

      <!-- Page content -->
      <main class="flex-1 overflow-auto p-6">
        <router-view></router-view>
      </main>
    </div>

    <!-- Welcome Modal -->
    <WelcomeModal />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SideBar from '../components/SideBar.vue';
import TopBar from '../components/TopBar.vue';
import WelcomeModal from '@/components/modals/WelcomeModal.vue';
import { useAuthStore } from '@/stores/auth_store';
// Estado para controlar el sidebar
const sidebarCollapsed = ref(false);
const router = useRouter();
const authStore = useAuthStore();

// Métodos
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  // Guardar estado en localStorage para mantenerlo entre sesiones
  localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value.toString());
};

const logout = async () => {
  // Cerrar sesión en el store y esperar a que se complete
  await authStore.logout();
  // Redirigir a login después de cerrar sesión
  router.push('/auth/login');
};

// Lifecycle hooks
onMounted(() => {
  // Restaurar estado del sidebar desde localStorage
  const savedState = localStorage.getItem('sidebarCollapsed');
  if (savedState !== null) {
    sidebarCollapsed.value = savedState === 'true';
  }

  // Detectar si es dispositivo móvil y colapsar sidebar automáticamente
  if (window.innerWidth < 1024) {
    sidebarCollapsed.value = true;
  }
});
</script>
