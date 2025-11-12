<template>
  <div>
    <!-- Encabezado -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800">Control de Caja</h1>
      <p class="text-gray-600 mt-1">
        Gestiona la apertura y cierre de caja del restaurante
      </p>

      <!-- Indicador de Error -->
      <div v-if="error" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center">
          <svg class="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-red-800 text-sm">{{ error }}</span>
          <button @click="error = null" class="ml-auto text-red-400 hover:text-red-600">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

      <div
        v-if="alertaValidacion"
        class="mt-4 p-4 rounded-lg border flex items-start space-x-3"
        :class="alertaValidacion.tipo === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'"
      >
        <svg class="h-5 w-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            v-if="alertaValidacion.tipo === 'success'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M12 18a9 9 0 110-18 9 9 0 010 18z"
          />
        </svg>
        <div class="flex-1 text-sm">
          {{ alertaValidacion.mensaje }}
        </div>
        <button
          type="button"
          class="ml-3 text-current hover:opacity-80"
          @click="alertaValidacion = null"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

    <!-- Estado de Caja Actual -->
    <div v-if="loading" class="mb-8">
      <div class="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
        <div class="animate-pulse flex space-x-4">
          <div class="rounded-full bg-gray-300 h-12 w-12"></div>
          <div class="flex-1 space-y-2 py-1">
            <div class="h-4 bg-gray-300 rounded w-3/4"></div>
            <div class="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="mb-8">
      <div v-if="cajaActual" class="relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl transition-all duration-300 p-6 border border-orange-200">
        <div class="absolute top-4 left-4 w-3 h-3 bg-orange-500 rounded-full"></div>
        <div class="flex items-center justify-between">
          <!-- Información principal en fila -->
          <div class="flex items-center justify-between flex-1">
            <!-- Icono y título -->
            <div class="flex items-center">
              <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mr-4">
                <Coins class="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-800">Caja Abierta</h2>
                <p class="text-sm text-gray-600 mt-1">
                  Caja activa del restaurante
                </p>
              </div>
            </div>

            <!-- Información de fecha y monto centrada -->
            <div class="flex items-center space-x-8">
              <div class="text-center px-4 py-2 bg-white/60 rounded-lg border border-white/40">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha de Apertura</p>
                <p class="text-sm font-semibold text-gray-800">{{ cajaService.formatFecha(cajaActual.fecha_apertura) }}</p>
              </div>
              <div class="text-center px-4 py-2 bg-white/60 rounded-lg border border-white/40">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Monto Inicial</p>
                <p class="text-lg font-bold text-gray-900">{{ cajaService.formatMoneda(Number(cajaActual.monto_inicial)) }}</p>
              </div>
            </div>

            <!-- Espacio vacío para balancear -->
            <div class="w-32"></div>
          </div>

          <!-- Botón de cerrar caja -->
          <div>
            <button
              @click="mostrarModalCerrar = true"
              class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <svg class="h-5 w-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cerrar Caja
            </button>
          </div>
        </div>
      </div>

      <div v-else class="relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl transition-all duration-300 p-5 border border-orange-200">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mr-3">
                <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-800">Caja Cerrada</h2>
                <p class="text-sm text-gray-600 mt-1">No hay caja abierta actualmente</p>
              </div>
            </div>
          </div>

          <div class="ml-6">
            <button
              @click="mostrarModalAbrir = true"
              class="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2.5 rounded-xl font-semibold transform hover:scale-105 transition-all duration-200"
            >
              <svg class="h-5 w-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Abrir Caja
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Resumen del Día -->
    <div v-if="resumenCaja" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <!-- Total Ventas -->
      <div class="group relative bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-2xl transition-all duration-300 p-5 border border-orange-200 hover:border-orange-300">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <p class="text-sm font-medium text-orange-600">Ventas en Efectivo</p>
            <p class="text-2xl font-bold text-orange-700">
              {{ cajaService.formatMoneda(resumenCaja.total_ventas_dia) }}
            </p>
          </div>
          <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="w-full bg-orange-100 rounded-full h-1.5">
          <div class="bg-gradient-to-r from-orange-500 to-orange-600 h-1.5 rounded-full" style="width: 100%"></div>
        </div>
      </div>

      <!-- Ingresos Adicionales -->
      <div class="group relative bg-gradient-to-br from-amber-50 via-white to-amber-50 rounded-2xl transition-all duration-300 p-5 border border-amber-200 hover:border-amber-300">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <p class="text-sm font-medium text-amber-600">Ingresos Adicionales</p>
            <p class="text-2xl font-bold text-amber-700">
              {{ cajaService.formatMoneda(resumenCaja.total_ingresos_dia) }}
            </p>
          </div>
          <div class="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        </div>
        <div class="w-full bg-amber-100 rounded-full h-1.5">
          <div class="bg-gradient-to-r from-amber-500 to-orange-600 h-1.5 rounded-full" style="width: 100%"></div>
        </div>
      </div>

      <!-- Egresos -->
      <div class="group relative bg-gradient-to-br from-orange-50 via-white to-red-50 rounded-2xl transition-all duration-300 p-5 border border-red-200/70 hover:border-red-300">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <p class="text-sm font-medium text-red-600">Egresos</p>
            <p class="text-2xl font-bold text-red-600">
              {{ cajaService.formatMoneda(resumenCaja.total_egresos_dia) }}
            </p>
          </div>
          <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </div>
        </div>
        <div class="w-full bg-red-100 rounded-full h-1.5">
          <div class="bg-gradient-to-r from-red-500 to-orange-500 h-1.5 rounded-full" style="width: 100%"></div>
        </div>
      </div>

      <!-- Gastos del Día -->
      <div class="group relative bg-gradient-to-br from-red-50 via-white to-red-100 rounded-2xl transition-all duration-300 p-5 border border-red-300 hover:border-red-400">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <p class="text-sm font-medium text-red-700">Gastos del Día</p>
            <p class="text-2xl font-bold text-red-700">
              {{ cajaService.formatMoneda(resumenCaja.total_gastos_dia || 0) }}
            </p>
          </div>
          <div class="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div class="w-full bg-red-200 rounded-full h-1.5">
          <div class="bg-gradient-to-r from-red-600 to-red-700 h-1.5 rounded-full" style="width: 100%"></div>
        </div>
      </div>

      <!-- Diferencia -->
      <div class="group relative rounded-2xl transition-all duration-300 p-5 border"
           :class="resumenCaja.diferencia >= 0 ? 'bg-gradient-to-br from-orange-50 via-white to-amber-50 border-orange-200 hover:border-orange-300' : 'bg-gradient-to-br from-orange-50 via-white to-red-50 border-red-200 hover:border-red-300'">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <p class="text-sm font-medium" :class="resumenCaja.diferencia >= 0 ? 'text-orange-600' : 'text-red-600'">
              Diferencia
            </p>
            <p class="text-2xl font-bold" :class="resumenCaja.diferencia >= 0 ? 'text-orange-600' : 'text-red-600'">
              {{ cajaService.formatMoneda(resumenCaja.diferencia) }}
            </p>
          </div>
          <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110"
               :class="resumenCaja.diferencia >= 0 ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-red-600'">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <div class="w-full rounded-full h-1.5" :class="resumenCaja.diferencia >= 0 ? 'bg-orange-100' : 'bg-red-100'">
          <div class="h-1.5 rounded-full transition-all duration-500" :class="resumenCaja.diferencia >= 0 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'" style="width: 100%"></div>
        </div>
      </div>
    </div>

    <!-- Historial de Cajas -->
    <div class="bg-white rounded-2xl border border-gray-200">
      <div class="p-8 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-800 mb-2">Historial de Cajas</h2>
        <p class="text-gray-600">Registro completo de aperturas y cierres de caja</p>
      </div>

      <!-- Filtros -->
      <div class="p-6 bg-gray-50 border-b border-gray-200">
        <div :class="isAdmin ? 'grid grid-cols-1 md:grid-cols-4 gap-4' : 'grid grid-cols-1 md:grid-cols-3 gap-4'">
          <!-- Filtro por Restaurante (solo si es admin) -->
          <div v-if="isAdmin" class="md:col-span-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Restaurante</label>
            <CustomSelect
              v-model="filtroRestaurante"
              :options="restauranteOptions"
              placeholder="Seleccionar restaurante"
              @change="aplicarFiltros"
            />
          </div>

          <!-- Filtro Fecha Desde -->
          <div :class="isAdmin ? 'md:col-span-1' : 'md:col-span-1'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha Desde</label>
            <input
              v-model="filtroFechaDesde"
              @change="aplicarFiltros"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>

          <!-- Filtro Fecha Hasta -->
          <div :class="isAdmin ? 'md:col-span-1' : 'md:col-span-1'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha Hasta</label>
            <input
              v-model="filtroFechaHasta"
              @change="aplicarFiltros"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>

          <!-- Botón Limpiar Filtros -->
          <div :class="isAdmin ? 'md:col-span-1' : 'md:col-span-1'">
            <button
              @click="limpiarFiltros"
              class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
            >
              <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th class="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider align-middle">
                Restaurante
              </th>
              <th class="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider align-middle">
                Usuario
              </th>
              <th class="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider align-middle">
                Monto Inicial
              </th>
              <th class="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider align-middle">
                Monto Final
              </th>
              <th class="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider align-middle">
                Estado
              </th>
              <th class="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider align-middle">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="caja in cajas" :key="caja.id" class="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all duration-200">
              <td class="px-8 py-5 text-sm text-gray-900 align-middle">
                <div class="flex flex-col gap-2.5">
                <div class="flex items-center">
                    <span v-if="caja.restaurante_nombre" class="font-semibold text-gray-800 text-sm">
                      {{ caja.restaurante_nombre }}
                    </span>
                    <span v-else class="font-semibold text-gray-500 text-sm">
                      #{{ caja.restaurante_id }}
                    </span>
                  </div>
                  <div class="flex items-center ml-9">
                    <div class="w-1.5 h-1.5 rounded-full mr-2.5" :class="caja.estado === 'abierta' ? 'bg-emerald-500' : 'bg-gray-400'"></div>
                    <span class="text-xs text-gray-600">{{ cajaService.formatFecha(caja.fecha_apertura) }}</span>
                  </div>
                </div>
              </td>
              <td class="px-8 py-5 whitespace-nowrap text-sm text-gray-900 align-middle">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mr-3">
                    <span class="text-white text-xs font-bold">U</span>
                  </div>
                  <span v-if="caja.usuario_nombre" class="font-semibold text-gray-700">
                    {{ caja.usuario_nombre }}
                  </span>
                  <span v-else>
                    Usuario #{{ caja.usuario_id }}
                  </span>
                </div>
              </td>
              <td class="px-8 py-5 whitespace-nowrap text-sm text-gray-900 align-middle">
                <span class="font-semibold text-gray-900">{{ cajaService.formatMoneda(Number(caja.monto_inicial)) }}</span>
              </td>
              <td class="px-8 py-5 whitespace-nowrap text-sm text-gray-900 align-middle">
                <span v-if="caja.monto_final" class="font-semibold text-gray-900">{{ cajaService.formatMoneda(Number(caja.monto_final)) }}</span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-8 py-5 whitespace-nowrap align-middle">
                <span
                  class="px-3 py-1 inline-flex items-center gap-2 text-xs leading-5 font-semibold rounded-full transition-all duration-200"
                  :class="caja.estado === 'abierta' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
                >
                  <span class="w-2 h-2 rounded-full" :class="caja.estado === 'abierta' ? 'bg-emerald-500' : 'bg-gray-400'"></span>
                  {{ caja.estado === 'abierta' ? 'Abierta' : 'Cerrada' }}
                </span>
              </td>
              <td class="px-8 py-5 whitespace-nowrap text-sm font-medium align-middle">
                <button
                  @click="verDetalles(caja)"
                  class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                  <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver Detalles
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación Optimizada -->
      <div v-if="pagination && pagination.total > 0" class="px-8 py-4 border-t border-gray-200 bg-white">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Información de resultados -->
          <div class="flex items-center gap-4 text-sm text-gray-600">
            <span>
              Mostrando <span class="font-semibold text-gray-900">{{ (pagination.page - 1) * pagination.limit + 1 }}</span> a
              <span class="font-semibold text-gray-900">{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span> de
              <span class="font-semibold text-gray-900">{{ pagination.total }}</span> resultados
            </span>
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600">Mostrar:</label>
              <select
                :value="pagination?.limit || 10"
                @change="(e) => { if (pagination) { pagination.limit = Number((e.target as HTMLSelectElement).value); cargarCajas(1); } }"
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
              @click="cargarCajas(1)"
              :disabled="pagination.page <= 1 || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Primera página"
            >
              ««
            </button>

            <!-- Botón Anterior -->
            <button
              @click="cargarCajas(pagination.page - 1)"
              :disabled="pagination.page <= 1 || loading"
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
                  @click="cargarCajas(pageNum as number)"
                  :disabled="loading"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                    pageNum === pagination.page
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
              @click="cargarCajas(pagination.page + 1)"
              :disabled="pagination.page >= pagination.pages || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Página siguiente"
            >
              Siguiente →
            </button>

            <!-- Botón Última página -->
            <button
              @click="cargarCajas(pagination.pages)"
              :disabled="pagination.page >= pagination.pages || loading"
              class="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Última página"
            >
              »»
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Abrir Caja -->
    <Modal
      :show="mostrarModalAbrir"
      title="Abrir Nueva Caja"
      @update:show="mostrarModalAbrir = $event"
    >
      <div class="p-6">
        
        <form @submit.prevent="abrirCaja">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Monto Inicial
            </label>
            <input
              v-model="formAbrir.monto_inicial"
              type="number"
              step="0.01"
              min="0"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              v-model="formAbrir.observaciones"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones sobre la apertura de caja..."
            ></textarea>
          </div>
          
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="mostrarModalAbrir = false"
              class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {{ loading ? 'Abriendo...' : 'Abrir Caja' }}
            </button>
          </div>
        </form>
      </div>
    </Modal>

    <!-- Modal Cerrar Caja -->
    <Modal
      :show="mostrarModalCerrar"
      title="Cerrar Caja"
      size="3xl"
      @update:show="mostrarModalCerrar = $event"
    >
      <div class="p-5 lg:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
        
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3">
          <h4 class="text-sm font-bold text-gray-800 mb-2 flex items-center">
            <svg class="h-4 w-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Resumen del Día
          </h4>
          
          <div class="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <p class="text-gray-600">Aperturó caja:</p>
            <p class="text-right font-semibold text-gray-900">{{ cajaService.formatMoneda(Number(cajaActual?.monto_inicial || 0)) }}</p>
            
            <p class="text-gray-600">Ventas en efectivo:</p>
            <p class="text-right font-semibold text-gray-900">{{ cajaService.formatMoneda(resumenCaja?.ventas_efectivo || 0) }}</p>
            
            <p class="text-gray-600">Ventas en POS:</p>
            <p class="text-right font-semibold text-gray-900">{{ cajaService.formatMoneda(resumenCaja?.ventas_pos || 0) }}</p>
            
            <p class="text-gray-600">Ventas por transferencia:</p>
            <p class="text-right font-semibold text-gray-900">{{ cajaService.formatMoneda(resumenCaja?.ventas_transferencia || 0) }}</p>
            
            <p class="text-gray-600 font-medium">Total de VENTAS:</p>
            <p class="text-right font-bold text-gray-900">{{ cajaService.formatMoneda(resumenCaja?.total_ventas_dia || 0) }}</p>
            
            <p class="text-gray-600">Ingresos adicionales:</p>
            <p class="text-right font-semibold text-gray-900">+{{ cajaService.formatMoneda(resumenCaja?.total_ingresos_dia || 0) }}</p>
            
            <p class="text-gray-600">Gastos del día:</p>
            <p class="text-right font-semibold text-gray-900">-{{ cajaService.formatMoneda(resumenCaja?.total_gastos_dia || 0) }}</p>
          </div>
          
          <hr class="my-3 border-gray-300">
          
          <div class="grid grid-cols-2 gap-2 text-sm">
            <p class="font-bold text-gray-800">Efectivo que debe haber en caja:</p>
            <p class="text-right font-bold text-orange-600 text-base">{{ cajaService.formatMoneda(
              Number(cajaActual?.monto_inicial || 0) +
              (resumenCaja?.ventas_efectivo || 0) +
              (resumenCaja?.total_ingresos_dia || 0) -
              (resumenCaja?.total_gastos_dia || 0)
            ) }}</p>
            
            <p class="text-gray-600 text-xs">Cierre de caja (ventas - gastos):</p>
            <p class="text-right text-xs font-semibold text-gray-700">{{ cajaService.formatMoneda(
              (resumenCaja?.total_ventas_dia || 0) - (resumenCaja?.total_gastos_dia || 0)
            ) }}</p>
          </div>
        </div>
        
        <form @submit.prevent="cerrarCaja">
          <div
            v-if="validationPreview"
            class="mb-3 p-3 rounded-lg border flex items-start space-x-3"
            :class="validationPreview.isComplete
              ? (validationPreview.cuadra
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800')
              : 'bg-blue-50 border-blue-200 text-blue-800'"
          >
            <template v-if="validationPreview.isComplete && validationPreview.cuadra">
              <svg class="h-5 w-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </template>
            <template v-else-if="validationPreview.isComplete && !validationPreview.cuadra">
              <svg class="h-5 w-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 5a7 7 0 110 14 7 7 0 010-14z" />
              </svg>
            </template>
            <template v-else>
              <svg class="h-5 w-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 18a9 9 0 110-18 9 9 0 010 18z" />
              </svg>
            </template>
            <div>
              <p class="font-semibold text-sm">
                <span v-if="validationPreview.isComplete">
                  {{ validationPreview.cuadra ? 'Caja cuadra en 0' : 'Caja no cuadra' }}
                </span>
                <span v-else>Ingresa los montos para validar la caja</span>
              </p>
              <p v-if="validationPreview.isComplete" class="text-xs mt-1">
                {{ validationPreview.cuadra
                  ? 'Los montos reportados coinciden con los valores del sistema.'
                  : 'Los montos reportados no coinciden con el resumen del sistema.' }}
              </p>
              <p v-else class="text-xs mt-1">
                Completa los campos de la izquierda y compara con los valores esperados.
              </p>
            </div>
          </div>

          <div v-if="errorCerrar" class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ errorCerrar }}
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Efectivo contado en caja
                  </label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-gray-500">
                      Lp.
                    </span>
                    <input
                      :value="formCerrarInputs.efectivo"
                      inputmode="decimal"
                      class="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Monto en efectivo contado"
                      required
                      @input="handleCurrencyInput('efectivo', $event)"
                      @blur="handleCurrencyBlur('efectivo')"
                      @focus="handleCurrencyFocus('efectivo')"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Ventas por POS reportadas
                  </label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-gray-500">
                      Lp.
                    </span>
                    <input
                      :value="formCerrarInputs.pos"
                      inputmode="decimal"
                      class="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Total POS del día"
                      required
                      @input="handleCurrencyInput('pos', $event)"
                      @blur="handleCurrencyBlur('pos')"
                      @focus="handleCurrencyFocus('pos')"
                    />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Ventas por transferencia reportadas
                  </label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-gray-500">
                      Lp.
                    </span>
                    <input
                      :value="formCerrarInputs.transferencia"
                      inputmode="decimal"
                      class="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Total por transferencias"
                      required
                      @input="handleCurrencyInput('transferencia', $event)"
                      @blur="handleCurrencyBlur('transferencia')"
                      @focus="handleCurrencyFocus('transferencia')"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Gastos en efectivo reportados
                  </label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-gray-500">
                      Lp.
                    </span>
                    <input
                      :value="formCerrarInputs.gastos"
                      inputmode="decimal"
                      class="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Total de gastos pagados en efectivo"
                      required
                      @input="handleCurrencyInput('gastos', $event)"
                      @blur="handleCurrencyBlur('gastos')"
                      @focus="handleCurrencyFocus('gastos')"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  v-model="formCerrar.observaciones"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observaciones sobre el cierre de caja..."
                ></textarea>
              </div>
            </div>

            <div class="space-y-3">
              <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div class="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <h5 class="text-sm font-semibold text-gray-700">Comparación sistema vs. reportado</h5>
                  <span class="text-xs text-gray-500">Tolerancia ± Lp. 0.01</span>
                </div>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-100 text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-4 py-2 text-left font-medium text-gray-500">Concepto</th>
                        <th class="px-4 py-2 text-right font-medium text-gray-500">Sistema</th>
                        <th class="px-4 py-2 text-right font-medium text-gray-500">Reportado</th>
                        <th class="px-4 py-2 text-right font-medium text-gray-500">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-100">
                      <tr v-for="row in comparisonRows" :key="row.key">
                        <td class="px-4 py-2 text-gray-700">{{ row.label }}</td>
                        <td class="px-4 py-2 text-right text-gray-600">
                          {{ cajaService.formatMoneda(row.expected) }}
                        </td>
                        <td class="px-4 py-2 text-right text-gray-700">
                          <span v-if="row.reported !== null">{{ cajaService.formatMoneda(row.reported) }}</span>
                          <span v-else class="text-gray-400">--</span>
                        </td>
                        <td class="px-4 py-2 text-right font-semibold" :class="diffClass(row.diff)">
                          {{ formatDiff(row.diff) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p class="text-sm font-semibold text-orange-700">Efectivo esperado en caja</p>
                <p class="text-2xl font-bold text-orange-700">
                  {{ cajaService.formatMoneda(expectedData?.efectivo || 0) }}
                </p>
                <p class="text-xs text-gray-600 mt-1">
                  Calculado con monto inicial + ventas en efectivo + otros ingresos - gastos.
                </p>
              </div>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              @click="mostrarModalCerrar = false"
              class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {{ loading ? 'Cerrando...' : 'Cerrar Caja' }}
            </button>
          </div>
        </form>
      </div>
    </Modal>

    <!-- Modal Detalles de Caja -->
    <Modal
      :show="mostrarModalDetalles"
      title="Detalles de la Caja"
      @update:show="handleDetallesModal"
    >
      <div v-if="cajaSeleccionada" class="p-4 space-y-4">
        <!-- Información básica -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-xs text-gray-500 mb-1">Estado</p>
            <span
              class="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded"
              :class="cajaSeleccionada.estado === 'abierta' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="cajaSeleccionada.estado === 'abierta' ? 'bg-emerald-500' : 'bg-gray-500'"></span>
              {{ cajaSeleccionada.estado === 'abierta' ? 'Abierta' : 'Cerrada' }}
            </span>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Restaurante</p>
            <p class="text-sm text-gray-900">
              {{ cajaSeleccionada.restaurante_nombre || `#${cajaSeleccionada.restaurante_id}` }}
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Usuario</p>
            <p class="text-sm text-gray-900">
              {{ cajaSeleccionada.usuario_nombre || `Usuario #${cajaSeleccionada.usuario_id}` }}
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Fecha Apertura</p>
            <p class="text-sm text-gray-900">
              {{ cajaService.formatFecha(cajaSeleccionada.fecha_apertura) }}
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Fecha Cierre</p>
            <p class="text-sm" :class="cajaSeleccionada.fecha_cierre ? 'text-gray-900' : 'text-gray-400'">
              {{ cajaSeleccionada.fecha_cierre ? cajaService.formatFecha(cajaSeleccionada.fecha_cierre) : 'Sin cerrar' }}
            </p>
          </div>
        </div>

        <!-- Montos -->
        <div class="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
          <div>
            <p class="text-xs text-gray-500 mb-1">Monto Inicial</p>
            <p class="text-base font-semibold text-gray-900">{{ cajaService.formatMoneda(Number(cajaSeleccionada.monto_inicial)) }}</p>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Monto Final</p>
            <p class="text-base font-semibold" :class="cajaSeleccionada.monto_final ? 'text-gray-900' : 'text-gray-400'">
              {{ cajaSeleccionada.monto_final ? cajaService.formatMoneda(Number(cajaSeleccionada.monto_final)) : 'Sin registrar' }}
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Ingresos Adicionales</p>
            <p class="text-base font-semibold text-gray-900">{{ cajaService.formatMoneda(Number(cajaSeleccionada.total_ingresos || 0)) }}</p>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Egresos</p>
            <p class="text-base font-semibold text-gray-900">{{ cajaService.formatMoneda(Number(cajaSeleccionada.total_egresos || 0)) }}</p>
          </div>
        </div>

        <!-- Resumen -->
        <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-500 mb-0.5">Diferencia</p>
              <p class="text-lg font-semibold text-gray-900">
                {{ cajaService.formatMoneda(cajaService.calcularDiferencia(cajaSeleccionada)) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-500 mb-0.5">Total Ventas</p>
              <p class="text-lg font-semibold text-gray-900">{{ cajaService.formatMoneda(Number(cajaSeleccionada.total_ventas || 0)) }}</p>
            </div>
          </div>
        </div>

        <!-- Observaciones -->
        <div v-if="cajaSeleccionada.observaciones" class="pt-3 border-t border-gray-200">
          <p class="text-xs text-gray-500 mb-1">Observaciones</p>
          <p class="text-sm text-gray-700">{{ cajaSeleccionada.observaciones }}</p>
        </div>

        <!-- Botón cerrar -->
        <div class="flex justify-end pt-2">
          <button
            type="button"
            class="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            @click="handleDetallesModal(false)"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div v-else class="p-4 text-sm text-gray-500">
        No se encontró información para esta caja.
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useAuthStore } from '../../../stores/auth_store';
import { cajaService } from '../../../services/caja_service';
import { RestaurantesService } from '../../../services/restaurantes_service';
import Modal from '../../../components/ui/Modal.vue';
import CustomSelect from '../../../components/ui/CustomSelect.vue';
import { Coins } from 'lucide-vue-next';
import type { Caja, CajaCreate, CajaCierre, CajaResumen } from '../../../interfaces/Caja';
import type { Restaurante } from '../../../interfaces/Restaurante';
import { formatCurrencyHNLWithSign } from '../../../utils/currency';

// Store
const authStore = useAuthStore();

// Estado reactivo
const cajaActual = ref<Caja | null>(null);
const resumenCaja = ref<CajaResumen | null>(null);
const cajas = ref<Caja[]>([]);
const pagination = ref<{
  page: number;
  limit: number;
  total: number;
  pages: number;
} | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const mostrarModalAbrir = ref(false);
const mostrarModalCerrar = ref(false);
const mostrarModalDetalles = ref(false);
const cajaSeleccionada = ref<Caja | null>(null);

// Filtros
const restaurantes = ref<Restaurante[]>([]);
const filtroRestaurante = ref<string>('');
const filtroFechaDesde = ref<string>('');
const filtroFechaHasta = ref<string>('');

// Datos de respaldo para desarrollo
const datosRespaldo = {
  cajas: [
    {
      id: '1',
      restaurante_id: 'e21bd7d1-f145-4df8-820f-8c483290bc59',
      usuario_id: '550e8400-e29b-41d4-a716-446655440000',
      usuario_nombre: 'Usuario Demo',
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: undefined,
      monto_inicial: 1000,
      monto_final: undefined,
      estado: 'abierta' as const,
      total_ventas: 0,
      total_ingresos: 0,
      total_egresos: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  resumen: {
    total_ventas_dia: 0,
    ventas_efectivo: 0,
    ventas_pos: 0,
    ventas_transferencia: 0,
    total_ingresos_dia: 0,
    total_egresos_dia: 0,
    total_gastos_dia: 0,
    diferencia: 0
  }
};

// Formularios
const formAbrir = ref<CajaCreate>({
  restaurante_id: '',
  usuario_id: '550e8400-e29b-41d4-a716-446655440000',
  monto_inicial: 0,
  observaciones: ''
});

type FormularioCerrar = {
  efectivo_contado: number | null;
  ventas_pos: number | null;
  ventas_transferencia: number | null;
  gastos: number | null;
  observaciones: string;
};

const formCerrar = ref<FormularioCerrar>({
  efectivo_contado: null,
  ventas_pos: null,
  ventas_transferencia: null,
  gastos: null,
  observaciones: ''
});

const formCerrarInputs = reactive({
  efectivo: '',
  pos: '',
  transferencia: '',
  gastos: ''
});

const currencyInputFormatter = new Intl.NumberFormat('es-HN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true
});

const formatNumberInputDisplay = (value: number | null): string => {
  if (value === null || value === undefined) return '';
  return currencyInputFormatter.format(value);
};

const parseCurrencyInput = (value: string): number | null => {
  if (!value) return null;
  const normalized = value.replace(/[\s]/g, '').replace(/,/g, '');
  if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const fieldMap = {
  efectivo: 'efectivo_contado',
  pos: 'ventas_pos',
  transferencia: 'ventas_transferencia',
  gastos: 'gastos'
} as const;

type CurrencyField = keyof typeof fieldMap;

const syncCurrencyInputsFromValues = () => {
  formCerrarInputs.efectivo = formatNumberInputDisplay(formCerrar.value.efectivo_contado);
  formCerrarInputs.pos = formatNumberInputDisplay(formCerrar.value.ventas_pos);
  formCerrarInputs.transferencia = formatNumberInputDisplay(formCerrar.value.ventas_transferencia);
  formCerrarInputs.gastos = formatNumberInputDisplay(formCerrar.value.gastos);
};

const handleCurrencyInput = (field: CurrencyField, event: Event) => {
  const target = event.target as HTMLInputElement;
  const raw = target.value.replace(/[^0-9,.-]/g, '');
  formCerrarInputs[field] = raw;

  const parsed = parseCurrencyInput(raw);
  formCerrar.value[fieldMap[field]] = parsed;
};

const handleCurrencyBlur = (field: CurrencyField) => {
  const parsed = parseCurrencyInput(formCerrarInputs[field]);
  if (parsed !== null) {
    formCerrarInputs[field] = formatNumberInputDisplay(parsed);
    formCerrar.value[fieldMap[field]] = parsed;
  } else {
    formCerrarInputs[field] = '';
    formCerrar.value[fieldMap[field]] = null;
  }
};

const handleCurrencyFocus = (field: CurrencyField) => {
  formCerrarInputs[field] = formCerrarInputs[field].replace(/,/g, '');
};

const errorCerrar = ref<string | null>(null);
const alertaValidacion = ref<{ tipo: 'success' | 'warning'; mensaje: string } | null>(null);

const TOLERANCIA = 0.01;
const formatDiff = (diff: number | null): string => {
  if (diff === null) return '--';
  if (Math.abs(diff) <= TOLERANCIA) {
    return 'Lp. 0.00';
  }
  return formatCurrencyHNLWithSign(diff);
};

const diffClass = (diff: number | null): string => {
  if (diff === null) return 'text-gray-500';
  return Math.abs(diff) <= TOLERANCIA ? 'text-green-600' : 'text-red-600';
};

const mostrarAlertaValidacion = (tipo: 'success' | 'warning', mensaje: string) => {
  alertaValidacion.value = { tipo, mensaje };
  setTimeout(() => {
    if (alertaValidacion.value?.mensaje === mensaje) {
      alertaValidacion.value = null;
    }
  }, 8000);
};

// Computed
const restauranteId = computed(() => {
  // Buscar el restaurante_id en la información del usuario o usar un ID de prueba
  return authStore.userInfo?.restaurante_id || 'e21bd7d1-f145-4df8-820f-8c483290bc59';
});

// Verificar si el usuario es administrador
const isAdmin = computed(() => {
  const rolId = authStore.userInfo?.rol_id;
  return rolId === 1 || rolId === 2 || authStore.userInfo?.es_super_admin === true;
});

// Computed para opciones de restaurantes con badge de principal
const restauranteOptions = computed(() => {
  const options: Array<{ label: string; value: string; badge?: string }> = [
    { label: 'Todos los restaurantes', value: '' }
  ];
  
  restaurantes.value.forEach(restaurante => {
    const isPrincipal = restaurante.id === restauranteId.value;
    options.push({
      label: restaurante.nombre_restaurante,
      value: restaurante.id || '',
      badge: isPrincipal ? 'Principal' : undefined
    });
  });
  
  return options;
});

// Computed properties for cash closing modal
const expectedAmount = computed(() => {
  if (!cajaActual.value || !resumenCaja.value) return null;

  return Number(cajaActual.value.monto_inicial || 0) +
         (resumenCaja.value.ventas_efectivo || 0) +
         (resumenCaja.value.total_ingresos_dia || 0) -
         (resumenCaja.value.total_gastos_dia || 0);
});

const expectedData = computed(() => {
  if (!resumenCaja.value) return null;

  return {
    efectivo: expectedAmount.value ?? 0,
    ventas_efectivo: resumenCaja.value.ventas_efectivo || 0,
    ventas_pos: resumenCaja.value.ventas_pos || 0,
    ventas_transferencia: resumenCaja.value.ventas_transferencia || 0,
    gastos: resumenCaja.value.total_gastos_dia || 0
  };
});

const validationPreview = computed(() => {
  if (!expectedData.value) return null;

  const reportado = {
    efectivo: formCerrar.value.efectivo_contado,
    ventas_pos: formCerrar.value.ventas_pos,
    ventas_transferencia: formCerrar.value.ventas_transferencia,
    gastos: formCerrar.value.gastos
  };

  const valoresCompletos = Object.values(reportado).every(
    (valor) => valor !== null && valor !== undefined
  );

  if (!valoresCompletos) {
    return {
      isComplete: false,
      cuadra: false,
      diferencias: {
        efectivo: null,
        ventas_pos: null,
        ventas_transferencia: null,
        gastos: null
      },
      esperado: expectedData.value,
      reportado
    };
  }

  const diferencias = {
    efectivo: Number(reportado.efectivo) - expectedData.value.efectivo,
    ventas_pos: Number(reportado.ventas_pos) - expectedData.value.ventas_pos,
    ventas_transferencia:
      Number(reportado.ventas_transferencia) - expectedData.value.ventas_transferencia,
    gastos: Number(reportado.gastos) - expectedData.value.gastos
  };

  const cuadra = Object.values(diferencias).every((diff) => Math.abs(diff) <= TOLERANCIA);

  return {
    isComplete: true,
    cuadra,
    diferencias,
    esperado: expectedData.value,
    reportado: {
      efectivo: Number(reportado.efectivo),
      ventas_pos: Number(reportado.ventas_pos),
      ventas_transferencia: Number(reportado.ventas_transferencia),
      gastos: Number(reportado.gastos)
    }
  };
});

const comparisonRows = computed(() => {
  if (!expectedData.value) return [];

  const expected = expectedData.value;

  const rows = [
    {
      key: 'efectivo',
      label: 'Efectivo en caja',
      expected: Number(expected.efectivo),
      reported: formCerrar.value.efectivo_contado
    },
    {
      key: 'ventas_pos',
      label: 'Ventas POS',
      expected: Number(expected.ventas_pos),
      reported: formCerrar.value.ventas_pos
    },
    {
      key: 'ventas_transferencia',
      label: 'Ventas por transferencia',
      expected: Number(expected.ventas_transferencia),
      reported: formCerrar.value.ventas_transferencia
    },
    {
      key: 'gastos',
      label: 'Gastos en efectivo',
      expected: Number(expected.gastos),
      reported: formCerrar.value.gastos
    }
  ];

  return rows.map((row) => {
    const reported =
      row.reported !== null && row.reported !== undefined
        ? Number(row.reported)
        : null;

    return {
      ...row,
      reported,
      diff: reported !== null ? reported - row.expected : null
    };
  });
});

const inicializarFormularioCerrar = () => {
  if (!expectedData.value) return;

  formCerrar.value = {
    efectivo_contado: Number(expectedData.value.efectivo.toFixed(2)),
    ventas_pos: Number(expectedData.value.ventas_pos.toFixed(2)),
    ventas_transferencia: Number(expectedData.value.ventas_transferencia.toFixed(2)),
    gastos: Number(expectedData.value.gastos.toFixed(2)),
    observaciones: ''
  };
  errorCerrar.value = null;
  syncCurrencyInputsFromValues();
};

watch(mostrarModalCerrar, (isOpen) => {
  if (isOpen) {
    inicializarFormularioCerrar();
  }
});

watch(resumenCaja, (value) => {
  if (value && mostrarModalCerrar.value) {
    inicializarFormularioCerrar();
    syncCurrencyInputsFromValues();
  }
});


// Métodos
const cargarDatos = async () => {
  if (!restauranteId.value) return;

  try {
    loading.value = true;
    error.value = null;

    // Cargar datos en paralelo
    const [cajaActualRes, resumenRes, cajasRes] = await Promise.all([
      cajaService.getCajaActual(restauranteId.value),
      cajaService.getResumenCaja(restauranteId.value),
      cajaService.getCajas(restauranteId.value, 1, pagination.value?.limit || 10)
    ]);


    cajaActual.value = cajaActualRes.data;
    resumenCaja.value = resumenRes.data;
    cajas.value = cajasRes.data;
    pagination.value = cajasRes.pagination;

  } catch (err: unknown) {
    console.error('Error cargando datos de caja:', err);
    const errorMessage: string = err instanceof Error ? err.message : 'Error de conexión con el servidor. Usando datos de respaldo.';
    error.value = errorMessage;

    // Usar datos de respaldo cuando hay errores
    cajaActual.value = datosRespaldo.cajas.find(c => c.estado === 'abierta') || null;
    resumenCaja.value = datosRespaldo.resumen;
    cajas.value = datosRespaldo.cajas;
    pagination.value = {
      page: 1,
      limit: 10,
      total: datosRespaldo.cajas.length,
      pages: 1
    };
  } finally {
    loading.value = false;
  }
};

const cargarCajas = async (page: number = 1) => {
  try {
    loading.value = true;
    const limit = pagination.value?.limit || 10;
    
    let response;
    
    // Si es admin y hay filtro de restaurante, usar getAllCajas
    if (isAdmin.value && filtroRestaurante.value) {
      response = await cajaService.getAllCajas(
        page,
        limit,
        undefined,
        filtroRestaurante.value,
        filtroFechaDesde.value || undefined,
        filtroFechaHasta.value || undefined
      );
    } else if (isAdmin.value && !filtroRestaurante.value) {
      // Admin sin filtro de restaurante: mostrar todas las cajas
      response = await cajaService.getAllCajas(
        page,
        limit,
        undefined,
        undefined,
        filtroFechaDesde.value || undefined,
        filtroFechaHasta.value || undefined
      );
    } else {
      // Usuario normal: usar getCajas con su restaurante
      const restauranteIdToUse = filtroRestaurante.value || restauranteId.value;
      response = await cajaService.getCajas(
        restauranteIdToUse,
        page,
        limit,
        undefined,
        filtroFechaDesde.value || undefined,
        filtroFechaHasta.value || undefined
      );
    }
    
    cajas.value = response.data;
    pagination.value = response.pagination;
  } catch (err: unknown) {
    console.error('Error cargando cajas:', err);
    // Si hay error, mantener los datos actuales (datos de respaldo)
  } finally {
    loading.value = false;
  }
};

// Cargar restaurantes para el filtro
const cargarRestaurantes = async () => {
  if (!isAdmin.value) return;
  
  try {
    const response = await RestaurantesService.getAll();
    if (response.data.success) {
      restaurantes.value = response.data.data || [];
    }
  } catch (err) {
    console.error('Error cargando restaurantes:', err);
  }
};

// Aplicar filtros
const aplicarFiltros = () => {
  cargarCajas(1);
};

// Limpiar filtros
const limpiarFiltros = () => {
  filtroRestaurante.value = '';
  filtroFechaDesde.value = '';
  filtroFechaHasta.value = '';
  cargarCajas(1);
};

// Función para generar números de página con elipsis
const getPageNumbers = (): (number | string)[] => {
  if (!pagination.value) return [];
  
  const { page, pages } = pagination.value;
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

const abrirCaja = async () => {
  if (!restauranteId.value || !authStore.user?.id) return;
  
  try {
    loading.value = true;
    error.value = null;

    // Establecer el restaurante_id y usuario_id en el formulario
    formAbrir.value.restaurante_id = restauranteId.value;
    formAbrir.value.usuario_id = authStore.user.id;

    await cajaService.abrirCaja(formAbrir.value);

    mostrarModalAbrir.value = false;
    formAbrir.value = {
      restaurante_id: '',
      usuario_id: '550e8400-e29b-41d4-a716-446655440000',
      monto_inicial: 0,
      observaciones: ''
    };

    await cargarDatos();
  } catch (err: unknown) {
    console.error('Error abriendo caja:', err);
    const errorMessage: string = err instanceof Error ? err.message : 'Error al abrir caja. Verifica tu conexión e intenta nuevamente.';
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

const cerrarCaja = async () => {
  if (!cajaActual.value || !validationPreview.value) return;

  const preview = validationPreview.value;

  if (!preview.isComplete) {
    errorCerrar.value = 'Completa todos los montos antes de cerrar la caja.';
    return;
  }

  errorCerrar.value = null;

  if (!preview.cuadra) {
    const continuar = window.confirm(
      'Los montos reportados no coinciden con los valores esperados. ¿Deseas cerrar la caja de todos modos?'
    );
    if (!continuar) {
      return;
    }
  }
  
  try {
    loading.value = true;

    const efectivoReportado = Number(formCerrar.value.efectivo_contado ?? 0);
    const gastosReportados = Number(formCerrar.value.gastos ?? 0);
    const ingresosAdicionales = resumenCaja.value?.total_ingresos_dia || 0;
    const ventasEfectivoReportadas =
      efectivoReportado -
      Number(cajaActual.value.monto_inicial || 0) -
      ingresosAdicionales +
      gastosReportados;

    const cerrarData: CajaCierre = {
      monto_final: efectivoReportado,
      ventas_pos_reportadas: Number(formCerrar.value.ventas_pos ?? 0),
      ventas_transferencia_reportadas: Number(formCerrar.value.ventas_transferencia ?? 0),
      gastos_reportados: gastosReportados,
      ventas_efectivo_reportadas: ventasEfectivoReportadas,
      observaciones: formCerrar.value.observaciones || ''
    };

    const resultado = await cajaService.cerrarCaja(cajaActual.value.id, cerrarData);

    if (resultado?.validacion) {
      mostrarAlertaValidacion(
        resultado.validacion.cuadra ? 'success' : 'warning',
        resultado.validacion.mensaje
      );
    } else {
      mostrarAlertaValidacion('success', 'Caja cerrada correctamente');
    }

    mostrarModalCerrar.value = false;
    formCerrar.value = {
      efectivo_contado: null,
      ventas_pos: null,
      ventas_transferencia: null,
      gastos: null,
      observaciones: ''
    };
    syncCurrencyInputsFromValues();

    await cargarDatos();
  } catch (err: unknown) {
    console.error('Error cerrando caja:', err);
  } finally {
    loading.value = false;
  }
};

const verDetalles = (caja: Caja) => {
  cajaSeleccionada.value = caja;
  mostrarModalDetalles.value = true;
};

const handleDetallesModal = (value: boolean) => {
  mostrarModalDetalles.value = value;
  if (!value) {
    cajaSeleccionada.value = null;
  }
};

// Lifecycle
onMounted(() => {
  cargarDatos();
  cargarRestaurantes();
});
</script>
