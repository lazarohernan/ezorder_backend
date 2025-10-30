<template>
  <aside
    class="transition-all duration-300 bg-gray-800 text-white overflow-hidden m-4 rounded-xl shadow-2xl border border-gray-700 flex flex-col"
    :class="{ 'w-64': !props.collapsed, 'w-20': props.collapsed }"
  >
    <!-- Logo -->
    <div class="flex items-center h-16 px-4 bg-gray-900 rounded-t-xl">
      <div v-if="!props.collapsed" class="font-bold text-xl text-[#FF6424]">EZOrder</div>
      <div v-else class="font-bold text-xl text-[#FF6424]">EZ</div>
      <button
        @click="toggleSidebar"
        class="ml-auto text-gray-400 hover:text-white transition-colors duration-200"
      >
        <ChevronLeft
          :class="{ 'rotate-180': props.collapsed }"
          class="w-5 h-5 transition-transform duration-200"
          stroke-width="1.5"
        />
      </button>
    </div>

    <!-- Menu Items -->
    <nav class="mt-4 px-2 flex-1 overflow-y-auto">
      <template v-for="item in menuItems" :key="item.path">
        <!-- Menu item with submenu -->
        <div v-if="item.submenu" class="mb-1">
          <!-- Parent menu item -->
          <button
            @click="toggleSubmenu(item.path)"
            :title="props.collapsed ? item.name : ''"
            class="flex items-center w-full py-3 rounded-lg transition-colors duration-200"
            :class="[
              props.collapsed ? 'justify-center px-3' : 'px-3',
              isMenuActive(item)
                ? 'bg-[#FF6424] text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
            ]"
          >
            <component :is="item.icon" class="flex-shrink-0 w-6 h-6" stroke-width="1.5" />
            <span
              v-if="!props.collapsed"
              class="ml-3 flex-1 text-left whitespace-nowrap overflow-hidden transition-opacity duration-200"
            >
              {{ item.name }}
            </span>
            <ChevronDown
              v-if="!props.collapsed"
              :class="{ 'rotate-180': expandedMenus[item.path] }"
              class="w-4 h-4 transition-transform duration-200"
              stroke-width="1.5"
            />
          </button>
          
          <!-- Submenu items (only when sidebar is expanded) -->
          <div
            v-if="!props.collapsed && expandedMenus[item.path]"
            class="ml-9 mt-1 space-y-1"
          >
            <router-link
              v-for="subitem in item.submenu"
              :key="subitem.path"
              :to="subitem.path"
              v-permission="subitem.permission || ''"
              class="flex items-center py-2 px-3 rounded-lg text-sm transition-colors duration-200"
              :class="[
                $route.path === subitem.path
                  ? 'bg-[#FF6424]/20 text-[#FF6424]'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white',
              ]"
            >
              {{ subitem.name }}
            </router-link>
          </div>
        </div>

        <!-- Regular menu item without submenu -->
        <router-link
          v-else
          :to="item.path"
          :title="props.collapsed ? item.name : ''"
          class="flex items-center py-3 mb-1 rounded-lg transition-colors duration-200"
          :class="[
            props.collapsed ? 'justify-center px-3' : 'px-3',
            $route.path.startsWith(item.path)
              ? 'bg-[#FF6424] text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white',
          ]"
        >
          <component :is="item.icon" class="flex-shrink-0 w-6 h-6" stroke-width="1.5" />
          <span
            v-if="!props.collapsed"
            class="ml-3 whitespace-nowrap overflow-hidden transition-opacity duration-200"
          >
            {{ item.name }}
          </span>
        </router-link>
      </template>
    </nav>

    <!-- Logout Button -->
    <div class="p-2 border-t border-gray-700">
      <button
        @click="$emit('logout')"
        :title="props.collapsed ? 'Cerrar sesión' : ''"
        class="flex items-center w-full py-3 px-3 rounded-lg transition-colors duration-200 text-gray-300 hover:bg-red-600 hover:text-white"
        :class="props.collapsed ? 'justify-center' : ''"
      >
        <LogOut class="flex-shrink-0 w-6 h-6" stroke-width="1.5" />
        <span
          v-if="!props.collapsed"
          class="ml-3 whitespace-nowrap overflow-hidden transition-opacity duration-200"
        >
          Cerrar sesión
        </span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth_store';
import type { Component } from 'vue';
import {
  Home,
  ClipboardList,
  BookOpen,
  Users,
  Building2,
  Package,
  UserCheck,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Receipt,
  Wallet
} from 'lucide-vue-next';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['toggle', 'logout']);

