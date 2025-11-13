<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Menús</h1>
          <p class="text-sm font-medium text-gray-600">Administra todos los menús del sistema</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="openCreateDialog"
            v-permission="'menu.crear'"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus class="h-5 w-5" />
            <span>Nuevo Menú</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="relative z-40 rounded-3xl border border-orange-100 bg-white/80 p-6 backdrop-blur">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Filtrar por Restaurante</label>
          <CustomSelect
            v-model="selectedRestauranteId"
            :options="restauranteOptions"
            placeholder="Todos los restaurantes"
            @update:modelValue="loadMenus"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Buscar Menús</label>
          <div class="relative">
            <input
              type="text"
              v-model="searchTerm"
              placeholder="Buscar menús..."
              class="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Estado</label>
          <CustomSelect
            v-model="selectedEstado"
            :options="estadoOptions"
            placeholder="Todos los estados"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Elementos por página</label>
          <CustomSelect
            v-model="selectedLimit"
            :options="limitOptions"
            @update:modelValue="onLimitChange"
          />
        </div>
      </div>
    </div>

    <!-- Indicador de carga -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
    </div>

    <!-- Mensaje si no hay menús -->
    <div v-else-if="menus.length === 0" class="px-6 py-16">
      <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6"
            />
          </svg>
          <h3 class="text-sm font-semibold text-gray-700">No hay menús registrados</h3>
          <p class="text-xs text-gray-500 max-w-sm">
            Comienza a agregar menús para tu restaurante.
          </p>
        </div>
      </div>
    </div>

    <!-- Menu Table -->
    <div v-else class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50/90">
            <tr>
              <th
                scope="col"
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Imagen
              </th>
              <th
                scope="col"
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Nombre
              </th>
              <th
                scope="col"
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Precio
              </th>
              <th
                scope="col"
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle hidden md:table-cell"
              >
                Restaurante
              </th>
              <th
                scope="col"
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle hidden sm:table-cell"
              >
                Estado
              </th>
              <th
                scope="col"
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="menu in menus" :key="menu.id" class="transition hover:bg-orange-50/60">
              <td class="px-6 py-4 whitespace-nowrap">
                <img
                  :src="menu.imagen || '/placeholder-menu.png'"
                  :alt="menu.nombre"
                  class="h-12 w-12 object-cover rounded-lg"
                />
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">{{ menu.nombre }}</div>
                <div class="text-sm text-gray-500">{{ menu.descripcion }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ formatCurrencyHNL(menu.precio || 0) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                <div class="text-sm text-gray-900">{{ menu.restaurantes?.nombre_restaurante }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                <span
                  :class="[
                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                    menu.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                  ]"
                >
                  {{ menu.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium align-middle">
                <div class="flex justify-end gap-2">
                  <button
                    @click="viewMenu(menu)"
                    v-permission="'menu.ver'"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Ver detalles"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    @click="editMenu(menu)"
                    v-permission="'menu.editar'"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Editar"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    @click="confirmDelete(menu)"
                    v-permission="'menu.eliminar'"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:border-red-300 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Indicador de información responsive -->
      <div
        class="md:hidden bg-orange-50 p-2 text-xs text-orange-700 text-center border-t border-orange-100"
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

      <!-- Paginación Optimizada -->
      <div v-if="totalItems > 0" class="px-8 py-4 border-t border-gray-200 bg-white">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Información de resultados -->
          <div class="flex items-center gap-4 text-sm text-gray-600">
            <span>
              Mostrando <span class="font-semibold text-gray-900">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> a
              <span class="font-semibold text-gray-900">{{ Math.min(currentPage * itemsPerPage, totalItems) }}</span> de
              <span class="font-semibold text-gray-900">{{ totalItems }}</span> resultados
            </span>
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600">Mostrar:</label>
              <select
                :value="itemsPerPage"
                @change="(e) => { changeItemsPerPage(Number((e.target as HTMLSelectElement).value)); }"
                class="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
        </div>
          </div>

          <!-- Controles de paginación -->
          <div class="flex items-center gap-2">
            <!-- Botón Primera página -->
              <button
                @click="goToFirstPage"
              :disabled="!hasPreviousPage || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Primera página"
            >
              ««
              </button>

            <!-- Botón Anterior -->
              <button
                @click="goToPreviousPage"
              :disabled="!hasPreviousPage || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Página anterior"
                >
              ← Anterior
              </button>

            <!-- Números de página -->
            <div class="flex items-center gap-1">
              <template v-for="pageNum in getPageNumbers()" :key="pageNum">
                <button
                  v-if="pageNum !== '...'"
                  @click="goToPage(pageNum as number)"
                  :disabled="loading"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                    pageNum === currentPage
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border border-orange-500'
                      : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed'
                  ]"
                >
                  {{ pageNum }}
                </button>
                <span v-else class="px-2 text-gray-400">...</span>
              </template>
            </div>

            <!-- Botón Siguiente -->
              <button
                @click="goToNextPage"
              :disabled="!hasNextPage || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Página siguiente"
            >
              Siguiente →
              </button>

            <!-- Botón Última página -->
              <button
                @click="goToLastPage"
              :disabled="!hasNextPage || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Última página"
            >
              »»
              </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Vista Detallada -->
    <div v-if="showViewDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
        <!-- Overlay con backdrop blur -->
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeViewDialog"></div>

        <!-- Modal Container -->
        <div class="relative inline-block w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
          <!-- Header con gradiente -->
          <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-8 py-6 border-b border-orange-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Eye class="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 class="text-2xl font-bold tracking-tight text-gray-900">Detalles del Menú</h3>
                  <p class="text-sm font-medium text-gray-600">Información completa del producto</p>
                </div>
              </div>
              <button
                @click="closeViewDialog"
                class="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
              >
                <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="px-8 py-6">
            <!-- Imagen y información principal -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
              <img
                :src="selectedMenu?.imagen || '/placeholder-menu.png'"
                class="h-20 w-20 object-cover rounded-xl border-2 border-orange-100"
              />
              <div class="flex-1">
                <h4 class="text-2xl font-bold text-gray-900 mb-1">{{ selectedMenu?.nombre }}</h4>
                <p class="text-gray-600 text-sm leading-relaxed">{{ selectedMenu?.descripcion }}</p>
                <div class="flex items-center space-x-4 mt-3">
                  <div class="flex items-center space-x-1">
                    <svg class="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-lg font-bold text-orange-600">{{ formatCurrencyHNL(selectedMenu?.precio || 0) }}</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span class="text-sm font-medium text-gray-700">{{ selectedMenu?.restaurantes?.nombre_restaurante }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Información fiscal compacta -->
            <div class="grid grid-cols-1 gap-4">
              <div class="bg-orange-50 rounded-lg p-3 border border-orange-100">
                <div class="text-xs font-medium text-orange-700 mb-1">Impuesto</div>
                <div class="text-sm font-semibold text-orange-800">{{ selectedMenu?.porcentaje_impuesto }}%</div>
              </div>
            </div>

            <!-- Estados fiscales si aplican -->
            <div v-if="selectedMenu?.es_exento || selectedMenu?.es_exonerado" class="mt-4 flex gap-2">
              <span v-if="selectedMenu?.es_exento" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Exento
              </span>
              <span v-if="selectedMenu?.es_exonerado" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Exonerado
              </span>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div class="flex justify-end">
              <button
                @click="closeViewDialog"
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

    <!-- Modal de Crear/Editar Menú -->
    <div v-if="showDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
        <!-- Overlay con backdrop blur -->
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeDialog"></div>

        <!-- Modal Container -->
        <div class="relative inline-block w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all z-[60]">
          <!-- Header con gradiente -->
          <div class="bg-gradient-to-br from-orange-50 via-white to-orange-100 px-8 py-6 border-b border-orange-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div class="text-left">
                  <h3 class="text-2xl font-bold tracking-tight text-gray-900">{{ isEditing ? 'Editar Menú' : 'Nuevo Menú' }}</h3>
                  <p class="text-sm font-medium text-gray-600">{{ isEditing ? 'Modifica la información del menú' : 'Agrega un nuevo menú al catálogo' }}</p>
                </div>
              </div>
              <button
                @click="closeDialog"
                class="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
              >
                <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="px-8 py-6">
            <form @submit.prevent="saveMenu" class="space-y-6">
              <!-- Imagen destacada al inicio -->
              <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border border-orange-200 mb-6">
                <div class="flex items-start gap-8">
                  <!-- Imagen del lado izquierdo -->
                  <div class="flex-shrink-0">
                    <div v-if="formData.imagen" class="h-48 w-48 rounded-3xl overflow-hidden">
                      <img
                        :src="formData.imagen"
                        class="h-full w-full object-cover"
                      />
                    </div>
                    <div v-else class="h-48 w-48 rounded-3xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <svg class="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  <!-- Controles del lado derecho -->
                  <div class="flex-1 flex flex-col justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      @change="handleImageUpload"
                      class="hidden"
                      ref="fileInput"
                    />

                    <!-- Botones en fila horizontal -->
                    <div class="flex items-center gap-3 mb-4">
                      <button
                        type="button"
                        @click="handleFileInputClick"
                        class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-orange-700 bg-white rounded-xl border border-orange-300 hover:bg-orange-50 transition-all duration-200 shadow-sm"
                      >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Cambiar Imagen
                      </button>

                      <button
                        v-if="formData.imagen"
                        type="button"
                        @click="removeImage"
                        class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-700 bg-white rounded-xl border border-red-300 hover:bg-red-50 transition-all duration-200 shadow-sm"
                      >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>

                    <!-- Información de formatos -->
                    <div class="text-left">
                      <p class="text-sm text-orange-600 font-medium mb-1">Formatos soportados:</p>
                      <p class="text-sm text-gray-600">PNG, JPG • Máximo 2MB</p>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Grid de campos principales -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Restaurante -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2 text-left">Restaurante</label>
                  <CustomSelect
                    v-model="formData.restaurante_id"
                    :options="formRestauranteOptions"
                    placeholder="Seleccionar restaurante"
                  />
                </div>

                <!-- Categoría -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2 text-left">Categoría</label>
                  <CustomSelect
                    v-model="formData.categoria_id"
                    :options="formCategoriaOptions"
                    placeholder="Seleccionar categoría"
                  />
                </div>

                <!-- Precio -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2 text-left">Precio (L)</label>
                  <input
                    v-model.number="formData.precio"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <!-- Nombre y Descripción en la misma fila -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Nombre -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2 text-left">Nombre del Menú</label>
                  <input
                    v-model="formData.nombre"
                    type="text"
                    required
                    placeholder="Ej: Pizza Margherita"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <!-- Descripción -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2 text-left">Descripción</label>
                  <textarea
                    v-model="formData.descripcion"
                    rows="2"
                    placeholder="Describe brevemente..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  ></textarea>
                </div>
              </div>

              <!-- Configuración -->
              <div class="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Tipo de Menú (Izquierda) -->
                  <div>
                    <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 text-left">Tipo</label>
                    <div class="flex flex-col gap-3">
                      <!-- Switch para Directo -->
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-700">Directo</span>
                        <button
                          type="button"
                          @click="formData.es_para_cocina = false"
                          :class="[
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
                            !formData.es_para_cocina
                              ? 'bg-orange-600'
                              : 'bg-gray-200'
                          ]"
                        >
                          <span
                            :class="[
                              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                              !formData.es_para_cocina ? 'translate-x-6' : 'translate-x-1'
                            ]"
                          />
                        </button>
                      </div>

                      <!-- Switch para Para Cocina -->
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-700">Para Cocina</span>
                        <button
                          type="button"
                          @click="formData.es_para_cocina = true"
                          :class="[
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
                            formData.es_para_cocina
                              ? 'bg-orange-600'
                              : 'bg-gray-200'
                          ]"
                        >
                          <span
                            :class="[
                              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                              formData.es_para_cocina ? 'translate-x-6' : 'translate-x-1'
                            ]"
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Impuesto y Estado Fiscal (Derecha) -->
                  <div class="space-y-4 md:border-l md:border-gray-200 md:pl-6">
                    <!-- Impuesto -->
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 text-left">Impuesto</label>
                      <div class="relative">
                        <input
                          v-model.number="formData.porcentaje_impuesto"
                          type="number"
                          step="0.01"
                          placeholder="15.00"
                          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <span class="absolute right-3 top-2 text-xs text-gray-500">%</span>
                      </div>
                    </div>

                    <!-- Estado Fiscal -->
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 text-left">Estado Fiscal</label>
                      <div class="flex flex-col gap-3">
                        <!-- Switch para Exento -->
                        <div class="flex items-center justify-between">
                          <span class="text-sm font-medium text-gray-700">Exento</span>
                          <button
                            type="button"
                            @click="() => { formData.es_exento = !formData.es_exento; if (formData.es_exento) formData.es_exonerado = false; }"
                            :class="[
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
                              formData.es_exento
                                ? 'bg-orange-600'
                                : 'bg-gray-200'
                            ]"
                          >
                            <span
                              :class="[
                                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                                formData.es_exento ? 'translate-x-6' : 'translate-x-1'
                              ]"
                            />
                          </button>
                        </div>

                        <!-- Switch para Exonerado -->
                        <div class="flex items-center justify-between">
                          <span class="text-sm font-medium text-gray-700">Exonerado</span>
                          <button
                            type="button"
                            @click="() => { formData.es_exonerado = !formData.es_exonerado; if (formData.es_exonerado) formData.es_exento = false; }"
                            :class="[
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
                              formData.es_exonerado
                                ? 'bg-orange-600'
                                : 'bg-gray-200'
                            ]"
                          >
                            <span
                              :class="[
                                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                                formData.es_exonerado ? 'translate-x-6' : 'translate-x-1'
                              ]"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Inventario -->
              <div class="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 class="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-4 text-left">Control de Inventario</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Requiere Inventario (Izquierda) -->
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-sm font-medium text-gray-700">Requiere Inventario</span>
                      <button
                        type="button"
                        @click="formData.requiere_inventario = !formData.requiere_inventario"
                        :class="[
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                          formData.requiere_inventario
                            ? 'bg-blue-600'
                            : 'bg-gray-200'
                        ]"
                      >
                        <span
                          :class="[
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                            formData.requiere_inventario ? 'translate-x-6' : 'translate-x-1'
                          ]"
                        />
                      </button>
                    </div>
                    <p class="text-xs text-gray-500">
                      Activar control de stock para este producto
                    </p>
                  </div>

                  <!-- Ingredientes (Derecha) -->
                  <div>
                    <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 text-left">Ingredientes</label>
                    <textarea
                      v-model="formData.ingredientes"
                      rows="3"
                      placeholder="Lista de ingredientes (separados por comas o JSON)"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    ></textarea>
                    <p class="text-xs text-gray-500 mt-1">
                      Opcional: lista de ingredientes o componentes
                    </p>
                  </div>
                </div>
              </div>

            </form>
          </div>

          <!-- Footer con botones -->
          <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="closeDialog"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
              <button
                type="submit"
                @click="saveMenu"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 shadow-lg"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ isEditing ? 'Guardar Cambios' : 'Crear Menú' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación de Eliminación -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
        <!-- Overlay con backdrop blur -->
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="showDeleteDialog = false"></div>

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
                  <h3 class="text-xl font-semibold tracking-tight text-gray-900">Eliminar Menú</h3>
                  <p class="text-xs font-medium text-gray-600">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button
                @click="showDeleteDialog = false"
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
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>

            <!-- Mensaje de confirmación -->
            <div class="text-center">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">¿Eliminar menú?</h3>
              <p class="text-gray-600 text-sm">
                Esta acción no se puede deshacer. El menú <strong>"{{ selectedMenu?.nombre }}"</strong> será eliminado permanentemente.
              </p>
            </div>
          </div>

          <!-- Footer con botones -->
          <div class="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div class="flex justify-end space-x-3">
              <button
                @click="showDeleteDialog = false"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-gray-600 hover:to-gray-700"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
              <button
                @click="deleteMenu"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-red-600 hover:to-red-700 shadow-lg"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar Menú
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-vue-next';
import type { Menu, CreateMenuDTO } from '@/interfaces/Menu';
import type { Restaurante } from '@/interfaces/Restaurante';
import MenuService from '@/services/menu_service';
import RestaurantesService from '@/services/restaurantes_service';
import UploadService from '@/services/upload_service';
import CategoriasService from '@/services/categorias_service';
import type { CategoriaMenu } from '@/services/categorias_service';
import { useToast } from 'vue-toastification';
import { usePagination } from '@/composables/usePagination';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '@/interfaces/Usuario';
import type { PaginatedResponse } from '@/services/usuarios_service';
import CustomSelect from '@/components/ui/CustomSelect.vue';
import { formatCurrencyHNL } from '@/utils/currency';
import { useAuthStore } from '@/stores/auth_store';

