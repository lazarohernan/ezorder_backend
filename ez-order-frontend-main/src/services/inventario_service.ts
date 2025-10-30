import axios from '@/plugins/axios';

// Interfaces
export interface Menu {
  id: string;
  nombre: string;
  imagen?: string;
  requiere_inventario: boolean;
  ingredientes?: string;
}

export interface InventarioItem {
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

export interface MovimientoInventario {
  id: string;
  inventario_id: string;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string;
  referencia?: string;
  usuario_id?: string;
  created_at: string;
}

export interface AlertaStock {
  id: string;
  inventario_id: string;
  tipo_alerta: 'stock_bajo' | 'stock_agotado' | 'stock_critico';
  mensaje: string;
  leida: boolean;
  usuario_notificado?: string;
  created_at: string;
  leida_at?: string;
}

export interface CrearMovimientoRequest {
  inventario_id: string;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string;
  referencia?: string;
}

export interface ActualizarInventarioRequest {
  stock_minimo?: number;
  stock_maximo?: number;
  unidad_medida?: string;
  costo_unitario?: number;
  activo?: boolean;
}

export interface FiltrosInventario {
  busqueda?: string;
  estado_stock?: 'normal' | 'bajo' | 'agotado';
  requiere_inventario?: boolean;
  activo?: boolean;
  pagina?: number;
  limite?: number;
}

export interface RespuestaInventario {
  ok: boolean;
  data: InventarioItem[];
  total: number;
  pagina: number;
  total_paginas: number;
  message?: string;
}

export interface RespuestaMovimientos {
  ok: boolean;
  data: MovimientoInventario[];
  total: number;
  pagina: number;
  total_paginas: number;
  message?: string;
}

export interface RespuestaAlertas {
  ok: boolean;
  data: AlertaStock[];
  total: number;
  message?: string;
}

// Servicio de Inventario
export const inventarioService = {
  // Obtener todos los items de inventario
  async obtenerInventario(filtros?: FiltrosInventario): Promise<RespuestaInventario> {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros?.estado_stock) params.append('estado_stock', filtros.estado_stock);
      if (filtros?.requiere_inventario !== undefined) params.append('requiere_inventario', filtros.requiere_inventario.toString());
      if (filtros?.activo !== undefined) params.append('activo', filtros.activo.toString());
      if (filtros?.pagina) params.append('pagina', filtros.pagina.toString());
      if (filtros?.limite) params.append('limite', filtros.limite.toString());

      const response = await axios.get(`/inventario?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener inventario:', error);
      throw error;
    }
  },

  // Obtener un item de inventario por ID
  async obtenerInventarioPorId(id: string): Promise<{ ok: boolean; data: InventarioItem; message?: string }> {
    try {
      const response = await axios.get(`/inventario/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener inventario por ID:', error);
      throw error;
    }
  },

