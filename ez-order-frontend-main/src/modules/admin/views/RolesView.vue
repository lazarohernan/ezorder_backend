<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import RolesService, { type RolPersonalizado, type PermisosPorCategoria } from '@/services/roles_personalizados_service';
import { useToast } from 'vue-toastification';
import { Plus, Eye, Pencil, Trash2, Shield, Users, Building, Clipboard, Package, DollarSign, Calculator, BarChart3, Cog } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth_store';

// Estado principal
const rolesPaginados = ref<RolPersonalizado[]>([]);
const permisosPorCategoria = ref<PermisosPorCategoria>({});
const loadingRoles = ref(false);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showViewModal = ref(false);
const isSubmitting = ref(false);
const selectedRole = ref<RolPersonalizado | null>(null);
const roleToDeleteId = ref<number | null>(null);

const toast = useToast();
const authStore = useAuthStore();

// Formulario para crear/editar rol
const roleForm = reactive({
  nombre: '',
  descripcion: '',
  color: '#3B82F6',
  icono: 'user',
  permisos: [] as number[],
  activo: true
});


// Cargar datos iniciales
onMounted(async () => {
  await loadPermisos();
  await loadRoles();
});

// Cargar permisos
const loadPermisos = async () => {
  try {
    permisosPorCategoria.value = await RolesService.getPermisos();
  } catch (error) {
    console.error('Error al cargar permisos:', error);
    toast.error('Error al cargar permisos');
  }
};

// Cargar roles
const loadRoles = async () => {
  loadingRoles.value = true;
  try {
    rolesPaginados.value = await RolesService.getRoles();
  } catch (error) {
    console.error('Error al cargar roles:', error);
    toast.error('Error al cargar roles');
  } finally {
    loadingRoles.value = false;
  }
};

// Obtener icono según la categoría
const getCategoryIcon = (categoria: string): typeof Shield => {
  const icons: Record<string, typeof Shield> = {
    'usuarios': Users,
    'restaurantes': Building,
    'menu': Clipboard,
    'pedidos': Clipboard,
    'inventario': Package,
    'gastos': DollarSign,
    'caja': Calculator,
    'clientes': Users,
    'dashboard': BarChart3,
    'roles': Cog
  };
  return icons[categoria] || Shield;
};

// Formatear fecha
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Tegucigalpa',
  }).format(date);
};

// Abrir modal de creación
const openCreateModal = () => {
  roleForm.nombre = '';
  roleForm.descripcion = '';
  roleForm.color = '#3B82F6';
  roleForm.icono = 'user';
  roleForm.permisos = [];
  roleForm.activo = true;
  showCreateModal.value = true;
};

// Ver rol
const viewRole = (role: RolPersonalizado) => {
  selectedRole.value = role;
  showViewModal.value = true;
};

const closeViewModal = () => {
  showViewModal.value = false;
  selectedRole.value = null;
};

// Editar rol
const editRole = (role: RolPersonalizado) => {
  selectedRole.value = role;
  roleForm.nombre = role.nombre;
  roleForm.descripcion = role.descripcion || '';
  roleForm.color = role.color;
  roleForm.icono = role.icono;
  roleForm.permisos = role.permisos.map(p => p.id);
  roleForm.activo = role.activo;
  showEditModal.value = true;
};

// Cerrar modal de edición
const closeEditModal = () => {
  showEditModal.value = false;
  selectedRole.value = null;
};

// Confirmar eliminación
const confirmDelete = (roleId: number) => {
  roleToDeleteId.value = roleId;
  showDeleteModal.value = true;
};

// Proceder con eliminación
const proceedDelete = async () => {
  if (!roleToDeleteId.value) return;

  isSubmitting.value = true;
  try {
    await RolesService.deleteRol(roleToDeleteId.value);
    showDeleteModal.value = false;
    await loadRoles();
    toast.success('Rol eliminado exitosamente');
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    toast.error('Error al eliminar el rol');
  } finally {
    isSubmitting.value = false;
  }
};