const toast = useToast();
const authStore = useAuthStore();

// Estado principal
const restaurantes = ref<Restaurante[]>([]);
const categorias = ref<CategoriaMenu[]>([]);
const selectedRestauranteId = ref('');
const showDialog = ref(false);
const showDeleteDialog = ref(false);
const showViewDialog = ref(false);
const isEditing = ref(false);
const selectedMenu = ref<Menu | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Búsqueda y límite
const searchTerm = ref('');
const selectedLimit = ref(10);
const selectedEstado = ref('');


// Computed para obtener restaurante principal
const restauranteId = computed(() => {
  return authStore.userInfo?.restaurante_id || '';
});

// Computed para opciones de filtros
const restauranteOptions = computed<Array<{ label: string; value: string; badge?: string }>>(() => {
  const options: Array<{ label: string; value: string; badge?: string }> = [
    { label: 'Todos los restaurantes', value: '' }
  ];
  
  restaurantes.value.forEach((r) => {
    const isPrincipal = r.id === restauranteId.value;
    options.push({
      label: r.nombre_restaurante,
      value: r.id || '',
      badge: isPrincipal ? 'Principal' : undefined
    });
  });
  
  return options;
});

// Computed para opciones del formulario
const formRestauranteOptions = computed<Array<{ label: string; value: string; badge?: string }>>(() => {
  const options: Array<{ label: string; value: string; badge?: string }> = [
    { label: 'Seleccionar restaurante', value: '' }
  ];
  
  restaurantes.value.forEach((r) => {
    const isPrincipal = r.id === restauranteId.value;
    options.push({
      label: r.nombre_restaurante,
      value: r.id || '',
      badge: isPrincipal ? 'Principal' : undefined
    });
  });
  
  return options;
});

