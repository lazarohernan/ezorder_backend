<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { usePagination } from '@/composables/usePagination';
import UsuariosService from '@/services/usuarios_service';
import type {
  UsuarioWithInfo,
  ApiResponse,
  CreateUsuarioInfoDTO,
  UpdateUsuarioInfoDTO,
} from '@/interfaces/Usuario';
import type { PaginatedResponse } from '@/services/usuarios_service';
import type { AxiosResponse } from 'axios';
import RolesPersonalizadosService, { type RolPersonalizado } from '@/services/roles_personalizados_service';
import type { Restaurante } from '@/interfaces/Restaurante';
import restaurantesService from '@/services/restaurantes_service';
import { CheckCircle, XCircle, AlertCircle, Info, X, Users } from 'lucide-vue-next';
import CustomSelect from '@/components/ui/CustomSelect.vue';

// Adecuar la función de paginación al formato esperado por el composable
const fetchPaginatedUsers = async (params: {
  page: number;
  limit: number;
}): Promise<AxiosResponse<ApiResponse<PaginatedResponse<UsuarioWithInfo>>>> => {
  return await UsuariosService.getAllPaginated(params);
};

onMounted(async () => {
  // Cargar roles personalizados
  try {
    rolesPersonalizados.value = await RolesPersonalizadosService.getRoles();
  } catch (error) {
    console.error('Error al cargar roles personalizados:', error);
  }

  const restaurantesResponse = await restaurantesService.getAll();
  restaurantes.value = restaurantesResponse.data.data ?? [];
});

// Inicializar el composable de paginación
const {
  items: usuarios,
  currentPage,
  totalPages,
  totalItems,
  isLoading,
  error,
  hasPreviousPage,
  hasNextPage,
  goToFirstPage,
  goToPreviousPage,
  goToNextPage,
  goToLastPage,
  refresh,
} = usePagination<UsuarioWithInfo>(fetchPaginatedUsers);

// Estado para modales y formularios
const showViewModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const isCreating = ref(false);
const isSubmitting = ref(false);
const selectedUser = ref<UsuarioWithInfo | null>(null);
const userToDeleteId = ref<string | null>(null);
const rolesPersonalizados = ref<RolPersonalizado[]>([]);
const restaurantes = ref<Restaurante[]>([]);

// Sistema de notificaciones
const notifications = ref<Array<{
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}>>([]);
let notificationId = 0;

function showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string, duration = 5000) {
  const id = ++notificationId;
  notifications.value.push({
    id,
    type,
    message,
    duration
  });

  // Auto-remover después de la duración
  setTimeout(() => {
    removeNotification(id);
  }, duration);
}

function removeNotification(id: number) {
  const index = notifications.value.findIndex(n => n.id === id);
  if (index > -1) {
    notifications.value.splice(index, 1);
  }
}

// Funciones helper para notificaciones
function getNotificationClasses(type: string): string {
  const classes: Record<string, string> = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  };
  return classes[type] || classes.info;
}

function getNotificationIcon(type: string) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };
  return icons[type as keyof typeof icons] || icons.info;
}

function getNotificationIconColor(type: string): string {
  const colors: Record<string, string> = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };
  return colors[type] || colors.info;
}

function getNotificationTextColor(type: string): string {
  const colors: Record<string, string> = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  };
  return colors[type] || colors.info;
}

function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    success: 'Éxito',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Información'
  };
  return titles[type] || titles.info;
}

// Opciones para formularios de usuario
const rolesPersonalizadosOptions = computed(() => [
  { value: null, label: 'Seleccione un rol personalizado' },
  ...rolesPersonalizados.value
    .filter(rol => rol.activo)
    .map(rol => ({
      value: rol.id,
      label: rol.nombre
    }))
]);

const restaurantesOptions = computed(() => [
  { value: null, label: 'Seleccione un restaurante' },
  ...restaurantes.value.map(restaurante => ({
    value: restaurante.id || null,
    label: restaurante.nombre_restaurante
  }))
]);