  // Crear nuevo item de inventario
  async crearInventario(data: {
    menu_id: string;
    stock_actual: number;
    stock_minimo: number;
    stock_maximo?: number;
    unidad_medida: string;
    costo_unitario: number;
  }): Promise<{ ok: boolean; data: InventarioItem; message?: string }> {
    try {
      const response = await axios.post('/inventario', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear inventario:', error);
      throw error;
    }
  },

  // Actualizar item de inventario
  async actualizarInventario(id: string, data: ActualizarInventarioRequest): Promise<{ ok: boolean; data: InventarioItem; message?: string }> {
    try {
      const response = await axios.put(`/inventario/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar inventario:', error);
      throw error;
    }
  },

  // Eliminar item de inventario
  async eliminarInventario(id: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const response = await axios.delete(`/inventario/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar inventario:', error);
      throw error;
    }
  },

  // Obtener movimientos de inventario
  async obtenerMovimientos(inventarioId?: string, filtros?: {
    tipo_movimiento?: 'entrada' | 'salida' | 'ajuste';
    fecha_desde?: string;
    fecha_hasta?: string;
    pagina?: number;
    limite?: number;
  }): Promise<RespuestaMovimientos> {
    try {
      const params = new URLSearchParams();
      
      if (inventarioId) params.append('inventario_id', inventarioId);
      if (filtros?.tipo_movimiento) params.append('tipo_movimiento', filtros.tipo_movimiento);
      if (filtros?.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros?.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
      if (filtros?.pagina) params.append('pagina', filtros.pagina.toString());
      if (filtros?.limite) params.append('limite', filtros.limite.toString());

      const response = await axios.get(`/inventario/movimientos?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      throw error;
    }
  },

  // Crear movimiento de inventario
  async crearMovimiento(data: CrearMovimientoRequest): Promise<{ ok: boolean; data: MovimientoInventario; message?: string }> {
    try {
      const response = await axios.post('/inventario/movimientos', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear movimiento:', error);
      throw error;
    }
  },

  // Obtener alertas de stock
  async obtenerAlertas(filtros?: {
    leida?: boolean;
    tipo_alerta?: 'stock_bajo' | 'stock_agotado' | 'stock_critico';
    pagina?: number;
    limite?: number;
  }): Promise<RespuestaAlertas> {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.leida !== undefined) params.append('leida', filtros.leida.toString());
      if (filtros?.tipo_alerta) params.append('tipo_alerta', filtros.tipo_alerta);
      if (filtros?.pagina) params.append('pagina', filtros.pagina.toString());
      if (filtros?.limite) params.append('limite', filtros.limite.toString());

      const response = await axios.get(`/inventario/alertas?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener alertas:', error);
      throw error;
    }
  },

  // Marcar alerta como leída
  async marcarAlertaLeida(id: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const response = await axios.put(`/inventario/alertas/${id}/leer`);
      return response.data;
    } catch (error) {
      console.error('Error al marcar alerta como leída:', error);
      throw error;
    }
  },

  // Marcar todas las alertas como leídas
  async marcarTodasAlertasLeidas(): Promise<{ ok: boolean; message?: string }> {
    try {
      const response = await axios.put('/inventario/alertas/marcar-todas-leidas');
      return response.data;
    } catch (error) {
      console.error('Error al marcar todas las alertas como leídas:', error);
      throw error;
    }
  },

  // Obtener productos con stock bajo
  async obtenerProductosStockBajo(): Promise<{ ok: boolean; data: InventarioItem[]; message?: string }> {
    try {
      const response = await axios.get('/inventario/stock-bajo');
      return response.data;
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      throw error;
    }
  },

  // Verificar stock disponible para un producto
  async verificarStockDisponible(menuId: string, cantidad: number): Promise<{ ok: boolean; disponible: boolean; stock_actual: number; message?: string }> {
    try {
      const response = await axios.get(`/inventario/verificar-stock/${menuId}?cantidad=${cantidad}`);
      return response.data;
    } catch (error) {
      console.error('Error al verificar stock disponible:', error);
      throw error;
    }
  },

  // Obtener estadísticas de inventario
  async obtenerEstadisticas(): Promise<{
    ok: boolean;
    data: {
      total_productos: number;
      productos_stock_bajo: number;
      productos_agotados: number;
      valor_total_inventario: number;
      movimientos_hoy: number;
      alertas_pendientes: number;
    };
    message?: string;
  }> {
    try {
      const response = await axios.get('/inventario/estadisticas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  },

  // Obtener historial de movimientos por producto
  async obtenerHistorialProducto(menuId: string, filtros?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    tipo_movimiento?: 'entrada' | 'salida' | 'ajuste';
    pagina?: number;
    limite?: number;
  }): Promise<RespuestaMovimientos> {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros?.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
      if (filtros?.tipo_movimiento) params.append('tipo_movimiento', filtros.tipo_movimiento);
      if (filtros?.pagina) params.append('pagina', filtros.pagina.toString());
      if (filtros?.limite) params.append('limite', filtros.limite.toString());

      const response = await axios.get(`/inventario/historial/${menuId}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener historial del producto:', error);
      throw error;
    }
  },

  // Exportar inventario a CSV
  async exportarInventario(filtros?: FiltrosInventario): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros?.estado_stock) params.append('estado_stock', filtros.estado_stock);
      if (filtros?.requiere_inventario !== undefined) params.append('requiere_inventario', filtros.requiere_inventario.toString());
      if (filtros?.activo !== undefined) params.append('activo', filtros.activo.toString());

      const response = await axios.get(`/inventario/exportar?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error al exportar inventario:', error);
      throw error;
    }
  }
};

export default inventarioService;