const formCategoriaOptions = computed(() => [
  { label: 'Sin categoría', value: '' },
  ...categorias.value.map((c) => ({
    label: c.nombre,
    value: c.id || '',
  })),
]);

const estadoOptions = computed(() => [
  { label: 'Todos los estados', value: '' },
  { label: 'Activo', value: 'true' },
  { label: 'Inactivo', value: 'false' },
]);

const limitOptions = computed(() => [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
]);


// Función para obtener menús paginados
const fetchPaginatedMenus = async (params: {
  page: number;
  limit: number;
}): Promise<AxiosResponse<ApiResponse<PaginatedResponse<Menu>>>> => {
  try {
    let response: AxiosResponse;

    // Si hay un restaurante seleccionado, filtrar por él
    if (selectedRestauranteId.value) {
      response = await MenuService.getByRestauranteId(selectedRestauranteId.value);

      // Simulamos la estructura de paginación ya que getByRestauranteId no soporta paginación
      response = {
        ...response,
        data: {
          success: true,
          data: {
            items: response.data.data,
            total: response.data.data.length,
            totalPages: 1,
            page: params.page,
            limit: params.limit,
          },
        },
      };
    } else {
      // Si no hay filtro, obtenemos todos y simulamos paginación
      response = await MenuService.getAll();

      // Simular paginación básica para mantener compatibilidad con usePagination
      const allItems = response.data.data;
      const start = (params.page - 1) * params.limit;
      const end = start + params.limit;
      const paginatedItems = allItems.slice(start, end);

      response = {
        ...response,
        data: {
          success: true,
          data: {
            items: paginatedItems,
            total: allItems.length,
            totalPages: Math.ceil(allItems.length / params.limit),
            page: params.page,
            limit: params.limit,
          },
        },
      };
    }

    return response;
  } catch (error) {
    console.error(error);
    toast.error('Error al cargar los menús');
    throw error;
  }
};