// Formulario para crear/editar usuario
const userForm = reactive<CreateUsuarioInfoDTO & { 
  email?: string; 
  password?: string; 
  rol_personalizado_id?: number | null;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  restaurante_id?: string | null; // Cambiado de vuelta a string | null
}>({
  id: '',
  email: '',
  password: '',
  nombre: '',
  apellido: '',
  telefono: '',
  nombre_usuario: '',
  rol_id: null,
  rol_personalizado_id: null,
  restaurante_id: null,
});


// Formatea la fecha para mostrarla más amigable
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
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

// Obtener iniciales para avatar
const getInitials = (email: string): string => {
  if (!email) return 'U';
  const parts = email.split('@');
  if (parts.length > 0) {
    const name = parts[0];
    if (name.length > 0) return name.charAt(0).toUpperCase();
  }
  return 'U';
};

// Obtener nombre del rol personalizado
const getRoleName = (usuario: UsuarioWithInfo): string => {
  const userInfo = usuario.user_info as { rol_personalizado_id?: number | null } & typeof usuario.user_info;
  const rolPersonalizadoId = userInfo?.rol_personalizado_id;

  if (rolPersonalizadoId) {
    const rolPersonalizado = rolesPersonalizados.value.find(r => r.id === rolPersonalizadoId);
    if (rolPersonalizado) {
      return `${rolPersonalizado.nombre} ✨`;
    }
  }

  return 'Sin rol personalizado';
};

// Obtener clase de badge para roles personalizados
const getRolBadgeClass = (rolName?: string): string => {
  // Para roles personalizados, usar colores basados en el nombre o un color por defecto
  if (rolName?.includes('Gerente') || rolName?.includes('Admin')) {
    return 'bg-indigo-100 text-indigo-800';
  } else if (rolName?.includes('Mesero') || rolName?.includes('Empleado')) {
    return 'bg-green-100 text-green-800';
  } else if (rolName?.includes('Cocinero') || rolName?.includes('Chef')) {
    return 'bg-yellow-100 text-yellow-800';
  }
  return 'bg-orange-100 text-orange-800'; // Color por defecto para roles personalizados
};

// Funciones para las acciones de usuario
const viewUser = (usuario: UsuarioWithInfo) => {
  selectedUser.value = usuario;
  showViewModal.value = true;
};

const editUser = (usuario: UsuarioWithInfo) => {
  selectedUser.value = usuario;
  isCreating.value = false;

  // Rellenar el formulario con los datos del usuario
  userForm.id = usuario.id;
  userForm.nombre_usuario = usuario.user_info?.nombre_usuario || '';
  const userInfo = usuario.user_info as { rol_personalizado_id?: number | null } & typeof usuario.user_info;
  userForm.rol_personalizado_id = userInfo?.rol_personalizado_id || null;
  userForm.restaurante_id = usuario.user_info?.restaurante_id || null;

  showEditModal.value = true;
};

const openCreateModal = () => {
  // Limpiar el formulario
  userForm.id = '';
  userForm.email = '';
  userForm.nombre = '';
  userForm.apellido = '';
  userForm.telefono = '';
  userForm.nombre_usuario = '';
  userForm.rol_personalizado_id = null;
  userForm.restaurante_id = null;

  isCreating.value = true;
  showEditModal.value = true;
};

