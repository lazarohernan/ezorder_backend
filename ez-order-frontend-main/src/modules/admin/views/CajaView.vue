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
                <div class="flex items-center text-sm text-gray-600">
                  <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span v-if="cajaActual.usuario_nombre" class="font-semibold text-gray-700">
                    {{ cajaActual.usuario_nombre }}
                  </span>
                  <span v-else>
                    Usuario #{{ cajaActual.usuario_id }}
                  </span>
                </div>
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

      <div v-else class="relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl transition-all duration-300 p-8 border border-orange-200">
        <div class="absolute top-4 left-4 w-3 h-3 bg-orange-500 rounded-full"></div>
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mr-4">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-gray-800 mb-1">Caja Cerrada</h2>
                <p class="text-gray-600">No hay caja abierta actualmente</p>
              </div>
            </div>
          </div>

          <div class="ml-8">
            <button
              @click="mostrarModalAbrir = true"
              class="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-xl font-semibold transform hover:scale-105 transition-all duration-200"
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
    <div v-if="resumenCaja" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <!-- Total Ventas -->
      <div class="group relative bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-2xl transition-all duration-300 p-6 border border-orange-200 hover:border-orange-300">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="text-right">
            <div class="w-2 h-2 bg-orange-400 rounded-full"></div>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-orange-600 mb-1">Ventas en Efectivo</p>
          <p class="text-3xl font-bold text-orange-700 mb-2">
            {{ cajaService.formatMoneda(resumenCaja.total_ventas_dia) }}
          </p>
          <div class="w-full bg-orange-100 rounded-full h-2">
            <div class="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full" style="width: 100%"></div>
          </div>
        </div>
      </div>

      <!-- Ingresos Adicionales -->
      <div class="group relative bg-gradient-to-br from-amber-50 via-white to-amber-50 rounded-2xl transition-all duration-300 p-6 border border-amber-200 hover:border-amber-300">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div class="text-right">
            <div class="w-2 h-2 bg-amber-400 rounded-full"></div>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-amber-600 mb-1">Ingresos Adicionales</p>
          <p class="text-3xl font-bold text-amber-700 mb-2">
            {{ cajaService.formatMoneda(resumenCaja.total_ingresos_dia) }}
          </p>
          <div class="w-full bg-amber-100 rounded-full h-2">
            <div class="bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 h-2 rounded-full" style="width: 100%"></div>
          </div>
        </div>
      </div>

      <!-- Egresos -->
      <div class="group relative bg-gradient-to-br from-orange-50 via-white to-red-50 rounded-2xl transition-all duration-300 p-6 border border-red-200/70 hover:border-red-300">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </div>
          <div class="text-right">
            <div class="w-2 h-2 bg-red-400 rounded-full"></div>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-red-600 mb-1">Egresos</p>
          <p class="text-3xl font-bold text-red-600 mb-2">
            {{ cajaService.formatMoneda(resumenCaja.total_egresos_dia) }}
          </p>
          <div class="w-full bg-red-100 rounded-full h-2">
            <div class="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full" style="width: 100%"></div>
          </div>
        </div>
      </div>

      <!-- Gastos del Día -->
      <div class="group relative bg-gradient-to-br from-red-50 via-white to-red-100 rounded-2xl transition-all duration-300 p-6 border border-red-300 hover:border-red-400">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div class="text-right">
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-red-700 mb-1">Gastos del Día</p>
          <p class="text-3xl font-bold text-red-700 mb-2">
            {{ cajaService.formatMoneda(resumenCaja.total_gastos_dia || 0) }}
          </p>
          <div class="w-full bg-red-200 rounded-full h-2">
            <div class="bg-gradient-to-r from-red-600 to-red-700 h-2 rounded-full" style="width: 100%"></div>
          </div>
        </div>
      </div>

      <!-- Diferencia -->
      <div class="group relative bg-gradient-to-br from-orange-50 via-white to-amber-50 rounded-2xl transition-all duration-300 p-6 border"
           :class="resumenCaja.diferencia >= 0 ? 'border-orange-200 hover:border-orange-300' : 'border-red-200 hover:border-red-300'">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200"
               :class="resumenCaja.diferencia >= 0 ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-red-600'">
            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div class="text-right">
            <div class="w-2 h-2 rounded-full" :class="resumenCaja.diferencia >= 0 ? 'bg-orange-400' : 'bg-red-400'"></div>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium mb-1" :class="resumenCaja.diferencia >= 0 ? 'text-orange-600' : 'text-red-600'">
            Diferencia
          </p>
          <p class="text-3xl font-bold mb-2" :class="resumenCaja.diferencia >= 0 ? 'text-orange-600' : 'text-red-600'">
            {{ cajaService.formatMoneda(resumenCaja.diferencia) }}
          </p>
          <div class="w-full rounded-full h-2" :class="resumenCaja.diferencia >= 0 ? 'bg-orange-100' : 'bg-red-100'">
            <div class="h-2 rounded-full transition-all duration-500" :class="resumenCaja.diferencia >= 0 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'" style="width: 100%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Historial de Cajas -->
    <div class="bg-white rounded-2xl border border-gray-200">
      <div class="p-8 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-800 mb-2">Historial de Cajas</h2>
        <p class="text-gray-600">Registro completo de aperturas y cierres de caja</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th class="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider align-middle">
                Fecha Apertura
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
              <td class="px-8 py-5 whitespace-nowrap text-sm text-gray-900 align-middle">
                <div class="flex items-center">
                  <div class="w-2 h-2 rounded-full mr-3" :class="caja.estado === 'abierta' ? 'bg-emerald-500' : 'bg-gray-500'"></div>
                  {{ cajaService.formatFecha(caja.fecha_apertura) }}
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

      <!-- Paginación -->
      <div v-if="pagination && pagination.pages > 1" class="px-8 py-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-600">
            <span class="font-medium">Mostrando</span> {{ (pagination.page - 1) * pagination.limit + 1 }} a
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} de
            <span class="font-semibold text-gray-800">{{ pagination.total }}</span> resultados
          </div>
          <div class="flex space-x-3">
            <button
              @click="cargarCajas(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              ← Anterior
            </button>
            <button
              @click="cargarCajas(pagination.page + 1)"
              :disabled="pagination.page >= pagination.pages"
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 border border-orange-500 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Siguiente →
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
      @update:show="mostrarModalCerrar = $event"
    >
      <div class="p-6">
        
        <div class="mb-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
          <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center">
            <svg class="h-4 w-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Resumen del Día
          </h4>
          
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <p class="text-gray-600">Aperturó caja:</p>
            <p class="text-right font-semibold text-gray-900">{{ cajaService.formatMoneda(Number(cajaActual?.monto_inicial || 0)) }}</p>
            
            <p class="text-gray-600">Ventas en efectivo:</p>
            <p class="text-right font-semibold text-gray-900">{{ cajaService.formatMoneda(resumenCaja?.ventas_efectivo || 0) }}</p>
            
            <p class="text-gray-600">Ventas en POS:</p>
            <p class="text-right font-semibold text-gray-900">{{ cajaService.formatMoneda(resumenCaja?.ventas_pos || 0) }}</p>
            
            <p class="text-gray-600">Ventas por transferencia:</p>
            <p class="text-right font-semibold text-gray-900">{{ cajaService.formatMoneda(resumenCaja?.ventas_transferencia || 0) }}</p>
            
            <p class="text-blue-700 font-medium">Total de VENTAS:</p>
            <p class="text-right font-bold text-blue-700">{{ cajaService.formatMoneda(resumenCaja?.total_ventas_dia || 0) }}</p>
            
            <p class="text-gray-600">Ingresos adicionales:</p>
            <p class="text-right font-semibold text-green-600">+{{ cajaService.formatMoneda(resumenCaja?.total_ingresos_dia || 0) }}</p>
            
            <p class="text-gray-600">Gastos del día:</p>
            <p class="text-right font-semibold text-red-600">-{{ cajaService.formatMoneda(resumenCaja?.total_gastos_dia || 0) }}</p>
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
          <!-- Monto Final Automático -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Monto Final Calculado
            </label>
            <div class="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p class="text-lg font-bold text-orange-700 text-center">
                {{ cajaService.formatMoneda(expectedAmount || 0) }}
              </p>
              <p class="text-xs text-gray-600 text-center mt-1">
                Este es el monto que debería haber en la caja
              </p>
            </div>
          </div>
          
          <div class="mb-6">
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
          
          <div class="flex justify-end space-x-3">
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
      <div v-if="cajaSeleccionada" class="p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p class="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">Estado</p>
            <span
              class="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full"
              :class="cajaSeleccionada.estado === 'abierta' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'"
            >
              <span class="w-2 h-2 rounded-full" :class="cajaSeleccionada.estado === 'abierta' ? 'bg-emerald-500' : 'bg-gray-500'"></span>
              {{ cajaSeleccionada.estado === 'abierta' ? 'Abierta' : 'Cerrada' }}
            </span>
          </div>

          <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p class="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">Usuario</p>
            <p class="text-sm font-semibold text-gray-800">
              {{ cajaSeleccionada.usuario_nombre || `Usuario #${cajaSeleccionada.usuario_id}` }}
            </p>
          </div>

          <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p class="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">Fecha de Apertura</p>
            <p class="text-sm font-semibold text-gray-800">
              {{ cajaService.formatFecha(cajaSeleccionada.fecha_apertura) }}
            </p>
          </div>

          <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p class="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">Fecha de Cierre</p>
            <p class="text-sm font-semibold" :class="(cajaSeleccionada.fecha_cierre && cajaSeleccionada.fecha_cierre !== null && cajaSeleccionada.fecha_cierre !== undefined) ? 'text-gray-800' : 'text-gray-400'">
              {{ (cajaSeleccionada.fecha_cierre && cajaSeleccionada.fecha_cierre !== null && cajaSeleccionada.fecha_cierre !== undefined) ? cajaService.formatFecha(cajaSeleccionada.fecha_cierre) : 'Sin cerrar' }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">Monto Inicial</p>
            <p class="text-xl font-bold text-gray-900">{{ cajaService.formatMoneda(Number(cajaSeleccionada.monto_inicial)) }}</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">Monto Final</p>
            <p class="text-xl font-bold" :class="cajaSeleccionada.monto_final ? 'text-gray-900' : 'text-gray-400'">
              {{ cajaSeleccionada.monto_final ? cajaService.formatMoneda(Number(cajaSeleccionada.monto_final)) : 'Sin registrar' }}
            </p>
          </div>

          <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">Ingresos Adicionales</p>
            <p class="text-xl font-bold text-gray-900">{{ cajaService.formatMoneda(Number(cajaSeleccionada.total_ingresos || 0)) }}</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">Egresos</p>
            <p class="text-xl font-bold text-gray-900">{{ cajaService.formatMoneda(Number(cajaSeleccionada.total_egresos || 0)) }}</p>
          </div>
        </div>

        <div class="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-widest text-white/70">Diferencia</p>
              <p class="text-2xl font-bold">
                {{ cajaService.formatMoneda(cajaService.calcularDiferencia(cajaSeleccionada)) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs uppercase tracking-widest text-white/70">Total Ventas</p>
              <p class="text-lg font-semibold">{{ cajaService.formatMoneda(Number(cajaSeleccionada.total_ventas || 0)) }}</p>
            </div>
          </div>
        </div>

        <div v-if="cajaSeleccionada.observaciones" class="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p class="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">Observaciones</p>
          <p class="text-sm text-gray-700 leading-relaxed">{{ cajaSeleccionada.observaciones }}</p>
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
            @click="handleDetallesModal(false)"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div v-else class="p-6 text-sm text-gray-500">
        No se encontró información para esta caja.
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../../stores/auth_store';
import { cajaService } from '../../../services/caja_service';
import Modal from '../../../components/ui/Modal.vue';
import { Coins } from 'lucide-vue-next';
import type { Caja, CajaCreate, CajaCierre, CajaResumen } from '../../../interfaces/Caja';

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
    total_ingresos_dia: 0,
    total_egresos_dia: 0,
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

const formCerrar = ref<CajaCierre>({
  monto_final: 0,
  observaciones: ''
});

// Computed
const restauranteId = computed(() => {
  // Buscar el restaurante_id en la información del usuario o usar un ID de prueba
  return authStore.userInfo?.restaurante_id || 'e21bd7d1-f145-4df8-820f-8c483290bc59';
});

// Computed properties for cash closing modal
const expectedAmount = computed(() => {
  if (!cajaActual.value || !resumenCaja.value) return null;

  return Number(cajaActual.value.monto_inicial || 0) +
         (resumenCaja.value.ventas_efectivo || 0) +
         (resumenCaja.value.total_ingresos_dia || 0) -
         (resumenCaja.value.total_gastos_dia || 0);
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
      cajaService.getCajas(restauranteId.value)
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
  if (!restauranteId.value) return;

  try {
    const response = await cajaService.getCajas(restauranteId.value, page);
    cajas.value = response.data;
    pagination.value = response.pagination;
  } catch (err: unknown) {
    console.error('Error cargando cajas:', err);
    // Si hay error, mantener los datos actuales (datos de respaldo)
  }
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
  if (!cajaActual.value || !expectedAmount.value) return;
  
  try {
    loading.value = true;
    
    // Usar el monto calculado automáticamente
    const cerrarData = {
      monto_final: expectedAmount.value,
      observaciones: formCerrar.value.observaciones || ''
    };
    
    await cajaService.cerrarCaja(cajaActual.value.id, cerrarData);
    
    mostrarModalCerrar.value = false;
    formCerrar.value = {
      monto_final: 0,
      observaciones: ''
    };
    
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
});
</script>