// Estado de paginación
const {
  items: menus,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  isLoading: loading,
  hasPreviousPage,
  hasNextPage,
  goToFirstPage,
  goToPreviousPage,
  goToNextPage,
  goToLastPage,
  goToPage,
  changeItemsPerPage,
  refresh: loadMenus,
} = usePagination<Menu>(fetchPaginatedMenus);

// Formulario
const formData = ref<CreateMenuDTO>({
  restaurante_id: '',
  categoria_id: '',
  nombre: '',
  descripcion: '',
  precio: 0,
  porcentaje_impuesto: 0,
  es_para_cocina: true,
  activo: true,
  es_exento: false,
  es_exonerado: false,
  requiere_inventario: false,
  ingredientes: '',
});

// Cargar datos iniciales
onMounted(async () => {
  await loadRestaurantes();
  await loadCategorias();
  // loadMenus se ejecutará automáticamente desde usePagination
});

// Función para cambiar el límite
const onLimitChange = () => {
  changeItemsPerPage(selectedLimit.value);
};

// Cargar restaurantes
const loadRestaurantes = async () => {
  try {
    const response = await RestaurantesService.getAll();
    restaurantes.value = response.data.data as Restaurante[];
  } catch (error) {
    console.error(error);
    toast.error('Error al cargar los restaurantes');
  }
};