const saveUser = async () => {
  isSubmitting.value = true;
  console.log('llegó aquí');
  try {
    if (isCreating.value) {
      // Validar campos requeridos
      if (!userForm.email) {
        showNotification('warning', 'El email es obligatorio');
        isSubmitting.value = false;
        return;
      }

      if (!userForm.nombre || !userForm.apellido) {
        showNotification('warning', 'El nombre y apellido son obligatorios');
        isSubmitting.value = false;
        return;
      }

      // Invitar nuevo usuario (envía email automático)
      const inviteData = {
        email: userForm.email,
        nombre: userForm.nombre!,
        apellido: userForm.apellido!,
        telefono: userForm.telefono ? `+504${userForm.telefono}` : undefined,
      };

      console.log('Datos de invitación que se envían:', inviteData);
      const res = await UsuariosService.invite(inviteData);
      console.log('Respuesta de invitación:', res);

      // Cerrar modal y refrescar datos
      showEditModal.value = false;
      refresh();

      showNotification('success', '¡Invitación enviada! El usuario recibirá un email para establecer su contraseña. Podrás asignarle un rol y restaurante desde la vista de edición.');
    } else {
      // Actualizar usuario existente
      if (!userForm.id) {
        showNotification('error', 'ID de usuario inválido');
        isSubmitting.value = false;
        return;
      }

      const updateData: UpdateUsuarioInfoDTO & { rol_personalizado_id?: number | null } = {
        nombre_usuario: userForm.nombre_usuario || null,
        rol_personalizado_id: userForm.rol_personalizado_id,
        restaurante_id: userForm.restaurante_id,
      };

      await UsuariosService.update(userForm.id, updateData);
      showNotification('success', 'Usuario actualizado con éxito');
    }

    // Cerrar modal y refrescar datos
    showEditModal.value = false;
    refresh();
  } catch (error: unknown) {
    console.error('Error al guardar usuario:', error);
    
    // Extraer mensaje de error del backend
    let errorMessage = 'No se pudo guardar el usuario';
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
      errorMessage = axiosError.response?.data?.message || 
                     axiosError.response?.data?.error || 
                     errorMessage;
    }
    
    showNotification('error', errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};

const confirmDelete = (userId: string) => {
  userToDeleteId.value = userId;
  showDeleteModal.value = true;
};

const proceedDelete = async () => {
  if (!userToDeleteId.value) return;

  isSubmitting.value = true;

  try {
    await UsuariosService.delete(userToDeleteId.value);
    showDeleteModal.value = false;
    refresh(); // Recargar datos después de eliminar
    showNotification('success', 'Usuario eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    const errorMessage = error instanceof Error && 'response' in error
      ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
      : 'No se pudo eliminar el usuario';
    showNotification('error', errorMessage || 'No se pudo eliminar el usuario');
  } finally {
    isSubmitting.value = false;
  }
};

// Función para activar el input file


// Formatea el número de teléfono con el formato XXXX-XXXX
const formatPhoneNumber = (event: Event) => {
  const input = event.target as HTMLInputElement;
  let value = input.value.replace(/\D/g, ''); // Solo números
  
  // Limitar a 8 dígitos
  if (value.length > 8) {
    value = value.substring(0, 8);
  }
  
  // Formatear como XXXX-XXXX
  if (value.length > 4) {
    value = value.substring(0, 4) + '-' + value.substring(4);
  }
  
  input.value = value;
  userForm.telefono = value;
};
</script>

<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Usuarios</h1>
          <p class="text-sm font-medium text-gray-600">Administra todos los usuarios del sistema</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="openCreateModal"
            v-permission="'usuarios.crear'"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="relative z-40 rounded-3xl border border-orange-100 bg-white/80 p-6 backdrop-blur">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Buscar usuarios</label>
          <div class="relative">
            <input
              type="text"
              placeholder="Buscar usuarios..."
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
            @click="refresh"
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
    <div
      v-if="isLoading"
      class="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow-sm"
    >
      <svg
        class="animate-spin h-10 w-10 text-indigo-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p class="mt-4 text-gray-600">Cargando usuarios...</p>
    </div>

    <!-- Estado de error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 p-5 rounded-lg mb-4">
      <div class="flex items-start">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 text-red-500 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h3 class="text-lg font-medium text-red-800">Error al cargar datos</h3>
          <p class="text-red-700">{{ error }}</p>
          <button
            @click="refresh"
            class="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clip-rule="evenodd"
              />
            </svg>
            Reintentar
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla de usuarios -->
    <div v-else-if="usuarios.length > 0" class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50/90">
            <tr>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Usuario
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Rol
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle hidden lg:table-cell"
              >
                Restaurante
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle hidden md:table-cell"
              >
                Fecha creación
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle hidden lg:table-cell"
              >
                Último acceso
              </th>
              <th
                class="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr
              v-for="usuario in usuarios"
              :key="usuario.id"
              class="transition hover:bg-orange-50/60"
            >
              <td class="whitespace-nowrap px-6 py-4 align-middle">
                <div class="flex items-center">
                  <div class="h-8 w-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mr-3">
                    <span class="text-xs font-bold text-orange-800">{{ getInitials(usuario.email || '') }}</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-gray-900">
                      {{ usuario.user_info?.nombre_usuario || 'Sin nombre' }}
                    </span>
                    <span class="text-xs text-gray-500">{{ usuario.email }}</span>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 align-middle">
                <span
                  class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200"
                  :class="getRolBadgeClass(usuario.user_info?.rol?.rol)"
                >
                  {{ getRoleName(usuario) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden lg:table-cell align-middle">
                {{ usuario.user_info?.restaurantes?.nombre_restaurante || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell align-middle">
                {{ formatDate(usuario.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden lg:table-cell align-middle">
                {{ formatDate(usuario.last_sign_in_at) || 'Nunca' }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium align-middle">
                <div class="flex justify-end gap-2">
                  <button
                    @click="viewUser(usuario)"
                    v-permission="'usuarios.ver'"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Ver detalles"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fill-rule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    @click="editUser(usuario)"
                    v-permission="'usuarios.editar'"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-blue-300 hover:text-blue-600"
                    title="Editar usuario"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="confirmDelete(usuario.id)"
                    v-permission="'usuarios.eliminar'"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-red-300 hover:text-red-600"
                    title="Eliminar usuario"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Indicador de información responsive -->
      <div
        class="md:hidden bg-blue-50 p-2 text-xs text-blue-700 text-center border-t border-blue-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 inline-block mr-1"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        Desplaza horizontalmente para ver más información o pulsa Ver para detalles
      </div>

      <!-- Paginación mejorada -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="goToPreviousPage"
            :disabled="!hasPreviousPage"
            :class="[
              !hasPreviousPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
              'relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white',
            ]"
          >
            Anterior
          </button>
          <button
            @click="goToNextPage"
            :disabled="!hasNextPage"
            :class="[
              !hasNextPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
              'ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white',
            ]"
          >
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Mostrando <span class="font-medium">{{ usuarios.length }}</span> de
              <span class="font-medium">{{ totalItems }}</span> usuarios
            </p>
          </div>
          <div>
            <nav
              class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                @click="goToFirstPage"
                :disabled="!hasPreviousPage"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                :class="{ 'opacity-50 cursor-not-allowed': !hasPreviousPage }"
              >
                <span class="sr-only">Primera página</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <button
                @click="goToPreviousPage"
                :disabled="!hasPreviousPage"
                class="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                :class="{ 'opacity-50 cursor-not-allowed': !hasPreviousPage }"
              >
                <span class="sr-only">Anterior</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <span
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
              >
                Página {{ currentPage }} de {{ totalPages }}
              </span>
              <button
                @click="goToNextPage"
                :disabled="!hasNextPage"
                class="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                :class="{ 'opacity-50 cursor-not-allowed': !hasNextPage }"
              >
                <span class="sr-only">Siguiente</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <button
                @click="goToLastPage"
                :disabled="!hasNextPage"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                :class="{ 'opacity-50 cursor-not-allowed': !hasNextPage }"
              >
                <span class="sr-only">Última página</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                  <path
                    fill-rule="evenodd"
                    d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Sin resultados -->
    <div v-else class="px-6 py-16">
      <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <Users class="h-10 w-10 text-gray-300" stroke-width="1.5" />
          <h3 class="text-sm font-semibold text-gray-700">No hay usuarios registrados</h3>
          <p class="text-xs text-gray-500 max-w-sm">
            Cuando invites nuevos usuarios al sistema, aparecerán listados aquí.
          </p>
        </div>
      </div>
    </div>

    <!-- Modal Ver Usuario -->
    <Teleport to="body">
      <div v-if="showViewModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <!-- Overlay con backdrop blur -->
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showViewModal = false"></div>

          <!-- Modal Container -->
          <div class="relative inline-block w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header con gradiente -->
            <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-8 py-6 border-b border-orange-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <h3 class="text-2xl font-bold tracking-tight text-gray-900">Detalles del Usuario</h3>
                    <p class="text-sm font-medium text-gray-600">Información completa del usuario</p>
                  </div>
                </div>
                <button
                  @click="showViewModal = false"
                  class="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
                >
                  <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <!-- Content -->
            <div class="px-8 py-6" v-if="selectedUser">
              <!-- Información del usuario -->
              <div class="flex items-center mb-8">
                <div class="h-20 w-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center text-3xl text-orange-800 mr-6 shadow-lg">
                  {{ getInitials(selectedUser.email || '') }}
                </div>
                <div>
                  <h4 class="text-2xl font-bold text-gray-900 mb-1">
                    {{ selectedUser.user_info?.nombre_usuario || 'Sin nombre' }}
                  </h4>
                  <p class="text-gray-600 text-lg">{{ selectedUser.email }}</p>
                </div>
              </div>

              <!-- Información detallada -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h5 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Correo Electrónico</h5>
                  <p class="text-gray-800">{{ selectedUser.email }}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h5 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Rol</h5>
                  <span
                    class="px-3 py-1 inline-flex text-sm font-semibold rounded-full"
                    :class="getRolBadgeClass(selectedUser.user_info?.rol?.rol)"
                  >
                    {{ getRoleName(selectedUser) }}
                  </span>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h5 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Fecha de Creación</h5>
                  <p class="text-gray-800">{{ formatDate(selectedUser.created_at) }}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h5 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Último Acceso</h5>
                  <p class="text-gray-800">
                    {{ formatDate(selectedUser.last_sign_in_at) || 'Nunca' }}
                  </p>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h5 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Restaurante</h5>
                  <p class="text-gray-800">
                    {{ selectedUser.user_info?.restaurantes?.nombre_restaurante || 'Sin asignar' }}
                  </p>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h5 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Estado</h5>
                  <span class="px-3 py-1 inline-flex text-sm font-semibold rounded-full"
                    :class="selectedUser.confirmed_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'">
                    {{ selectedUser.confirmed_at ? 'Confirmado' : 'Pendiente' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Footer con botones -->
            <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <div class="flex justify-end">
                <button
                  @click="showViewModal = false"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
                >
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

    <!-- Modal Crear/Editar Usuario -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <!-- Overlay con backdrop blur -->
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showEditModal = false"></div>

          <!-- Modal Container -->
          <div class="relative inline-block w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header con gradiente -->
            <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-8 py-6 border-b border-orange-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <h3 class="text-2xl font-bold tracking-tight text-gray-900">{{ isCreating ? 'Crear Nuevo Usuario' : 'Editar Usuario' }}</h3>
                    <p class="text-sm font-medium text-gray-600">{{ isCreating ? 'Agrega un nuevo usuario al sistema' : 'Modifica la información del usuario' }}</p>
                  </div>
                </div>
                <button
                  @click="showEditModal = false"
                  class="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
                >
                  <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <form @submit.prevent="saveUser" class="px-8 py-6 space-y-6">
              <!-- Información General (formato similar al modal de ver permisos) -->
              <div class="grid grid-cols-1 gap-6 mb-6" :class="isCreating ? 'md:grid-cols-1' : 'md:grid-cols-2'">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="text-sm font-semibold text-gray-700 mb-3">Información General</h4>
                  <div class="space-y-3">
                    <!-- Email (solo en creación) -->
                    <div v-if="isCreating">
                      <label class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Email *</label>
                      <input
                        v-model="userForm.email"
                        type="email"
                        autocomplete="email"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        placeholder="usuario@ejemplo.com"
                      />
                      <p class="text-xs text-gray-500 mt-1">Se enviará un email de invitación</p>
                    </div>

                    <!-- Nombre Completo (solo en edición) -->
                    <div v-if="!isCreating">
                      <label class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Nombre Completo</label>
                      <input
                        v-model="userForm.nombre_usuario"
                        type="text"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        placeholder="Juan Pérez"
                      />
                    </div>

                    <!-- Nombre y Apellido (solo en creación) -->
                    <div v-if="isCreating" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Nombre *</label>
                        <input
                          v-model="userForm.nombre"
                          type="text"
                          required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          placeholder="Juan"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Apellido *</label>
                        <input
                          v-model="userForm.apellido"
                          type="text"
                          required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          placeholder="Pérez"
                        />
                      </div>
                    </div>

                    <!-- Teléfono (solo en creación) -->
                    <div v-if="isCreating">
                      <label class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Teléfono</label>
                      <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span class="text-gray-500 text-sm">+504</span>
                        </div>
                        <input
                          v-model="userForm.telefono"
                          type="tel"
                          class="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          placeholder="3192-3654"
                          pattern="[0-9]{4}-[0-9]{4}"
                          maxlength="9"
                          @input="formatPhoneNumber"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                <div v-if="!isCreating" class="bg-gray-50 p-4 rounded-lg">
                  <h4 class="text-sm font-semibold text-gray-700 mb-3">Configuración del Usuario</h4>
                  <div class="space-y-3">

                    <!-- Rol Personalizado (solo en edición) -->
                    <div>
                      <label class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Rol Personalizado
                        <span class="text-orange-600 ml-1">✨</span>
                      </label>
                      <CustomSelect
                        v-model="userForm.rol_personalizado_id"
                        :options="rolesPersonalizadosOptions"
                        placeholder="Seleccionar rol personalizado"
                      />
                      <p class="text-xs text-gray-500 mt-1">Roles con permisos personalizados</p>
                    </div>

                    <!-- Restaurante (solo en edición) -->
                    <div>
                      <label class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Restaurante</label>
                      <CustomSelect
                        v-model="userForm.restaurante_id"
                        :options="restaurantesOptions"
                        placeholder="Seleccionar restaurante"
                      />
                    </div>

                    <!-- Estado (solo en edición) -->
                    <div class="flex justify-between items-center">
                      <span class="text-xs font-medium text-gray-600 uppercase tracking-wide">Estado:</span>
                      <span class="text-sm text-green-600 font-medium">Activo</span>
                    </div>

                    <!-- Super Admin (solo en edición) -->
                    <div class="flex justify-between items-center">
                      <span class="text-xs font-medium text-gray-600 uppercase tracking-wide">Super Admin:</span>
                      <span class="text-sm text-gray-600">No</span>
                    </div>

                    <!-- Creado (solo en edición) -->
                    <div class="flex justify-between items-center">
                      <span class="text-xs font-medium text-gray-600 uppercase tracking-wide">Creado:</span>
                      <span class="text-sm text-gray-900">{{ formatDate(selectedUser?.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </div>

            </form>

            <!-- Footer con botones -->
            <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  @click="showEditModal = false"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  type="submit"
                  @click="saveUser"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 shadow-lg"
                  :disabled="isSubmitting"
                >
                  <svg v-if="!isSubmitting" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span v-if="isSubmitting" class="flex items-center">
                    <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </span>
                  <span v-else>{{ isCreating ? 'Crear Usuario' : 'Guardar Cambios' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal de Confirmación de Eliminación -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <!-- Overlay con backdrop blur -->
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showDeleteModal = false"></div>

          <!-- Modal Container -->
          <div class="relative inline-block w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header con gradiente de advertencia -->
            <div class="bg-gradient-to-br from-red-50 via-white to-red-100 px-6 py-4 border-b border-red-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-xl font-semibold tracking-tight text-gray-900">Eliminar Usuario</h3>
                    <p class="text-xs font-medium text-gray-600">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <button
                  @click="showDeleteModal = false"
                  class="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
                >
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
                <h3 class="text-lg font-semibold text-gray-900 mb-2">¿Eliminar usuario?</h3>
                <p class="text-gray-600 text-sm">
                  Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
                </p>
              </div>
            </div>

            <!-- Footer con botones -->
            <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
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
                  <svg v-if="!isSubmitting" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span v-if="isSubmitting" class="flex items-center">
                    <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </span>
                  <span v-else>Eliminar Usuario</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Sistema de Notificaciones -->
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <transition-group
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition ease-in duration-300"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-full"
      >
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5"
          :class="getNotificationClasses(notification.type)"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <component
                  :is="getNotificationIcon(notification.type)"
                  class="h-6 w-6"
                  :class="getNotificationIconColor(notification.type)"
                />
              </div>
              <div class="ml-3 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium" :class="getNotificationTextColor(notification.type)">
                  {{ getNotificationTitle(notification.type) }}
                </p>
                <p class="mt-1 text-sm text-gray-500">
                  {{ notification.message }}
                </p>
              </div>
              <div class="ml-4 flex-shrink-0 flex">
                <button
                  @click="removeNotification(notification.id)"
                  class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span class="sr-only">Cerrar</span>
                  <X class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.usuarios-container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
