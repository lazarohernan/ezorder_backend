<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Clientes</h1>
          <p class="text-sm font-medium text-gray-600">Administra todos los clientes del sistema</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="openCreateDialog"
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
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="relative z-40 rounded-3xl border border-orange-100 bg-white/80 p-6 backdrop-blur">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Filtrar por Restaurante</label>
          <CustomSelect
            v-model="selectedRestauranteId"
            :options="restauranteOptions"
            placeholder="Todos los restaurantes"
            @update:modelValue="loadClientes"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Buscar clientes</label>
          <div class="relative">
            <input
              type="text"
              v-model="searchTerm"
              placeholder="Buscar clientes..."
              class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
          <label class="block text-sm font-semibold text-gray-700">Mostrar</label>
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

    <!-- Mensaje si no hay clientes -->
    <div v-else-if="clientes.length === 0" class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-12 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-16 w-16 mx-auto text-orange-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <h2 class="mt-4 text-xl font-medium text-gray-700">No hay clientes registrados</h2>
      <p class="mt-2 text-gray-500">Comienza a agregar clientes para tu restaurante.</p>
      <button
        @click="openCreateDialog"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
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
        <span>Agregar mi primer cliente</span>
      </button>
    </div>

    <!-- Orders Table -->
    <div v-else class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50/90">
            <tr>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Nombre
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                RTN
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Teléfono
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle hidden md:table-cell"
              >
                Correo
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle hidden sm:table-cell"
              >
                Restaurante
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="cliente in clientes" :key="cliente.id" class="transition hover:bg-orange-50/60">
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500 align-middle">
                <div class="text-sm font-semibold text-gray-900">{{ cliente.nombre_cliente }}</div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle">
                {{ cliente.rtn_cliente || 'N/A' }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle">
                {{ cliente.tel_cliente || 'N/A' }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle hidden md:table-cell">
                {{ cliente.correo_cliente || 'N/A' }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700 align-middle hidden sm:table-cell">
                <div class="font-semibold text-gray-800">
                  {{ cliente.restaurantes?.nombre_restaurante || 'N/A' }}
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-sm font-medium align-middle">
                <div class="flex space-x-2">
                  <button
                    @click="viewCliente(cliente)"
                    class="text-gray-600 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 rounded-full p-1 transition-colors duration-200"
                    title="Ver"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
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
                    @click="editCliente(cliente)"
                    class="text-orange-600 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 rounded-full p-1 transition-colors duration-200"
                    title="Editar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="confirmDelete(cliente)"
                    class="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 rounded-full p-1 transition-colors duration-200"
                    title="Eliminar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
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

      <!-- Paginación -->
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
              Mostrando <span class="font-medium">{{ clientes.length }}</span> de
              <span class="font-medium">{{ totalItems }}</span> clientes
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

    <!-- Modal de Ver Detalles del Cliente -->
    <div v-if="showViewDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <div class="fixed inset-0 transition-opacity" @click="closeViewDialog">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[60]"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Detalles del Cliente
                </h3>
                <div class="space-y-4">
                  <div>
                    <strong>Nombre:</strong>
                    <p class="text-gray-700">{{ selectedCliente?.nombre_cliente }}</p>
                  </div>
                  <div>
                    <strong>RTN:</strong>
                    <p class="text-gray-700">{{ selectedCliente?.rtn_cliente || 'N/A' }}</p>
                  </div>
                  <div>
                    <strong>Teléfono:</strong>
                    <p class="text-gray-700">{{ selectedCliente?.tel_cliente || 'N/A' }}</p>
                  </div>
                  <div>
                    <strong>Correo:</strong>
                    <p class="text-gray-700">{{ selectedCliente?.correo_cliente || 'N/A' }}</p>
                  </div>
                  <div>
                    <strong>Restaurante:</strong>
                    <p class="text-gray-700">
                      {{ selectedCliente?.restaurantes?.nombre_restaurante }}
                    </p>
                  </div>
                </div>
                <div class="flex justify-end mt-6">
                  <button
                    @click="closeViewDialog"
                    class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Diálogo de Crear/Editar -->
    <div v-if="showDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Overlay de fondo -->
        <div class="fixed inset-0 transition-opacity" @click="closeDialog">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <!-- Modal -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[60]"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {{ isEditing ? 'Editar Cliente' : 'Nuevo Cliente' }}
                </h3>
                <form @submit.prevent="saveCliente" class="space-y-4">
                  <!-- Restaurante -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Restaurante</label>
                    <CustomSelect
                      v-model="formData.restaurante_id"
                      :options="formRestauranteOptions"
                      placeholder="Seleccionar restaurante"
                    />
                  </div>
                  <!-- Nombre -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <input
                      v-model="formData.nombre_cliente"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <!-- RTN -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">RTN</label>
                    <input
                      v-model="formData.rtn_cliente"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <!-- Teléfono -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <input
                      v-model="formData.tel_cliente"
                      type="tel"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <!-- Correo -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Correo</label>
                    <input
                      v-model="formData.correo_cliente"
                      type="email"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <!-- Botones -->
                  <div class="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      @click="closeDialog"
                      class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      class="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md text-sm hover:from-orange-600 hover:to-orange-700"
                    >
                      {{ isEditing ? 'Guardar' : 'Crear' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Diálogo de Confirmación de Eliminación -->
    <div v-if="showDeleteDialog" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity" @click="showDeleteDialog = false">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <!-- Modal de confirmación -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[60]"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
              >
                <svg
                  class="h-6 w-6 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
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
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Confirmar Eliminación
                </h3>
                <p class="text-sm text-gray-500 mb-4">
                  ¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede
                  deshacer.
                </p>
                <div class="flex justify-end space-x-3">
                  <button
                    @click="showDeleteDialog = false"
                    class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    @click="deleteCliente"
                    class="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Cliente, CreateClienteDTO } from '@/interfaces/Cliente';
import type { Restaurante } from '@/interfaces/Restaurante';
import ClientesService from '@/services/clientes_service';
import RestaurantesService from '@/services/restaurantes_service';
import { useToast } from 'vue-toastification';
import { usePagination } from '@/composables/usePagination';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '@/interfaces/Usuario';
import type { PaginatedResponse } from '@/services/usuarios_service';
import CustomSelect from '@/components/ui/CustomSelect.vue';

const toast = useToast();

// Estado principal
const restaurantes = ref<Restaurante[]>([]);
const selectedRestauranteId = ref('');
const showDialog = ref(false);
const showDeleteDialog = ref(false);
const showViewDialog = ref(false);
const isEditing = ref(false);
const selectedCliente = ref<Cliente | null>(null);

// Búsqueda y límite
const searchTerm = ref('');
const selectedLimit = ref(10);

// Función para obtener clientes paginados
const fetchPaginatedClientes = async (params: {
  page: number;
  limit: number;
}): Promise<AxiosResponse<ApiResponse<PaginatedResponse<Cliente>>>> => {
  try {
    // Si hay un restaurante seleccionado, filtrar por él
    if (selectedRestauranteId.value) {
      const response = await ClientesService.getByRestauranteId(selectedRestauranteId.value);

      // Simulamos la estructura de paginación ya que getByRestauranteId no soporta paginación
      return {
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
      const response = await ClientesService.getAll();

      // Simular paginación básica para mantener compatibilidad con usePagination
      const allItems = response.data.data;
      const start = (params.page - 1) * params.limit;
      const end = start + params.limit;
      const paginatedItems = allItems.slice(start, end);

      return {
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
  } catch (error) {
    console.error(error);
    toast.error('Error al cargar los clientes');
    throw error;
  }
};

// Estado de paginación
const {
  items: clientes,
  currentPage,
  totalPages,
  totalItems,
  isLoading: loading,
  hasPreviousPage,
  hasNextPage,
  goToFirstPage,
  goToPreviousPage,
  goToNextPage,
  goToLastPage,
  changeItemsPerPage,
  refresh: loadClientes,
} = usePagination<Cliente>(fetchPaginatedClientes);

// Formulario
const formData = ref<CreateClienteDTO>({
  restaurante_id: '',
  nombre_cliente: '',
  rtn_cliente: null,
  tel_cliente: null,
  correo_cliente: null,
});

// Cargar datos iniciales
onMounted(async () => {
  await loadRestaurantes();
  // loadClientes se ejecutará automáticamente desde usePagination
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

// Abrir diálogo de creación
const openCreateDialog = () => {
  isEditing.value = false;
  formData.value = {
    restaurante_id: selectedRestauranteId.value || '',
    nombre_cliente: '',
    rtn_cliente: null,
    tel_cliente: null,
    correo_cliente: null,
  };
  showDialog.value = true;
};

// Ver cliente
const viewCliente = (cliente: Cliente) => {
  selectedCliente.value = cliente;
  showViewDialog.value = true;
};
const closeViewDialog = () => {
  showViewDialog.value = false;
  selectedCliente.value = null;
};

// Editar cliente
const editCliente = (cliente: Cliente) => {
  isEditing.value = true;
  selectedCliente.value = cliente;
  formData.value = { ...cliente };
  showDialog.value = true;
};

// Cerrar diálogo
const closeDialog = () => {
  showDialog.value = false;
  selectedCliente.value = null;
};

// Guardar cliente
const saveCliente = async () => {
  try {
    if (isEditing.value && selectedCliente.value) {
      await ClientesService.update(selectedCliente.value.id, formData.value);
      toast.success('Cliente actualizado correctamente');
    } else {
      await ClientesService.create(formData.value);
      toast.success('Cliente creado correctamente');
    }
    closeDialog();
    await loadClientes();
  } catch (error) {
    console.error(error);
    toast.error('Error al guardar el cliente');
  }
};

// Confirmar eliminación
const confirmDelete = (cliente: Cliente) => {
  selectedCliente.value = cliente;
  showDeleteDialog.value = true;
};

// Eliminar cliente
const deleteCliente = async () => {
  if (!selectedCliente.value) return;

  try {
    await ClientesService.delete(selectedCliente.value.id);
    toast.success('Cliente eliminado correctamente');
    await loadClientes();
    showDeleteDialog.value = false;
  } catch (error) {
    console.error(error);
    toast.error('Error al eliminar el cliente');
  }
};

// Computed properties para opciones de CustomSelect
const restauranteOptions = computed(() => [
  { label: 'Todos los restaurantes', value: '' },
  ...restaurantes.value.map((r) => ({
    label: r.nombre_restaurante,
    value: r.id || '',
  })),
]);

const formRestauranteOptions = computed(() =>
  restaurantes.value.map((r) => ({
    label: r.nombre_restaurante,
    value: r.id || '',
  })),
);

const limitOptions = computed(() => [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
]);
</script>

<style scoped></style>