// Cargar categorías
const loadCategorias = async () => {
  try {
    const response = await CategoriasService.getAll();
    categorias.value = response.data.data || [];
  } catch (error) {
    console.error(error);
    toast.error('Error al cargar las categorías');
  }
};

// Abrir diálogo de creación
const openCreateDialog = () => {
  isEditing.value = false;
  formData.value = {
    restaurante_id: selectedRestauranteId.value || '',
    categoria_id: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    porcentaje_impuesto: 0,
    es_para_cocina: true,
    activo: true,
    es_exento: false,
    es_exonerado: false,
    requiere_inventario: false,
    ingredientes: '',
  };
  showDialog.value = true;
};

// Ver menú
const viewMenu = (menu: Menu) => {
  selectedMenu.value = menu;
  showViewDialog.value = true;
};
const closeViewDialog = () => {
  showViewDialog.value = false;
  selectedMenu.value = null;
};

// Editar menú
const editMenu = (menu: Menu) => {
  isEditing.value = true;
  selectedMenu.value = menu;
  formData.value = { ...menu };
  showDialog.value = true;
};

// Cerrar diálogo
const closeDialog = () => {
  showDialog.value = false;
  selectedMenu.value = null;
};

// Manejar subida de imagen
const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files?.length) return;

  const file = target.files[0];

  // Validar tipo de archivo
  if (!UploadService.isValidFileType(file, ['image/jpeg', 'image/png', 'image/webp'])) {
    toast.error('Solo se permiten imágenes en formato JPG, PNG o WEBP');
    return;
  }

  // Validar tamaño (máximo 5MB)
  if (!UploadService.isValidFileSize(file, 5)) {
    toast.error('La imagen no debe superar los 5MB');
    return;
  }

  try {
    const response = await UploadService.uploadFile(file, 'menu');
    if (response.success && response.data?.publicUrl) {
      formData.value.imagen = response.data.publicUrl;
      toast.success('Imagen subida correctamente');
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error(error);
    toast.error('Error al subir la imagen');
  }
};

