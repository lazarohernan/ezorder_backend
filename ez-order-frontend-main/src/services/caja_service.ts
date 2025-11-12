import axios from '../plugins/axios';
import type { Caja, CajaCreate, CajaUpdate, CajaCierre } from '../interfaces/Caja';
import { formatCurrencyHNL } from '../utils/currency';

export const cajaService = {
  // Obtener todas las cajas de todos los restaurantes (solo administradores)
  async getAllCajas(page: number = 1, limit: number = 10, estado?: string, restauranteId?: string, fechaDesde?: string, fechaHasta?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (estado) {
      params.append('estado', estado);
    }

    if (restauranteId) {
      params.append('restaurante_id', restauranteId);
    }

    if (fechaDesde) {
      params.append('fecha_desde', fechaDesde);
    }

    if (fechaHasta) {
      params.append('fecha_hasta', fechaHasta);
    }

    const response = await axios.get(`/caja/all?${params}`);
    return response.data;
  },

  // Obtener todas las cajas abiertas de todos los restaurantes (solo administradores)
  async getAllCajasAbiertas(page: number = 1, limit: number = 10, restauranteId?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (restauranteId) {
      params.append('restaurante_id', restauranteId);
    }

    const response = await axios.get(`/caja/open?${params}`);
    return response.data;
  },

  // Obtener todas las cajas de un restaurante
  async getCajas(restauranteId: string, page: number = 1, limit: number = 10, estado?: string, fechaDesde?: string, fechaHasta?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (estado) {
      params.append('estado', estado);
    }

    if (fechaDesde) {
      params.append('fecha_desde', fechaDesde);
    }

    if (fechaHasta) {
      params.append('fecha_hasta', fechaHasta);
    }

    const response = await axios.get(`/caja/restaurante/${restauranteId}?${params}`);
    return response.data;
  },

  // Obtener caja actual (abierta) de un restaurante
  async getCajaActual(restauranteId: string) {
    const response = await axios.get(`/caja/restaurante/${restauranteId}/actual`);
    return response.data;
  },

  // Obtener resumen de caja del día
  async getResumenCaja(restauranteId: string, fecha?: string) {
    const params = fecha ? `?fecha=${fecha}` : '';
    const response = await axios.get(`/caja/restaurante/${restauranteId}/resumen${params}`);
    return response.data;
  },

  // Obtener una caja específica por ID
  async getCajaById(id: string) {
    const response = await axios.get(`/caja/${id}`);
    return response.data;
  },

  // Abrir caja
  async abrirCaja(cajaData: CajaCreate) {
    const response = await axios.post('/caja/abrir', cajaData);
    return response.data;
  },

  // Cerrar caja
  async cerrarCaja(id: string, cierreData: CajaCierre) {
    const response = await axios.put(`/caja/${id}/cerrar`, cierreData);
    return response.data;
  },

  // Actualizar caja (ingresos/egresos adicionales)
  async actualizarCaja(id: string, updateData: CajaUpdate) {
    const response = await axios.put(`/caja/${id}`, updateData);
    return response.data;
  },

  // Formatear fecha para mostrar
  formatFecha(fecha: string | null | undefined): string {
    if (!fecha) return 'Sin fecha';

    return new Date(fecha).toLocaleString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Tegucigalpa'
    });
  },

  // Formatear moneda
  formatMoneda(monto: number): string {
    return formatCurrencyHNL(monto);
  },

  // Calcular diferencia de caja
  calcularDiferencia(caja: Caja): number {
    if (!caja.monto_final) return 0;
    
    const montoEsperado = Number(caja.monto_inicial) + Number(caja.total_ventas) + Number(caja.total_ingresos) - Number(caja.total_egresos);
    return Number(caja.monto_final) - montoEsperado;
  },

  // Verificar si hay caja abierta
  async verificarCajaAbierta(restauranteId: string): Promise<boolean> {
    try {
      console.log('🔍 Verificando caja abierta para restaurante:', restauranteId);
      const response = await this.getCajaActual(restauranteId);
      const tieneCajaAbierta = !!response.data;
      console.log('📊 Respuesta getCajaActual:', response);
      console.log('✅ Tiene caja abierta:', tieneCajaAbierta);
      return tieneCajaAbierta;
    } catch (error) {
      console.error('❌ Error al verificar caja abierta:', error);
      return false;
    }
  }
};