// Guardar rol (crear o editar)
const saveRole = async () => {
  isSubmitting.value = true;

  try {
    const roleData = {
      nombre: roleForm.nombre,
      descripcion: roleForm.descripcion || undefined,
      color: roleForm.color,
      icono: roleForm.icono,
      permisos: roleForm.permisos
    };

    if (selectedRole.value) {
      // Actualizar rol existente
      await RolesService.updateRol(selectedRole.value.id, roleData);
      toast.success('Rol actualizado exitosamente');
    } else {
      // Crear nuevo rol
      await RolesService.createRol(roleData);
      toast.success('Rol creado exitosamente');
    }

    closeEditModal();
    showCreateModal.value = false;
    await loadRoles();

    // Refrescar información del usuario para actualizar permisos
    await authStore.refreshUserInfo();
  } catch (error: unknown) {
    console.error('Error al guardar rol:', error);
    const axiosError = error as { response?: { data?: { message?: string } } };
    const errorMessage = axiosError?.response?.data?.message || 'Error al guardar el rol';
    toast.error(errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};

// Toggle permiso
const togglePermiso = (permisoId: number) => {
  const index = roleForm.permisos.indexOf(permisoId);
  if (index > -1) {
    roleForm.permisos.splice(index, 1);
  } else {
    roleForm.permisos.push(permisoId);
  }
};

// Verificar si un permiso está seleccionado
const isPermisoSelected = (permisoId: number) => {
  return roleForm.permisos.includes(permisoId);
};

</script>

<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Roles</h1>
          <p class="text-sm font-medium text-gray-600">Administra roles personalizados y sus permisos</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="openCreateModal"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus class="h-5 w-5" />
            <span>Nuevo Rol</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="relative z-40 rounded-3xl border border-orange-100 bg-white/80 p-6 backdrop-blur">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Buscar roles</label>
          <div class="relative">
            <input
              type="text"
              placeholder="Buscar roles..."
              class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </div>
        <div class="flex items-end">
          <button
            @click="loadRoles"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-100 hover:border-orange-300 w-full"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refrescar
          </button>
        </div>
      </div>
    </div>

    <!-- Estado de carga -->
    <div v-if="loadingRoles" class="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow-sm">
      <svg class="animate-spin h-10 w-10 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-4 text-gray-600">Cargando roles...</p>
    </div>

    <!-- Tabla de roles -->
    <div v-else-if="rolesPaginados.length > 0" class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50/90">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">Rol</th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">Descripción</th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">Permisos</th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">Estado</th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">Creado</th>
              <th class="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="role in rolesPaginados" :key="role.id" class="transition hover:bg-orange-50/60">
              <td class="whitespace-nowrap px-6 py-4 align-middle">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-orange-100 border-2 border-orange-500"
                    >
                      <Shield class="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ role.nombre }}</div>
                    <div v-if="role.es_super_admin" class="text-xs text-orange-600 font-medium">Super Admin</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 align-middle max-w-xs">
                <div class="truncate">{{ role.descripcion || 'Sin descripción' }}</div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 align-middle">
                <div class="flex flex-wrap gap-1">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {{ role.permisos.length }} permisos
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 align-middle">
                <span
                  class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200"
                  :class="role.activo ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'"
                >
                  {{ role.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 align-middle">
                {{ formatDate(role.created_at) }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium align-middle">
                <div class="flex justify-end gap-2">
                  <button
                    @click="viewRole(role)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Ver detalles"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    @click="editRole(role)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Editar rol"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    @click="confirmDelete(role.id)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-red-300 hover:text-red-600"
                    title="Eliminar rol"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Sin resultados -->
    <div v-else class="px-6 py-16">
      <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <Shield class="h-10 w-10 text-gray-300" stroke-width="1.5" />
          <h3 class="text-sm font-semibold text-gray-700">No hay roles personalizados registrados</h3>
          <p class="text-xs text-gray-500 max-w-sm">
            Cuando crees roles personalizados, aparecerán listados aquí.
          </p>
        </div>
      </div>
    </div>

    <!-- Modal Ver Rol -->
    <Teleport to="body">
      <div v-if="showViewModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"></div>

          <div class="relative inline-block w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header -->
            <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-4 py-3 border-b border-orange-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div
                    class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-orange-100 border-2 border-orange-500"
                  >
                    <Shield class="h-6 w-6 text-orange-600" />
                  </div>
                  <div class="text-left">
                    <h3 class="text-2xl font-bold tracking-tight text-gray-900">{{ selectedRole?.nombre }}</h3>
                    <p class="text-sm font-medium text-gray-600">{{ selectedRole?.descripcion || 'Sin descripción' }}</p>
                  </div>
                </div>
                <button @click="closeViewModal" class="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200">
                  <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="px-8 py-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="text-sm font-semibold text-gray-700 mb-2">Información General</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Estado:</span>
                      <span :class="selectedRole?.activo ? 'text-green-600' : 'text-red-600'">
                        {{ selectedRole?.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Super Admin:</span>
                      <span :class="selectedRole?.es_super_admin ? 'text-orange-600' : 'text-gray-600'">
                        {{ selectedRole?.es_super_admin ? 'Sí' : 'No' }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Creado:</span>
                      <span class="text-gray-900">{{ selectedRole ? formatDate(selectedRole.created_at) : '' }}</span>
                    </div>
                  </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="text-sm font-semibold text-gray-700 mb-2">Permisos ({{ selectedRole?.permisos.length }})</h4>
                  <div class="max-h-32 overflow-y-auto">
                    <div v-if="selectedRole?.permisos.length === 0" class="text-gray-500 text-sm">
                      Sin permisos asignados
                    </div>
                    <div v-else-if="selectedRole" class="space-y-1">
                      <div
                        v-for="permiso in selectedRole.permisos.slice(0, 5)"
                        :key="permiso.id"
                        class="text-xs text-gray-600 bg-white px-2 py-1 rounded"
                      >
                        {{ permiso.nombre }}
                      </div>
                      <div v-if="selectedRole.permisos.length > 5" class="text-xs text-gray-500">
                        ... y {{ selectedRole.permisos.length - 5 }} más
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Permisos por categoría -->
              <div class="space-y-2">
                <h4 class="text-lg font-semibold text-gray-900">Permisos Detallados</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4" v-if="selectedRole">
                  <div
                    v-for="(permisos, categoria) in permisosPorCategoria"
                    :key="categoria"
                    class="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div class="flex items-center mb-3">
                      <component :is="getCategoryIcon(String(categoria))" class="h-5 w-5 mr-2" />
                      <h5 class="text-sm font-medium text-gray-900 capitalize">{{ categoria }}</h5>
                    </div>
                    <div class="space-y-1">
                      <div
                        v-for="permiso in permisos"
                        :key="permiso.id"
                        class="flex items-center text-sm"
                      >
                        <div
                          class="w-4 h-4 rounded mr-2 flex items-center justify-center"
                          :class="selectedRole!.permisos.some(p => p.id === permiso.id) ? 'bg-green-500' : 'bg-gray-200'"
                        >
                          <svg v-if="selectedRole!.permisos.some(p => p.id === permiso.id)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        </div>
                        <span :class="selectedRole!.permisos.some(p => p.id === permiso.id) ? 'text-gray-900' : 'text-gray-500'">
                          {{ permiso.descripcion }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="bg-gray-50 px-4 py-2 border-t border-gray-200">
              <div class="flex justify-end">
                <button @click="closeViewModal" class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Crear Rol -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showCreateModal = false"></div>

          <div class="relative inline-block w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header -->
            <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-4 py-3 border-b border-orange-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Plus class="h-5 w-5 text-white" />
                  </div>
                  <div class="text-left">
                    <h3 class="text-xl font-bold tracking-tight text-gray-900">Crear Nuevo Rol</h3>
                    <p class="text-xs font-medium text-gray-600">Define un rol personalizado con permisos específicos</p>
                  </div>
                </div>
                <button @click="showCreateModal = false" class="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200">
                  <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <form @submit.prevent="saveRole" class="px-4 py-3 space-y-3">
              <!-- Información básica -->
              <div class="flex justify-center">
                <div class="space-y-4 max-w-md w-full">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1 text-center">Nombre del Rol *</label>
                    <input
                      v-model="roleForm.nombre"
                      type="text"
                      required
                      class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center"
                      placeholder="Ej: Cajero Principal"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1 text-center">Descripción</label>
                    <textarea
                      v-model="roleForm.descripcion"
                      rows="2"
                      class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-center"
                      placeholder="Describe las responsabilidades..."
                    ></textarea>
                  </div>
                </div>
              </div>

              <!-- Permisos por categoría -->
              <div class="space-y-4">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-lg font-semibold text-gray-900">Permisos</h4>
                  <div class="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {{ roleForm.permisos.length }} seleccionados
                  </div>
                </div>

                <div class="max-h-96 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50/50 p-4">
                  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div
                      v-for="(permisos, categoria) in permisosPorCategoria"
                      :key="categoria"
                      class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div class="flex items-center mb-4 pb-2 border-b border-gray-100">
                        <component :is="getCategoryIcon(String(categoria))" class="h-5 w-5 mr-3 text-orange-600" />
                        <h5 class="text-sm font-semibold text-gray-900 capitalize">{{ categoria }}</h5>
                        <span class="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {{ permisos.length }}
                        </span>
                      </div>
                      <div class="space-y-2">
                        <div
                          v-for="permiso in permisos"
                          :key="permiso.id"
                          class="flex items-start space-x-3"
                        >
                          <input
                            :id="`permiso-${String(permiso.id)}`"
                            type="checkbox"
                            :checked="isPermisoSelected(permiso.id)"
                            @change="togglePermiso(permiso.id)"
                            class="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                          <div class="flex-1">
                            <label :for="`permiso-${String(permiso.id)}`" class="text-sm font-medium text-gray-700 cursor-pointer">
                              {{ permiso.descripcion }}
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <!-- Footer -->
            <div class="bg-gray-50 px-4 py-2 border-t border-gray-200">
              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  @click="showCreateModal = false"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  type="submit"
                  @click="saveRole"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 shadow-lg"
                  :disabled="isSubmitting"
                >
                  <Plus class="h-5 w-5" />
                  <span v-if="isSubmitting" class="flex items-center">
                    <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </span>
                  <span v-else>Crear Rol</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Editar Rol -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeEditModal"></div>

          <div class="relative inline-block w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header -->
            <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-4 py-3 border-b border-orange-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Pencil class="h-6 w-6 text-white" />
                  </div>
                  <div class="text-left">
                    <h3 class="text-2xl font-bold tracking-tight text-gray-900">Editar Rol</h3>
                    <p class="text-sm font-medium text-gray-600">Modifica los permisos y configuración del rol</p>
                  </div>
                </div>
                <button @click="closeEditModal" class="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200">
                  <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <form @submit.prevent="saveRole" class="px-4 py-3 space-y-3">
              <!-- Información básica -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Rol *</label>
                <input
                  v-model="roleForm.nombre"
                  type="text"
                  required
                  class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ej: Cajero Principal"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <textarea
                  v-model="roleForm.descripcion"
                  rows="2"
                  class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder="Describe las responsabilidades de este rol..."
                ></textarea>
              </div>

              <!-- Estado -->
              <div class="flex items-center space-x-3">
                <input
                  id="activo"
                  v-model="roleForm.activo"
                  type="checkbox"
                  class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label for="activo" class="text-sm font-medium text-gray-700">Rol activo</label>
              </div>

              <!-- Permisos por categoría -->
              <div class="space-y-2">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-base font-semibold text-gray-900">Permisos</h4>
                  <div class="text-xs text-gray-600">
                    {{ roleForm.permisos.length }} seleccionados
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div
                    v-for="(permisos, categoria) in permisosPorCategoria"
                    :key="categoria"
                    class="bg-gray-50 rounded-xl p-3 border border-gray-200"
                  >
                    <div class="flex items-center mb-4">
                      <component :is="getCategoryIcon(String(categoria))" class="h-5 w-5 mr-2" />
                      <h5 class="text-sm font-semibold text-gray-900 capitalize">{{ categoria }}</h5>
                    </div>
                    <div class="space-y-1">
                      <div
                        v-for="permiso in permisos"
                        :key="permiso.id"
                        class="flex items-start space-x-3"
                      >
                        <input
                          :id="`edit-permiso-${String(permiso.id)}`"
                          type="checkbox"
                          :checked="isPermisoSelected(permiso.id)"
                          @change="togglePermiso(permiso.id)"
                          class="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <div class="flex-1">
                          <label :for="`edit-permiso-${String(permiso.id)}`" class="text-sm font-medium text-gray-700 cursor-pointer">
                            {{ permiso.nombre.replace(`${categoria}.`, '') }}
                          </label>
                          <p class="text-xs text-gray-500">{{ permiso.descripcion }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <!-- Footer -->
            <div class="bg-gray-50 px-4 py-2 border-t border-gray-200">
              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  @click="closeEditModal"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  type="submit"
                  @click="saveRole"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 shadow-lg"
                  :disabled="isSubmitting"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span v-if="isSubmitting" class="flex items-center">
                    <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </span>
                  <span v-else>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Confirmación de Eliminación -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showDeleteModal = false"></div>

          <div class="relative inline-block w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header -->
            <div class="bg-gradient-to-br from-red-50 via-white to-red-100 px-6 py-4 border-b border-red-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Trash2 class="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 class="text-xl font-semibold tracking-tight text-gray-900">Eliminar Rol</h3>
                    <p class="text-xs font-medium text-gray-600">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <button @click="showDeleteModal = false" class="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200">
                  <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="px-8 py-6">
              <!-- Icono de advertencia -->
              <div class="flex justify-center mb-4">
                <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              <!-- Mensaje de confirmación -->
              <div class="text-center">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">¿Eliminar rol?</h3>
                <p class="text-gray-600 text-sm">
                  Esta acción eliminará permanentemente el rol y quitará sus permisos a todos los usuarios asignados.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="bg-gray-50 px-4 py-2 border-t border-gray-200">
              <div class="flex justify-end space-x-3">
                <button
                  @click="showDeleteModal = false"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  @click="proceedDelete"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-red-600 hover:to-red-700 shadow-lg"
                  :disabled="isSubmitting"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span v-if="isSubmitting" class="flex items-center">
                    <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </span>
                  <span v-else>Eliminar Rol</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
