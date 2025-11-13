<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Restaurantes</h1>
          <p class="text-sm font-medium text-gray-600">Administra todos los restaurantes de tu plataforma</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="openModal('create')"
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
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Nuevo Restaurante</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Estado de carga -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow-sm"
    >
      <svg
        class="animate-spin h-10 w-10 text-orange-500"
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
      <p class="mt-4 text-gray-600">Cargando restaurantes...</p>
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
        <div class="flex-1">
          <h3 class="text-lg font-medium text-red-800">Error al cargar datos</h3>
          <p class="text-red-700">{{ error }}</p>
          <button
            @click="loadRestaurantes"
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

    <!-- Mensaje si no hay restaurantes -->
    <div
      v-else-if="restaurantes.length === 0"
      class="px-6 py-16"
    >
      <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-16 w-16 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 class="text-sm font-semibold text-gray-700">No hay restaurantes registrados</h3>
          <p class="text-xs text-gray-500 max-w-sm">
            Comienza a agregar restaurantes para gestionar tu plataforma.
          </p>
          <button
            @click="openModal('create')"
            class="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Agregar mi primer restaurante</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Grid de restaurantes -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <!-- Card para cada restaurante -->
      <div
        v-for="restaurante in restaurantes"
        :key="restaurante.id"
        class="group relative bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all duration-300"
      >
        <!-- Imagen/Logo del restaurante -->
        <div class="h-48 bg-gradient-to-br from-orange-50 to-orange-100 overflow-hidden relative">
          <img
            v-if="restaurante.logo_restaurante"
            :src="restaurante.logo_restaurante"
            :alt="restaurante.nombre_restaurante"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div v-else class="h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-16 w-16 text-orange-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>

          <!-- Menú acciones contextual -->
          <div class="absolute top-3 right-3">
            <button
              @click.stop="toggleMenu(restaurante.id!)"
              class="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-gray-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
                />
              </svg>
            </button>
            <div
              v-if="activeMenu === restaurante.id"
              class="absolute top-12 right-0 bg-white rounded-xl shadow-xl py-2 w-48 z-10 border border-gray-100"
            >
              <button
                @click="viewDetails(restaurante)"
                class="w-full text-left px-4 py-2.5 hover:bg-orange-50 flex items-center transition-colors duration-150"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 mr-3 text-blue-500"
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
                <span class="text-sm font-medium text-gray-700">Ver detalles</span>
              </button>
              <button
                @click="openModal('edit', restaurante)"
                class="w-full text-left px-4 py-2.5 hover:bg-orange-50 flex items-center transition-colors duration-150"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 mr-3 text-amber-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                  />
                </svg>
                <span class="text-sm font-medium text-gray-700">Editar</span>
              </button>
              <button
                @click="confirmDelete(restaurante)"
                class="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center transition-colors duration-150 text-red-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 mr-3 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-sm font-medium">Eliminar</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Información del restaurante -->
        <div class="p-5">
          <h3 class="text-lg font-bold text-gray-900 truncate mb-2">
            {{ restaurante.nombre_restaurante }}
          </h3>
          <p v-if="restaurante.direccion_restaurante" class="text-gray-600 text-sm line-clamp-2 mb-3">
            {{ restaurante.direccion_restaurante }}
          </p>
          <p v-else class="text-gray-400 text-sm italic mb-3">Sin dirección registrada</p>

          <!-- Fecha de creación -->
          <div class="flex items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 mr-1.5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{{ formatDate(restaurante.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para crear/editar restaurante -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <!-- Overlay con backdrop blur -->
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

          <!-- Modal Container -->
          <div class="relative inline-block w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header con gradiente -->
            <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-8 py-6 border-b border-orange-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div class="text-left">
                    <h3 class="text-2xl font-bold tracking-tight text-gray-900">
                      {{ modalMode === 'create' ? 'Crear Nuevo Restaurante' : 'Editar Restaurante' }}
                    </h3>
                    <p class="text-sm font-medium text-gray-600">
                      {{ modalMode === 'create' ? 'Agrega un nuevo restaurante al sistema' : 'Modifica la información del restaurante' }}
                    </p>
                  </div>
                </div>
                <button
                  @click="closeModal"
                  class="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
                >
                  <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <form @submit.prevent="submitForm" class="px-8 py-6 space-y-6">
              <!-- Logo del restaurante -->
              <div>
                <label for="logo" class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Logo del restaurante
                </label>
                <div class="flex items-start gap-4">
                  <!-- Vista previa de la imagen seleccionada -->
                  <div v-if="logoPreview || formData.logo_restaurante" class="flex-shrink-0">
                    <img
                      :src="logoPreview || formData.logo_restaurante || ''"
                      alt="Vista previa del logo"
                      class="w-40 h-40 object-cover rounded-xl shadow-sm border border-gray-200"
                    />
                  </div>
                  
                  <!-- Controles del logo -->
                  <div class="flex-1 space-y-3">
                    <!-- Selector de archivo -->
                    <input
                      id="logoFile"
                      type="file"
                      ref="logoFileInput"
                      @change="handleLogoChange"
                      accept="image/*"
                      class="hidden"
                    />
                    <div class="flex flex-col gap-3">
                      <button
                        type="button"
                        @click="triggerFileInput"
                        class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors duration-200 text-sm font-medium w-full sm:w-auto"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Seleccionar imagen
                      </button>
                      <span v-if="logoFile" class="text-sm text-gray-600 font-medium">
                        {{ logoFile.name }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Nombre del restaurante -->
              <div>
                <label for="nombre" class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Nombre del restaurante <span class="text-red-500">*</span>
                </label>
                <input
                  id="nombre"
                  v-model="formData.nombre_restaurante"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="Ej: Restaurante El Buen Sabor"
                />
              </div>

              <!-- Dirección -->
              <div>
                <label for="direccion" class="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Dirección
                </label>
                <textarea
                  id="direccion"
                  v-model="formData.direccion_restaurante"
                  rows="2"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
                  placeholder="Ej: Av. Principal #123, Colonia Centro"
                ></textarea>
              </div>

              <!-- Error del formulario si existe -->
              <div v-if="formError" class="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                <div class="flex items-start">
                  <svg class="h-5 w-5 mr-2 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{{ formError }}</span>
                </div>
              </div>
            </form>

            <!-- Footer con botones -->
            <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  @click="closeModal"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  type="submit"
                  @click="submitForm"
                  :disabled="formLoading"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 shadow-lg disabled:opacity-50"
                >
                  <svg v-if="!formLoading" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span v-if="formLoading" class="flex items-center">
                    <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ modalMode === 'create' ? 'Creando...' : 'Guardando...' }}
                  </span>
                  <span v-else>{{ modalMode === 'create' ? 'Crear Restaurante' : 'Guardar Cambios' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal de confirmación para eliminar -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <!-- Overlay con backdrop blur -->
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showDeleteConfirm = false"></div>

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
                    <h3 class="text-xl font-semibold tracking-tight text-gray-900">Eliminar Restaurante</h3>
                    <p class="text-xs font-medium text-gray-600">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <button
                  @click="showDeleteConfirm = false"
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
                <h3 class="text-lg font-semibold text-gray-900 mb-2">¿Eliminar restaurante?</h3>
                <p class="text-gray-600 text-sm">
                  Esta acción no se puede deshacer. El restaurante será eliminado permanentemente del sistema.
                </p>
              </div>
            </div>

            <!-- Footer con botones -->
            <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <div class="flex justify-end space-x-3">
                <button
                  @click="showDeleteConfirm = false"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  @click="deleteRestaurante"
                  :disabled="deleteLoading"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-red-600 hover:to-red-700 shadow-lg disabled:opacity-50"
                >
                  <svg v-if="!deleteLoading" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span v-if="deleteLoading" class="flex items-center">
                    <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </span>
                  <span v-else>Eliminar Restaurante</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal para ver detalles del restaurante -->
    <Teleport to="body">
      <div v-if="showDetails" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <!-- Overlay con backdrop blur -->
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showDetails = false"></div>

          <!-- Modal Container -->
          <div class="relative inline-block w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header con gradiente -->
            <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-8 py-6 border-b border-orange-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div class="text-left">
                    <h3 class="text-2xl font-bold tracking-tight text-gray-900">Detalles del Restaurante</h3>
                    <p class="text-sm font-medium text-gray-600">Información completa del restaurante</p>
                  </div>
                </div>
                <button
                  @click="showDetails = false"
                  class="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
                >
                  <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <div v-if="selectedRestaurante" class="px-8 py-6">
              <!-- Imagen/Logo -->
              <div class="h-64 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl overflow-hidden mb-6">
                <img
                  v-if="selectedRestaurante.logo_restaurante"
                  :src="selectedRestaurante.logo_restaurante"
                  :alt="selectedRestaurante.nombre_restaurante"
                  class="w-full h-full object-cover"
                />
                <div v-else class="h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-20 w-20 text-orange-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>

              <!-- Información detallada -->
              <div class="space-y-6">
                <div>
                  <h4 class="text-xl font-bold text-gray-900 mb-2">
                    {{ selectedRestaurante.nombre_restaurante }}
                  </h4>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h5 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Dirección</h5>
                    <p class="text-gray-800">
                      {{ selectedRestaurante.direccion_restaurante || 'No especificada' }}
                    </p>
                  </div>

                  <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h5 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Fecha de creación</h5>
                    <p class="text-gray-800">{{ formatDate(selectedRestaurante.created_at) }}</p>
                  </div>

                  <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 md:col-span-2">
                    <h5 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">ID</h5>
                    <p class="text-xs font-mono bg-white p-3 rounded-lg border border-gray-200 text-gray-900 break-all">
                      {{ selectedRestaurante.id }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer con botones -->
            <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <div class="flex justify-end space-x-3">
                <button
                  @click="showDetails = false"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cerrar
                </button>
                <button
                  @click="openModal('edit', selectedRestaurante || undefined)"
                  class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 shadow-lg"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth_store';
import type {
  Restaurante,
  CreateRestauranteDTO,
  UpdateRestauranteDTO,
} from '@/interfaces/Restaurante';
import RestaurantesService from '@/services/restaurantes_service';
import UploadService from '@/services/upload_service';

// Interface for form data that includes ID for edit mode
interface RestauranteFormData extends CreateRestauranteDTO {
  id?: string;
}

// Auth store para verificar autenticación
const authStore = useAuthStore();

// Estado para la lista de restaurantes
const restaurantes = ref<Restaurante[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Estado para los menús contextuales de las cards
const activeMenu = ref<string | null>(null);

// Estado para modales
const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const formData = ref<RestauranteFormData>({
  nombre_restaurante: '',
  direccion_restaurante: '',
  logo_restaurante: '',
});
const formLoading = ref(false);
const formError = ref<string | null>(null);

// Estado para confirmación de eliminación
const showDeleteConfirm = ref(false);
const restauranteToDelete = ref<Restaurante | null>(null);
const deleteLoading = ref(false);

// Estado para vista de detalles
const showDetails = ref(false);
const selectedRestaurante = ref<Restaurante | null>(null);

// Añade estas variables y funciones en <script setup>
const logoFile = ref<File | null>(null);
const logoPreview = ref<string | null>(null);
const logoFileInput = ref<HTMLInputElement | null>(null);

// Cargar restaurantes al montar el componente
onMounted(() => {
  checkAuthAndLoadData();
});

// También verificar cuando cambie el estado de inicialización
watch(
  () => authStore.isInitialized,
  (isInit) => {
    if (isInit) {
      checkAuthAndLoadData();
    }
  },
);

// Verificar autenticación y cargar datos
const checkAuthAndLoadData = async () => {
  if (!authStore.isInitialized) {
    // El store aún se está inicializando, esperamos
    loading.value = true;
    return;
  }

  if (!authStore.isAuthenticated) {
    // No autenticado, mostrar error
    error.value = 'Sesión no válida. Por favor inicia sesión nuevamente.';
    loading.value = false;
    return;
  }

  // Usuario autenticado, cargar restaurantes
  loadRestaurantes();
};

// Cargar lista de restaurantes
const loadRestaurantes = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await RestaurantesService.getAll();
    if (response.data.success) {
      restaurantes.value = response.data.data || [];
    } else {
      error.value = response.data.message || 'Error al cargar restaurantes';
    }
  } catch (err) {
    console.error('Error al cargar restaurantes:', err);
    error.value = 'No se pudieron cargar los restaurantes. Intenta nuevamente.';
  } finally {
    loading.value = false;
  }
};

// Mostrar/ocultar menú contextual
const toggleMenu = (id: string) => {
  if (activeMenu.value === id) {
    activeMenu.value = null;
  } else {
    activeMenu.value = id;
  }
};

// Formatear fecha para mostrar
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Fecha desconocida';

  const date = new Date(dateString);
  return date.toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Tegucigalpa',
  });
};

