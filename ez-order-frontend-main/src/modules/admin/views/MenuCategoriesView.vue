<template>
  <div class="min-h-screen bg-gray-50/90 p-4 md:p-8 space-y-6">
    <header class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Categorías del Menú</h1>
          <p class="text-sm font-medium text-gray-600">
            Administra las categorías globales disponibles para tus productos.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="fetchCategorias"
            class="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-600 transition hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-700"
            :disabled="loading"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M20 20v-5h-.581m-15.357-2a8.003 8.003 0 0015.357 2" />
            </svg>
            Actualizar
          </button>
          <button
            type="button"
            @click="openCreateModal"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
            </svg>
            Nueva categoría
          </button>
        </div>
      </div>
    </header>

    <section class="rounded-3xl border border-gray-100 bg-white/95 backdrop-blur shadow-sm">
      <div class="overflow-hidden rounded-3xl">
        <div class="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50/70">
          <div>
            <p class="text-sm font-semibold text-gray-800">Listado de categorías</p>
            <p class="text-xs text-gray-500">Mostrando {{ categorias.length }} categorías registradas</p>
          </div>
          <span v-if="loading" class="inline-flex items-center gap-2 text-xs font-medium text-orange-600">
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 12a8 8 0 018-8" />
            </svg>
            Cargando categorías...
          </span>
        </div>

        <div class="px-6 py-4">
          <div v-if="error" class="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
            {{ error }}
          </div>

          <div v-if="!loading && categorias.length === 0" class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
            <div class="flex flex-col items-center gap-3">
              <svg class="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5h6m-6 4h6m-9 4h9m-8 4h7M5 5v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
              </svg>
              <h3 class="text-sm font-semibold text-gray-700">No hay categorías registradas</h3>
              <p class="text-xs text-gray-500 max-w-sm">
                Cuando registres categorías globales para tu catálogo, aparecerán listadas en esta tabla.
              </p>
            </div>
          </div>

          <div v-else class="overflow-x-auto rounded-2xl border border-gray-100">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50/80">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Descripción</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Creada</th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Opciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 bg-white/80">
                <tr v-for="categoria in categorias" :key="categoria.id" class="hover:bg-orange-50/40 transition-colors">
                  <td class="px-6 py-4 text-sm font-semibold text-gray-800">
                    {{ categoria.nombre }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">
                    {{ categoria.descripcion || '—' }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    {{ formatDate(categoria.created_at) }}
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        @click="openEditModal(categoria)"
                        class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-600 transition hover:border-orange-200 hover:text-orange-600"
                      >
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.862 4.487l1.687 1.688c.413.412.413 1.08 0 1.493l-8.955 8.955a2 2 0 01-.852.502l-3.4.972a.5.5 0 01-.62-.62l.972-3.4a2 2 0 01.502-.852l8.955-8.955c.413-.413 1.08-.413 1.493 0z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        type="button"
                        @click="openDeleteModal(categoria)"
                        class="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 font-semibold text-red-500 transition hover:bg-red-50"
                      >
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v2M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- Modal para crear categoría -->
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-screen items-center justify-center px-4 py-6">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeModal"></div>
        
        <div class="relative inline-block w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
          <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-6 py-4 border-b border-orange-100">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Nueva Categoría</h3>
                <p class="text-xs text-gray-600">Agrega una categoría para organizar tu menú</p>
              </div>
              <button
                @click="closeModal"
                class="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
            <div v-if="formError" class="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
              {{ formError }}
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
              <input
                v-model="formData.nombre"
                type="text"
                required
                placeholder="Ej: Bebidas, Postres, Entradas..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
              <textarea
                v-model="formData.descripcion"
                rows="3"
                placeholder="Describe esta categoría..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              ></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="inline-flex items-center gap-2 rounded-xl bg-gray-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
              >
                <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 12a8 8 0 018-8" />
                </svg>
                {{ saving ? 'Guardando...' : 'Crear Categoría' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal para editar categoría -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-screen items-center justify-center px-4 py-6">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeEditModal"></div>
        
        <div class="relative inline-block w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
          <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-6 py-4 border-b border-orange-100">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Editar Categoría</h3>
                <p class="text-xs text-gray-600">Modifica la información de la categoría</p>
              </div>
              <button
                @click="closeEditModal"
                class="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form @submit.prevent="handleUpdate" class="p-6 space-y-4">
            <div v-if="formError" class="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
              {{ formError }}
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
              <input
                v-model="editFormData.nombre"
                type="text"
                required
                placeholder="Ej: Bebidas, Postres, Entradas..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
              <textarea
                v-model="editFormData.descripcion"
                rows="3"
                placeholder="Describe esta categoría..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              ></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeEditModal"
                class="inline-flex items-center gap-2 rounded-xl bg-gray-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
              >
                <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 12a8 8 0 018-8" />
                </svg>
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para eliminar -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-screen items-center justify-center px-4 py-6">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeDeleteModal"></div>
        
        <div class="relative inline-block w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
          <div class="bg-gradient-to-br from-red-50 via-white to-red-100 px-6 py-4 border-b border-red-100">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Eliminar Categoría</h3>
                <p class="text-xs text-gray-600">Esta acción no se puede deshacer</p>
              </div>
              <button
                @click="closeDeleteModal"
                class="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="p-6">
            <div v-if="formError" class="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
              {{ formError }}
            </div>

            <div class="flex justify-center mb-4">
              <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v2M4 7h16" />
                </svg>
              </div>
            </div>

            <div class="text-center mb-6">
              <p class="text-sm font-semibold text-gray-800 mb-2">
                ¿Estás seguro de eliminar la categoría "<span class="text-orange-600">{{ categoryToDelete?.nombre }}</span>"?
              </p>
              <p class="text-xs text-gray-500">
                Esta acción eliminará permanentemente la categoría del sistema.
              </p>
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                @click="closeDeleteModal"
                class="inline-flex items-center gap-2 rounded-xl bg-gray-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                @click="handleDelete"
                :disabled="saving"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-red-600 hover:to-red-700 disabled:opacity-60"
              >
                <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 12a8 8 0 018-8" />
                </svg>
                {{ saving ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { CategoriasService } from '@/services/categorias_service';
import type { CategoriaMenu } from '@/services/categorias_service';

const categorias = ref<CategoriaMenu[]>([]);
const loading = ref<boolean>(false);
const error = ref<string>('');
const showModal = ref<boolean>(false);
const showEditModal = ref<boolean>(false);
const showDeleteModal = ref<boolean>(false);
const saving = ref<boolean>(false);
const formError = ref<string>('');
const formData = ref({
  nombre: '',
  descripcion: '',
});
const editFormData = ref({
  id: '',
  nombre: '',
  descripcion: '',
});
const categoryToDelete = ref<CategoriaMenu | null>(null);

const fetchCategorias = async () => {
  loading.value = true;
  error.value = '';

  try {
    const response = await CategoriasService.getAll();
    categorias.value = response.data.data || [];
  } catch (err) {
    console.error('Error al cargar categorías:', err);
    error.value = 'No se pudieron cargar las categorías. Intenta de nuevo más tarde.';
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  formData.value = { nombre: '', descripcion: '' };
  formError.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  formData.value = { nombre: '', descripcion: '' };
  formError.value = '';
};

const handleSubmit = async () => {
  if (!formData.value.nombre.trim()) {
    formError.value = 'El nombre es obligatorio';
    return;
  }

  saving.value = true;
  formError.value = '';

  try {
    await CategoriasService.create({
      nombre: formData.value.nombre.trim(),
      descripcion: formData.value.descripcion.trim() || undefined,
    });

    closeModal();
    await fetchCategorias();
  } catch (err: unknown) {
    console.error('Error al crear categoría:', err);
    const error = err as { response?: { data?: { message?: string } } };
    formError.value = error.response?.data?.message || 'No se pudo crear la categoría. Intenta de nuevo.';
  } finally {
    saving.value = false;
  }
};

const openEditModal = (categoria: CategoriaMenu) => {
  editFormData.value = {
    id: categoria.id,
    nombre: categoria.nombre,
    descripcion: categoria.descripcion || '',
  };
  formError.value = '';
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editFormData.value = { id: '', nombre: '', descripcion: '' };
  formError.value = '';
};

const handleUpdate = async () => {
  if (!editFormData.value.nombre.trim()) {
    formError.value = 'El nombre es obligatorio';
    return;
  }

  saving.value = true;
  formError.value = '';

  try {
    await CategoriasService.update(editFormData.value.id, {
      nombre: editFormData.value.nombre.trim(),
      descripcion: editFormData.value.descripcion.trim() || undefined,
    });

    closeEditModal();
    await fetchCategorias();
  } catch (err: unknown) {
    console.error('Error al actualizar categoría:', err);
    const error = err as { response?: { data?: { message?: string } } };
    formError.value = error.response?.data?.message || 'No se pudo actualizar la categoría. Intenta de nuevo.';
  } finally {
    saving.value = false;
  }
};

const openDeleteModal = (categoria: CategoriaMenu) => {
  categoryToDelete.value = categoria;
  formError.value = '';
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  categoryToDelete.value = null;
  formError.value = '';
};

const handleDelete = async () => {
  if (!categoryToDelete.value) return;

  saving.value = true;
  formError.value = '';

  try {
    await CategoriasService.delete(categoryToDelete.value.id);
    closeDeleteModal();
    await fetchCategorias();
  } catch (err: unknown) {
    console.error('Error al eliminar categoría:', err);
    const error = err as { response?: { data?: { message?: string; hasAssociatedItems?: boolean } } };
    const errorMessage = error.response?.data?.message || 'No se pudo eliminar la categoría. Intenta de nuevo.';
    const hasAssociatedItems = error.response?.data?.hasAssociatedItems || false;
    
    if (hasAssociatedItems) {
      formError.value = errorMessage;
    } else {
      formError.value = errorMessage;
    }
  } finally {
    saving.value = false;
  }
};

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

onMounted(() => {
  fetchCategorias();
});
</script>