// Guardar menú
const saveMenu = async () => {
  try {
    if (isEditing.value && selectedMenu.value) {
      await MenuService.update(selectedMenu.value.id, formData.value);
      toast.success('Menú actualizado correctamente');
    } else {
      await MenuService.create(formData.value);
      toast.success('Menú creado correctamente');
    }
    closeDialog();
    await loadMenus();
  } catch (error) {
    console.error(error);
    toast.error('Error al guardar el menú');
  }
};

// Confirmar eliminación
const confirmDelete = (menu: Menu) => {
  selectedMenu.value = menu;
  showDeleteDialog.value = true;
};

// Eliminar menú
const deleteMenu = async () => {
  if (!selectedMenu.value) return;

  try {
    await MenuService.delete(selectedMenu.value.id);
    toast.success('Menú eliminado correctamente');
    await loadMenus();
    showDeleteDialog.value = false;
  } catch (error) {
    console.error(error);
    toast.error('Error al eliminar el menú');
  }
};

const handleFileInputClick = () => {
  fileInput.value?.click();
};

// Eliminar imagen actual
const removeImage = () => {
  formData.value.imagen = '';
  // Resetear el input file para permitir seleccionar la misma imagen nuevamente si es necesario
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  toast.success('Imagen eliminada');
};

// Función para generar números de página con elipsis
const getPageNumbers = (): (number | string)[] => {
  if (totalPages.value <= 0) return [];
  
  const page = currentPage.value;
  const pages = totalPages.value;
  const pageNumbers: (number | string)[] = [];
  
  if (pages <= 7) {
    // Si hay 7 o menos páginas, mostrar todas
    for (let i = 1; i <= pages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Si hay más de 7 páginas, mostrar con elipsis
    if (page <= 3) {
      // Al inicio: 1 2 3 4 ... última
      for (let i = 1; i <= 4; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(pages);
    } else if (page >= pages - 2) {
      // Al final: 1 ... (últimas 4)
      pageNumbers.push(1);
      pageNumbers.push('...');
      for (let i = pages - 3; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // En el medio: 1 ... (actual-1) (actual) (actual+1) ... última
      pageNumbers.push(1);
      pageNumbers.push('...');
      for (let i = page - 1; i <= page + 1; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(pages);
    }
  }
  
  return pageNumbers;
};


</script>