// Abrir modal para crear o editar
const openModal = (mode: 'create' | 'edit', restaurante?: Restaurante) => {
  modalMode.value = mode;
  formError.value = null;

  if (mode === 'create') {
    formData.value = {
      nombre_restaurante: '',
      direccion_restaurante: '',
      logo_restaurante: '',
    };
  } else if (restaurante) {
    formData.value = {
      nombre_restaurante: restaurante.nombre_restaurante,
      direccion_restaurante: restaurante.direccion_restaurante || '',
      logo_restaurante: restaurante.logo_restaurante || '',
    };
    // Si es edición, guardamos el ID para la actualización
    formData.value.id = restaurante.id;
  }

  showDetails.value = false; // Cerrar detalles si está abierto
  showModal.value = true;
};

// Cerrar modal
const closeModal = () => {
  showModal.value = false;
};

// Maneja la selección de archivo
const handleLogoChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    logoFile.value = input.files[0];

    // Crear una URL para previsualizar la imagen
    if (logoPreview.value) {
      URL.revokeObjectURL(logoPreview.value);
    }
    logoPreview.value = URL.createObjectURL(input.files[0]);
  }
};

// Función para activar el input file
const triggerFileInput = () => {
  if (logoFileInput.value) {
    logoFileInput.value.click();
  }
};

