<template>
  <div class="min-h-screen bg-white p-4 md:p-8 space-y-8">
    <!-- Header -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 md:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Gestión de Inventario</h1>
          <p class="text-sm font-medium text-gray-600">Control de stock y movimientos de productos</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="mostrarModalEntrada = true"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus class="h-5 w-5" />
            <span>Entrada de Stock</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="relative z-40 rounded-3xl border border-orange-100 bg-white/80 p-6 backdrop-blur">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Buscar producto</label>
          <input
            v-model="filtroBusqueda"
            type="text"
            placeholder="Nombre del producto..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Estado de stock</label>
          <CustomSelect
            v-model="filtroEstado"
            :options="estadoStockOptions"
            placeholder="Todos"
            class="w-full"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Requiere inventario</label>
          <CustomSelect
            v-model="filtroInventario"
            :options="requiereInventarioOptions"
            placeholder="Todos"
            class="w-full"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="aplicarFiltros"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-transparent px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-400 w-full"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>

    <!-- Alertas de stock bajo -->
    <div v-if="alertasStock.length > 0">
      <div class="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-red-50 p-6">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div>
            <h3 class="text-red-800 font-bold text-lg">Alertas de Stock</h3>
            <p class="text-red-600 text-sm font-medium mt-1">
              {{ alertasStock.length }} producto(s) con stock bajo o agotado
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de inventario -->
    <div class="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 backdrop-blur">
      <div class="overflow-x-auto">
        <!-- Estado vacío -->
        <div v-if="!cargando && inventarioFiltrado.length === 0" class="px-6 py-16">
          <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-16 text-center">
            <div class="flex flex-col items-center gap-3">
              <Package class="h-10 w-10 text-gray-300" stroke-width="1.5" />
              <h3 class="text-sm font-semibold text-gray-700">No hay productos en inventario</h3>
              <p class="text-xs text-gray-500 max-w-sm">
                Cuando agregues productos con control de inventario, aparecerán listados aquí.
              </p>
            </div>
          </div>
        </div>

        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50/90">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Producto
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Stock Actual
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Stock Mínimo
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Estado
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Costo Unitario
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Última Actualización
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 align-middle">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="item in inventarioFiltrado" :key="item.id" class="transition hover:bg-orange-50/60">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <img
                      v-if="item.menu.imagen"
                      :src="item.menu.imagen"
                      :alt="item.menu.nombre"
                      class="h-10 w-10 rounded-lg object-cover"
                    />
                    <div v-else class="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                      <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ item.menu.nombre }}</div>
                    <div class="text-sm text-gray-500">{{ item.unidad_medida }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">{{ item.stock_actual }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-500">{{ item.stock_minimo }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    getEstadoStock(item).clase
                  ]"
                >
                  {{ getEstadoStock(item).texto }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">L. {{ item.costo_unitario.toFixed(2) }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatearFecha(item.updated_at) }}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium align-middle">
                <div class="flex justify-end gap-2">
                  <button
                    @click="entradaRapida(item)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white transition hover:from-orange-600 hover:to-orange-700 shadow-sm"
                    title="Entrada Rápida"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    @click="editarInventario(item)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Editar Configuración"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="verMovimientos(item)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-600"
                    title="Ver Movimientos"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="totalPaginas > 1" class="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="paginaAnterior"
            :disabled="paginaActual === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            @click="paginaSiguiente"
            :disabled="paginaActual === totalPaginas"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Mostrando
              <span class="font-medium">{{ (paginaActual - 1) * itemsPorPagina + 1 }}</span>
              a
              <span class="font-medium">{{ Math.min(paginaActual * itemsPorPagina, inventarioFiltrado.length) }}</span>
              de
              <span class="font-medium">{{ inventarioFiltrado.length }}</span>
              resultados
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                v-for="pagina in paginasVisibles"
                :key="pagina"
                @click="irAPagina(pagina)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                  pagina === paginaActual
                    ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                ]"
              >
                {{ pagina }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Entrada de Stock -->
    <Modal
      v-model:show="mostrarModalEntrada"
      title="Entrada de Stock"
      size="md"
      @close="cerrarModalEntrada"
    >
      <form @submit.prevent="procesarEntradaStock" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Producto</label>
          <CustomSelect
            v-model="nuevaEntrada.inventario_id"
            :options="productosOptions"
            placeholder="Seleccionar producto"
            class="w-full"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
          <input
            v-model.number="nuevaEntrada.cantidad"
            type="number"
            min="1"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
            placeholder="Ingrese la cantidad"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
          <input
            v-model="nuevaEntrada.motivo"
            type="text"
            placeholder="Ej: Compra de proveedor, reposición de stock"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="cerrarModalEntrada"
            class="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            @click="procesarEntradaStock"
            class="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all duration-200 hover:-translate-y-0.5"
          >
            Registrar Entrada
          </button>
        </div>
      </template>
    </Modal>

    <!-- Modal de Entrada Rápida -->
    <Modal
      v-model:show="mostrarModalEntradaRapida"
      title="Entrada Rápida de Stock"
      size="sm"
      @close="cerrarModalEntradaRapida"
    >
      <form @submit.prevent="procesarEntradaRapida" class="space-y-4">
        <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div class="flex items-center gap-3">
            <div v-if="itemSeleccionado?.menu.imagen" class="flex-shrink-0">
              <img
                :src="itemSeleccionado.menu.imagen"
                :alt="itemSeleccionado.menu.nombre"
                class="h-12 w-12 rounded-lg object-cover"
              />
            </div>
            <div v-else class="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ itemSeleccionado?.menu.nombre }}</p>
              <p class="text-xs text-gray-600">Stock actual: <span class="font-bold">{{ itemSeleccionado?.stock_actual }}</span></p>
            </div>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Cantidad a agregar</label>
          <input
            v-model.number="entradaRapidaData.cantidad"
            type="number"
            min="1"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
            placeholder="Ej: 50"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
          <input
            v-model="entradaRapidaData.motivo"
            type="text"
            placeholder="Ej: Compra de proveedor"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="cerrarModalEntradaRapida"
            class="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            @click="procesarEntradaRapida"
            class="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:-translate-y-0.5"
          >
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Registrar Entrada
            </span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Modal de Edición de Inventario -->
    <Modal
      v-model:show="mostrarModalEdicion"
      title="Editar Configuración de Inventario"
      size="md"
      @close="cerrarModalEdicion"
    >
      <form @submit.prevent="procesarEdicion" class="space-y-4">
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div class="flex items-center gap-3">
            <div v-if="itemEdicion?.menu.imagen" class="flex-shrink-0">
              <img
                :src="itemEdicion.menu.imagen"
                :alt="itemEdicion.menu.nombre"
                class="h-12 w-12 rounded-lg object-cover"
              />
            </div>
            <div v-else class="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ itemEdicion?.menu.nombre }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Stock Mínimo</label>
            <input
              v-model.number="edicionData.stock_minimo"
              type="number"
              min="0"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
              placeholder="0"
            />
            <p class="text-xs text-gray-500 mt-1">Punto de alerta de stock bajo</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Stock Máximo</label>
            <input
              v-model.number="edicionData.stock_maximo"
              type="number"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Costo Unitario</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-gray-500 text-sm font-medium">LP.</span>
              </div>
              <input
                v-model.number="edicionData.costo_unitario"
                type="number"
                step="0.01"
                min="0"
                required
                class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-colors duration-200"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Unidad de Medida</label>
            <div class="relative">
              <div 
                class="flex gap-2 overflow-x-auto scroll-smooth pb-2"
                style="scrollbar-width: none; -ms-overflow-style: none;"
              >
                <button
                  v-for="unidad in unidadesMedida"
                  :key="unidad"
                  type="button"
                  @click="edicionData.unidad_medida = unidad"
                  :class="[
                    'px-3 py-1.5 text-sm font-medium transition-colors duration-200 rounded-md whitespace-nowrap flex-shrink-0',
                    edicionData.unidad_medida === unidad
                      ? 'bg-orange-500 text-white border border-orange-500'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  ]"
                >
                  {{ unidad }}
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Selecciona una unidad de medida</p>
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="cerrarModalEdicion"
            class="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            @click="procesarEdicion"
            class="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:-translate-y-0.5"
          >
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Guardar Cambios
            </span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Modal de Movimientos de Inventario -->
    <Teleport to="body">
      <div v-if="mostrarModalMovimientos" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 text-center">
          <!-- Overlay con backdrop blur -->
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="cerrarModalMovimientos"></div>

          <!-- Modal Container -->
          <div class="relative inline-block w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl transform transition-all z-[60]">
            <!-- Header minimalista -->
            <div class="px-6 py-4 border-b border-gray-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div v-if="itemSeleccionado?.menu.imagen" class="flex-shrink-0">
                    <img
                      :src="itemSeleccionado.menu.imagen"
                      :alt="itemSeleccionado.menu.nombre"
                      class="h-10 w-10 rounded-lg object-cover"
                    />
                  </div>
                  <div v-else class="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Package class="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Movimientos de Inventario</h3>
                    <p class="text-sm text-gray-500">{{ itemSeleccionado?.menu.nombre }}</p>
                  </div>
                </div>
                <button
                  @click="cerrarModalMovimientos"
                  class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200"
                >
                  <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="px-6 py-6 max-h-[600px] overflow-y-auto">
              <!-- Estado de carga -->
              <div v-if="cargandoMovimientos" class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>

              <!-- Estado vacío -->
              <div v-else-if="movimientos.length === 0" class="py-12">
                <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-12 text-center">
                  <div class="flex flex-col items-center gap-3">
                    <svg class="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 class="text-sm font-semibold text-gray-700">No hay movimientos registrados</h3>
                    <p class="text-xs text-gray-500 max-w-sm">
                      Los movimientos de inventario aparecerán aquí cuando se registren entradas o salidas.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Lista de movimientos -->
              <div v-else class="space-y-3">
                <div
                  v-for="movimiento in movimientos"
                  :key="movimiento.id"
                  class="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-200"
                >
                  <!-- Icono de tipo de movimiento -->
                  <div :class="[
                    'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                    movimiento.tipo_movimiento === 'entrada' ? 'bg-green-100' :
                    movimiento.tipo_movimiento === 'salida' ? 'bg-red-100' :
                    'bg-orange-100'
                  ]">
                    <svg
                      v-if="movimiento.tipo_movimiento === 'entrada'"
                      class="h-5 w-5 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <svg
                      v-else-if="movimiento.tipo_movimiento === 'salida'"
                      class="h-5 w-5 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
                    </svg>
                    <svg
                      v-else
                      class="h-5 w-5 text-orange-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>

                  <!-- Información del movimiento -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span :class="[
                        'inline-flex px-2 py-0.5 text-xs font-semibold rounded-md',
                        getTipoMovimientoColor(movimiento.tipo_movimiento)
                      ]">
                        {{ formatearTipoMovimiento(movimiento.tipo_movimiento) }}
                      </span>
                      <span class="text-sm font-semibold text-gray-900">
                        {{ movimiento.cantidad }} {{ itemSeleccionado?.unidad_medida || 'unidades' }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-700 mb-1">{{ movimiento.motivo }}</p>
                    <div class="flex items-center gap-4 text-xs text-gray-500">
                      <span>{{ formatearFecha(movimiento.created_at) }}</span>
                      <span v-if="movimiento.usuario?.nombre_usuario">
                        • {{ movimiento.usuario.nombre_usuario }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div v-if="totalPaginasMovimientos > 1" class="px-6 py-4 border-t border-gray-100">
              <div class="flex items-center justify-between">
                <p class="text-sm text-gray-600">
                  Mostrando {{ movimientos.length }} de {{ totalMovimientos }} movimientos
                </p>
                <div class="flex items-center gap-2">
                  <button
                    @click="paginaMovimientos > 1 && (paginaMovimientos--, cargarMovimientos(itemSeleccionado!.id))"
                    :disabled="paginaMovimientos === 1"
                    class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <span class="text-sm text-gray-600">
                    Página {{ paginaMovimientos }} de {{ totalPaginasMovimientos }}
                  </span>
                  <button
                    @click="paginaMovimientos < totalPaginasMovimientos && (paginaMovimientos++, cargarMovimientos(itemSeleccionado!.id))"
                    :disabled="paginaMovimientos >= totalPaginasMovimientos"
                    class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { inventarioService } from '@/services/inventario_service';
import { Modal } from '@/components/ui';
import CustomSelect from '@/components/ui/CustomSelect.vue';
import { Plus, Package } from 'lucide-vue-next';

// Interfaces
interface Menu {
  id: string;
  nombre: string;
  imagen?: string;
  requiere_inventario: boolean;
}

interface InventarioItem {
  id: string;
  menu_id: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo?: number;
  unidad_medida: string;
  costo_unitario: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  menu: Menu;
}

interface MovimientoInventario {
  id: string;
  inventario_id: string;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string;
  referencia?: string;
  usuario_id?: string;
  created_at: string;
  inventario?: {
    id: string;
    menu: {
      id: string;
      nombre: string;
    };
  };
  usuario?: {
    id: string;
    nombre_usuario: string;
  };
}

interface AlertaStock {
  id: string;
  inventario_id: string;
  tipo_alerta: 'stock_bajo' | 'stock_agotado' | 'stock_critico';
  mensaje: string;
  leida: boolean;
  created_at: string;
}

// Estado reactivo
const inventario = ref<InventarioItem[]>([]);
const alertasStock = ref<AlertaStock[]>([]);
const cargando = ref(false);

// Filtros
const filtroBusqueda = ref('');
const filtroEstado = ref('');
const filtroInventario = ref('');

// Paginación
const paginaActual = ref(1);
const itemsPorPagina = 10;

// Modales
const mostrarModalEntrada = ref(false);
const mostrarModalEntradaRapida = ref(false);
const mostrarModalEdicion = ref(false);
const mostrarModalMovimientos = ref(false);

// Items seleccionados
const itemSeleccionado = ref<InventarioItem | null>(null);
const itemEdicion = ref<InventarioItem | null>(null);
const movimientos = ref<MovimientoInventario[]>([]);
const cargandoMovimientos = ref(false);
const paginaMovimientos = ref(1);
const totalPaginasMovimientos = ref(0);
const totalMovimientos = ref(0);


// Formularios
const nuevaEntrada = ref({
  inventario_id: '',
  cantidad: 1,
  motivo: ''
});

const entradaRapidaData = ref({
  cantidad: 1,
  motivo: ''
});

const edicionData = ref({
  stock_minimo: 0,
  stock_maximo: undefined as number | undefined,
  costo_unitario: 0,
  unidad_medida: ''
});

// Unidades de medida comunes en Honduras
const unidadesMedida = [
  'kg',
  'lb',
  'litro',
  'galón',
  'unidad',
  'docena',
  'caja',
  'bolsa',
  'onza',
  'g',
  'ml',
  'paquete',
  'bote',
  'botella'
];

// Computed
const inventarioFiltrado = computed(() => {
  let items = inventario.value;

  // Filtro por búsqueda
  if (filtroBusqueda.value) {
    items = items.filter(item =>
      item.menu.nombre.toLowerCase().includes(filtroBusqueda.value.toLowerCase())
    );
  }

  // Filtro por estado de stock
  if (filtroEstado.value) {
    items = items.filter(item => {
      const estado = getEstadoStock(item).tipo;
      return estado === filtroEstado.value;
    });
  }

  // Filtro por requiere inventario
  if (filtroInventario.value) {
    const requiere = filtroInventario.value === 'true';
    items = items.filter(item => item.menu.requiere_inventario === requiere);
  }

  return items;
});

const totalPaginas = computed(() => {
  return Math.ceil(inventarioFiltrado.value.length / itemsPorPagina);
});

const paginasVisibles = computed(() => {
  const total = totalPaginas.value;
  const actual = paginaActual.value;
  const paginas = [];

  for (let i = Math.max(1, actual - 2); i <= Math.min(total, actual + 2); i++) {
    paginas.push(i);
  }

  return paginas;
});

// Opciones para filtros
const estadoStockOptions = computed(() => [
  { value: '', label: 'Todos' },
  { value: 'normal', label: 'Stock Normal' },
  { value: 'bajo', label: 'Stock Bajo' },
  { value: 'agotado', label: 'Agotado' }
]);

const requiereInventarioOptions = computed(() => [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' }
]);

const productosOptions = computed(() => [
  { value: '', label: 'Seleccionar producto' },
  ...inventario.value.map(item => ({
    value: item.id,
    label: item.menu.nombre
  }))
]);

// Función para cargar solo las alertas
const cargarAlertas = async () => {
  try {
    const alertasResponse = await inventarioService.obtenerAlertas({
      leida: false
    });

    if (alertasResponse.ok) {
      alertasStock.value = alertasResponse.data;
    }
  } catch (error) {
    console.error('Error al cargar alertas:', error);
  }
};

// Métodos
const cargarInventario = async () => {
  cargando.value = true;
  try {
    // Llamada real al API
    console.log('📦 Cargando inventario...', {
      pagina: paginaActual.value,
      limite: itemsPorPagina
    });
    const response = await inventarioService.obtenerInventario({
      pagina: paginaActual.value,
      limite: itemsPorPagina
    });

    console.log('📦 Respuesta del inventario:', response);

    if (response.ok) {
      inventario.value = response.data;
      console.log('✅ Inventario cargado:', inventario.value.length, 'items');
    } else {
      console.error('❌ Error al cargar inventario:', response.message);
    }

    // Cargar alertas
    await cargarAlertas();
  } catch (error) {
    console.error('❌ Error al cargar inventario:', error);
  } finally {
    cargando.value = false;
  }
};

const getEstadoStock = (item: InventarioItem) => {
  if (item.stock_actual <= 0) {
    return { tipo: 'agotado', texto: 'Agotado', clase: 'bg-red-100 text-red-800' };
  } else if (item.stock_actual <= item.stock_minimo) {
    return { tipo: 'bajo', texto: 'Stock Bajo', clase: 'bg-yellow-100 text-yellow-800' };
  } else {
    return { tipo: 'normal', texto: 'Normal', clase: 'bg-green-100 text-green-800' };
  }
};

const formatearFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const aplicarFiltros = () => {
  paginaActual.value = 1;
};

const paginaAnterior = () => {
  if (paginaActual.value > 1) {
    paginaActual.value--;
  }
};

const paginaSiguiente = () => {
  if (paginaActual.value < totalPaginas.value) {
    paginaActual.value++;
  }
};

const irAPagina = (pagina: number) => {
  paginaActual.value = pagina;
};

const editarInventario = (item: InventarioItem) => {
  itemEdicion.value = item;
  edicionData.value = {
    stock_minimo: item.stock_minimo,
    stock_maximo: item.stock_maximo,
    costo_unitario: item.costo_unitario,
    unidad_medida: item.unidad_medida
  };
  mostrarModalEdicion.value = true;
};

const cerrarModalEdicion = () => {
  mostrarModalEdicion.value = false;
  itemEdicion.value = null;
  edicionData.value = {
    stock_minimo: 0,
    stock_maximo: undefined,
    costo_unitario: 0,
    unidad_medida: ''
  };
};

const procesarEdicion = async () => {
  if (!itemEdicion.value) return;

  try {
    const response = await inventarioService.actualizarInventario(itemEdicion.value.id, edicionData.value);

    if (response.ok) {
      cerrarModalEdicion();
      cargarInventario(); // Recargar datos
      cargarAlertas(); // Recargar alertas
    } else {
      console.error('Error al procesar edición:', response.message);
    }
  } catch (error) {
    console.error('Error al procesar edición:', error);
  }
};

const verMovimientos = async (item: InventarioItem) => {
  itemSeleccionado.value = item;
  mostrarModalMovimientos.value = true;
  await cargarMovimientos(item.id);
};

const cargarMovimientos = async (inventarioId: string) => {
  cargandoMovimientos.value = true;
  try {
    const response = await inventarioService.obtenerMovimientos(inventarioId, {
      pagina: paginaMovimientos.value,
      limite: 10
    });
    
    if (response.ok) {
      movimientos.value = response.data || [];
      totalPaginasMovimientos.value = response.total_paginas || 0;
      totalMovimientos.value = response.total || 0;
    }
  } catch (error) {
    console.error('Error al cargar movimientos:', error);
  } finally {
    cargandoMovimientos.value = false;
  }
};

const cerrarModalMovimientos = () => {
  mostrarModalMovimientos.value = false;
  itemSeleccionado.value = null;
  movimientos.value = [];
  paginaMovimientos.value = 1;
  totalPaginasMovimientos.value = 0;
  totalMovimientos.value = 0;
};

const formatearTipoMovimiento = (tipo: string) => {
  const tipos: Record<string, string> = {
    entrada: 'Entrada',
    salida: 'Salida',
    ajuste: 'Ajuste'
  };
  return tipos[tipo] || tipo;
};

const getTipoMovimientoColor = (tipo: string) => {
  const colores: Record<string, string> = {
    entrada: 'bg-green-100 text-green-800',
    salida: 'bg-red-100 text-red-800',
    ajuste: 'bg-orange-100 text-orange-800'
  };
  return colores[tipo] || 'bg-gray-100 text-gray-800';
};

const entradaRapida = (item: InventarioItem) => {
  itemSeleccionado.value = item;
  entradaRapidaData.value = {
    cantidad: 1,
    motivo: ''
  };
  mostrarModalEntradaRapida.value = true;
};

const cerrarModalEntradaRapida = () => {
  mostrarModalEntradaRapida.value = false;
  itemSeleccionado.value = null;
  entradaRapidaData.value = {
    cantidad: 1,
    motivo: ''
  };
};

const procesarEntradaRapida = async () => {
  if (!itemSeleccionado.value) return;

  // Validar campos requeridos
  if (!entradaRapidaData.value.cantidad || entradaRapidaData.value.cantidad <= 0) {
    console.error('La cantidad debe ser mayor a 0');
    return;
  }
  if (!entradaRapidaData.value.motivo || entradaRapidaData.value.motivo.trim() === '') {
    console.error('El motivo es requerido');
    return;
  }

  try {
    console.log('Enviando entrada rápida:', {
      inventario_id: itemSeleccionado.value.id,
      tipo_movimiento: 'entrada',
      cantidad: entradaRapidaData.value.cantidad,
      motivo: entradaRapidaData.value.motivo
    });

    const response = await inventarioService.crearMovimiento({
      inventario_id: itemSeleccionado.value.id,
      tipo_movimiento: 'entrada',
      cantidad: entradaRapidaData.value.cantidad,
      motivo: entradaRapidaData.value.motivo.trim()
    });

    if (response.ok) {
      cerrarModalEntradaRapida();
      cargarInventario(); // Recargar datos
    } else {
      console.error('Error al procesar entrada rápida:', response.message);
    }
  } catch (error) {
    console.error('Error al procesar entrada rápida:', error);
  }
};

const cerrarModalEntrada = () => {
  mostrarModalEntrada.value = false;
  nuevaEntrada.value = {
    inventario_id: '',
    cantidad: 1,
    motivo: ''
  };
};

const procesarEntradaStock = async () => {
  try {
    const response = await inventarioService.crearMovimiento({
      inventario_id: nuevaEntrada.value.inventario_id,
      tipo_movimiento: 'entrada',
      cantidad: nuevaEntrada.value.cantidad,
      motivo: nuevaEntrada.value.motivo
    });

    if (response.ok) {
      cerrarModalEntrada();
      cargarInventario(); // Recargar datos
      cargarAlertas(); // Recargar alertas
    } else {
      console.error('Error al procesar entrada:', response.message);
    }
  } catch (error) {
    console.error('Error al procesar entrada:', error);
  }
};

// Lifecycle
onMounted(() => {
  cargarInventario();
  
  // Actualizar alertas cada 30 segundos
  const intervaloAlertas = setInterval(() => {
    cargarAlertas();
  }, 30000);
  
  // Limpiar intervalo al desmontar
  onUnmounted(() => {
    clearInterval(intervaloAlertas);
  });
});
</script>
