import axios from '../plugins/axios';
import type { Gasto, GastoCreate, GastoUpdate, GastoResumenCategoria, GastoTotal } from '../interfaces/Gasto';

export const gastosService = {
  // Obtener todos los gastos de un restaurante
  async getGastos(
    restauranteId: string, 
    page: number = 1, 
    limit: number = 10, 
    categoria?: string,
    fechaInicio?: string,
    fechaFin?: string
  ) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (categoria) {
      params.append('categoria', categoria);
    }

    if (fechaInicio) {
      params.append('fecha_inicio', fechaInicio);
    }

    if (fechaFin) {
      params.append('fecha_fin', fechaFin);
    }

    const response = await axios.get(`/gastos/restaurante/${restauranteId}?${params}`);
    return response.data;
  },

  // Obtener un gasto específico por ID
  async getGastoById(id: string) {
    const response = await axios.get(`/gastos/${id}`);
    return response.data;
  },

  // Crear un nuevo gasto
  async createGasto(gastoData: GastoCreate) {
    const response = await axios.post('/gastos', gastoData);
    return response.data;
  },

  // Actualizar un gasto
  async updateGasto(id: string, updateData: GastoUpdate) {
    const response = await axios.put(`/gastos/${id}`, updateData);
    return response.data;
  },

  // Eliminar un gasto
  async deleteGasto(id: string) {
    const response = await axios.delete(`/gastos/${id}`);
    return response.data;
  },

  // Obtener resumen de gastos por categoría
  async getResumenPorCategoria(restauranteId: string, fechaInicio?: string, fechaFin?: string) {
    let url = `/gastos/restaurante/${restauranteId}/resumen-categoria`;
    const params = new URLSearchParams();

    if (fechaInicio) {
      params.append('fecha_inicio', fechaInicio);
    }

    if (fechaFin) {
      params.append('fecha_fin', fechaFin);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url);
    return response.data;
  },

  // Obtener total de gastos
  async getTotalGastos(restauranteId: string, fechaInicio?: string, fechaFin?: string) {
    let url = `/gastos/restaurante/${restauranteId}/total`;
    const params = new URLSearchParams();

    if (fechaInicio) {
      params.append('fecha_inicio', fechaInicio);
    }

    if (fechaFin) {
      params.append('fecha_fin', fechaFin);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url);
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

  // Formatear solo fecha sin hora
  formatFechaSolo(fecha: string | null | undefined): string {
    if (!fecha) return 'Sin fecha';
    
    return new Date(fecha).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Tegucigalpa'
    });
  },

  // Formatear moneda
  formatMoneda(monto: number): string {
    const formatter = new Intl.NumberFormat('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `L ${formatter.format(monto)}`;
  },

  // Obtener fecha de inicio del mes actual
  getInicioMesActual(): string {
    const fecha = new Date();
    fecha.setDate(1);
    fecha.setHours(0, 0, 0, 0);
    return fecha.toISOString();
  },

  // Obtener fecha de fin del mes actual
  getFinMesActual(): string {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() + 1);
    fecha.setDate(0);
    fecha.setHours(23, 59, 59, 999);
    return fecha.toISOString();
  },

  // Obtener fecha de inicio del día
  getInicioDia(fecha?: Date): string {
    const f = fecha || new Date();
    f.setHours(0, 0, 0, 0);
    return f.toISOString();
  },

  // Obtener fecha de fin del día
  getFinDia(fecha?: Date): string {
    const f = fecha || new Date();
    f.setHours(23, 59, 59, 999);
    return f.toISOString();
  }
};