// Modificar la función submitForm para incluir la carga de la imagen
const submitForm = async () => {
  formLoading.value = true;
  formError.value = null;

  try {
    // Si hay un archivo seleccionado, subirlo primero
    if (logoFile.value) {
      const fileFormData = new FormData();
      fileFormData.append('file', logoFile.value);
      fileFormData.append('folder', 'logos'); // Carpeta específica para logos

      try {
        const uploadResult = await UploadService.uploadFile(logoFile.value, 'logos');

        if (!uploadResult.success) {
          formError.value = uploadResult.message || 'Error al subir la imagen. Intenta nuevamente.';
          formLoading.value = false;
          return;
        }

        // Continuar con el resto del código usando uploadResult.url
        formData.value.logo_restaurante = uploadResult.data?.publicUrl;
      } catch (error) {
        console.error('Error al subir el archivo:', error);
        formError.value = 'Error al subir la imagen. Intenta nuevamente.';
        formLoading.value = false;
        return;
      }
    }

    // Continuar con la creación/actualización del restaurante
    if (modalMode.value === 'create') {
      // Crear nuevo restaurante
      try {
        const response = await RestaurantesService.create(formData.value);

        if (response.data.success) {
          // Agregar el nuevo restaurante a la lista
          if (response.data.data) {
            restaurantes.value.push(response.data.data);
          }
          closeModal();

          // Limpiar después de un envío exitoso
          logoFile.value = null;
          if (logoPreview.value) {
            URL.revokeObjectURL(logoPreview.value);
            logoPreview.value = null;
          }
          // Recargar la lista para asegurar que esté actualizada
          await loadRestaurantes();
        } else {
          formError.value = response.data.message || 'Error al crear restaurante';
        }
      } catch (createError: any) {
        // Manejar errores HTTP (403, 500, etc.)
        if (createError.response?.data) {
          const errorData = createError.response.data;
          formError.value = errorData.message || errorData.error || 'Error al crear restaurante';
          
          // Si es un error de permisos, mostrar mensaje específico
          if (createError.response.status === 403) {
            formError.value = errorData.message || 'No tienes permisos para crear restaurantes';
          }
        } else {
          formError.value = createError.message || 'Error al procesar la solicitud. Intenta nuevamente.';
        }
        console.error('Error al crear restaurante:', createError);
        throw createError; // Re-lanzar para que el catch principal lo maneje si es necesario
      }
    } else {
      // Editar restaurante existente
      const id = formData.value.id;
      if (!id) {
        formError.value = 'ID de restaurante no válido';
        formLoading.value = false;
        return;
      }

      const updateData: UpdateRestauranteDTO = {
        nombre_restaurante: formData.value.nombre_restaurante,
        direccion_restaurante: formData.value.direccion_restaurante,
        logo_restaurante: formData.value.logo_restaurante,
      };

      try {
        const response = await RestaurantesService.update(id, updateData);

        if (response.data.success) {
          // Actualizar el restaurante en la lista
          const index = restaurantes.value.findIndex((r) => r.id === id);
          if (index !== -1 && response.data.data) {
            restaurantes.value[index] = response.data.data;
          }
          closeModal();

          // Limpiar después de un envío exitoso
          logoFile.value = null;
          if (logoPreview.value) {
            URL.revokeObjectURL(logoPreview.value);
            logoPreview.value = null;
          }
          // Recargar la lista para asegurar que esté actualizada
          await loadRestaurantes();
        } else {
          formError.value = response.data.message || 'Error al actualizar restaurante';
        }
      } catch (updateError: any) {
        // Manejar errores HTTP (403, 500, etc.)
        if (updateError.response?.data) {
          const errorData = updateError.response.data;
          formError.value = errorData.message || errorData.error || 'Error al actualizar restaurante';
          
          // Si es un error de permisos, mostrar mensaje específico
          if (updateError.response.status === 403) {
            formError.value = errorData.message || 'No tienes permisos para editar restaurantes';
          }
        } else {
          formError.value = updateError.message || 'Error al procesar la solicitud. Intenta nuevamente.';
        }
        console.error('Error al actualizar restaurante:', updateError);
        throw updateError; // Re-lanzar para que el catch principal lo maneje si es necesario
      }
    }
  } catch (err: any) {
    // Este catch maneja errores generales o errores que no se capturaron arriba
    console.error('Error al guardar restaurante:', err);
    
    // Solo mostrar error genérico si no se estableció uno específico antes
    if (!formError.value) {
      if (err.response?.data?.message) {
        formError.value = err.response.data.message;
      } else if (err.message) {
        formError.value = err.message;
      } else {
        formError.value = 'Error al procesar la solicitud. Intenta nuevamente.';
      }
    }
  } finally {
    formLoading.value = false;
  }
};

// Confirmar eliminación
const confirmDelete = (restaurante: Restaurante) => {
  restauranteToDelete.value = restaurante;
  showDeleteConfirm.value = true;
  activeMenu.value = null; // Cerrar menú contextual
};

// Eliminar restaurante
const deleteRestaurante = async () => {
  if (!restauranteToDelete.value || !restauranteToDelete.value.id) return;

  deleteLoading.value = true;

  try {
    const response = await RestaurantesService.delete(restauranteToDelete.value.id);

    if (response.data.success) {
      // Eliminar restaurante de la lista
      restaurantes.value = restaurantes.value.filter((r) => r.id !== restauranteToDelete.value?.id);
      showDeleteConfirm.value = false;
    } else {
      error.value = response.data.message || 'Error al eliminar restaurante';
    }
  } catch (err) {
    console.error('Error al eliminar restaurante:', err);
    error.value = 'Error al eliminar el restaurante. Intenta nuevamente.';
  } finally {
    deleteLoading.value = false;
  }
};

// Ver detalles del restaurante
const viewDetails = (restaurante: Restaurante) => {
  selectedRestaurante.value = restaurante;
  showDetails.value = true;
  activeMenu.value = null; // Cerrar menú contextual
};
</script>