const route = useRoute();
const { hasPermission } = usePermissions();
const authStore = useAuthStore();

// Watcher para forzar la reactividad cuando userInfo cambie
watch(
  () => authStore.userInfo,
  (newUserInfo) => {
    console.log('UserInfo actualizado en SideBar:', newUserInfo);
  },
  { immediate: true, deep: true }
);

// Tipos para los elementos del menú
interface MenuItem {
  name: string;
  path: string;
  icon?: Component;
  permission?: string; // Permiso requerido para este elemento
  submenu?: SubMenuItem[];
}

interface SubMenuItem {
  name: string;
  path: string;
  permission?: string; // Permiso requerido para este elemento
}

// Estado para controlar submenús expandidos
const expandedMenus = reactive<Record<string, boolean>>({
  '/admin/menu': true, // Expandido por defecto
});

// Menú de navegación con componentes Lucide y permisos en español
const allMenuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/admin/dashboard',
    icon: Home,
    permission: 'dashboard.ver',
  },
  {
    name: 'Pedidos',
    path: '/admin/orders',
    icon: ClipboardList,
    permission: 'pedidos.ver',
  },
  {
    name: 'Menú',
    path: '/admin/menu',
    icon: BookOpen,
    permission: 'menu.ver',
    submenu: [
      {
        name: 'Opciones del Menú',
        path: '/admin/menu',
        permission: 'menu.ver',
      },
      {
        name: 'Categorías',
        path: '/admin/menu/categories',
        permission: 'categorias.ver',
      },
    ],
  },
  {
    name: 'Clientes',
    path: '/admin/clients',
    icon: Users,
    permission: 'clientes.ver',
  },
  {
    name: 'Restaurantes',
    path: '/admin/restaurants',
    icon: Building2,
    permission: 'restaurantes.ver',
  },
  {
    name: 'Inventario',
    path: '/admin/inventory',
    icon: Package,
    permission: 'inventario.ver',
  },
  {
    name: 'Gastos',
    path: '/admin/gastos',
    icon: Receipt,
    permission: 'gastos.ver',
  },
  {
    name: 'Caja',
    path: '/admin/caja',
    icon: Wallet,
    permission: 'caja.ver',
  },
  {
    name: 'Usuarios',
    path: '/admin/users',
    icon: UserCheck,
    permission: 'usuarios.ver',
    submenu: [
      {
        name: 'Gestión de Usuarios',
        path: '/admin/users',
        permission: 'usuarios.ver',
      },
      {
        name: 'Roles Personalizados',
        path: '/admin/roles',
        permission: 'roles.ver',
      },
    ],
  },
];

// Computed para filtrar elementos del menú basado en permisos
const menuItems = computed(() => {
  return allMenuItems
    .filter(item => {
      // Si no requiere permiso, mostrar siempre
      if (!item.permission) return true;
      
      // Verificar si tiene el permiso requerido
      return hasPermission(item.permission).value;
    })
    .map(item => {
      // Si tiene submenú, filtrar también los subelementos
      if (item.submenu) {
        const filteredSubmenu = item.submenu.filter(subitem => {
          // Si no requiere permiso, mostrar siempre
          if (!subitem.permission) return true;
          
          // Verificar si tiene el permiso requerido
          return hasPermission(subitem.permission).value;
        });
        
        return {
          ...item,
          submenu: filteredSubmenu.length > 0 ? filteredSubmenu : undefined,
        };
      }
      
      return item;
    })
    .filter(item => {
      // Si no tiene submenú, mantenerlo
      if (!item.submenu) return true;
      
      // Si tiene submenú, mostrarlo si tiene subelementos o si el principal tiene permiso
      const hasMainPermission = !item.permission || hasPermission(item.permission).value;
      return hasMainPermission && (item.submenu && item.submenu.length > 0);
    });
});

// Métodos
const toggleSidebar = () => {
  emit('toggle');
};

const toggleSubmenu = (path: string) => {
  // Si el sidebar está colapsado, expandirlo primero
  if (props.collapsed) {
    emit('toggle');
  }
  // Luego alternar el estado del submenú
  expandedMenus[path] = !expandedMenus[path];
};

const isMenuActive = (item: MenuItem): boolean => {
  if (!item.submenu) return false;
  return item.submenu.some((sub: SubMenuItem) => route.path === sub.path);
};
</script>
