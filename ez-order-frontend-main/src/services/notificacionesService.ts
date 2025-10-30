import { api } from '@/plugins/axios';

// Tipos para notificaciones
export interface NotificacionAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
  action: string;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  restaurante_id?: string;
  tipo: 'order' | 'system' | 'user' | 'payment' | 'warning' | 'stock' | 'gasto';
  titulo: string;
  mensaje: string;
  leida: boolean;
  leida_at?: string;
  created_at: string;
  updated_at: string;
  datos_adicionales?: Record<string, unknown>;
  acciones?: NotificacionAction[];
}

export interface NotificacionesResponse {
  success: boolean;
  data: Notificacion[];
  total: number;
  pagina: number;
  limite: number;
}

export interface NotificacionesCountResponse {
  success: boolean;
  count: number;
}

class NotificacionesService {
  // Obtener notificaciones del usuario
  async getNotificaciones(params?: {
    leida?: boolean;
    tipo?: string;
    pagina?: number;
    limite?: number;
  }): Promise<NotificacionesResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.leida !== undefined) {
      queryParams.append('leida', params.leida.toString());
    }
    if (params?.tipo) {
      queryParams.append('tipo', params.tipo);
    }
    if (params?.pagina) {
      queryParams.append('pagina', params.pagina.toString());
    }
    if (params?.limite) {
      queryParams.append('limite', params.limite.toString());
    }

    const url = queryParams.toString() 
      ? `/notificaciones?${queryParams.toString()}`
      : '/notificaciones';

    const response = await api.get(url);
    return response.data;
  }

  // Obtener conteo de notificaciones no leídas
  async getNotificacionesNoLeidasCount(): Promise<NotificacionesCountResponse> {
    const response = await api.get('/notificaciones/no-leidas/count');
    return response.data;
  }

  // Marcar notificación como leída
  async marcarNotificacionLeida(id: string): Promise<{ success: boolean; data: Notificacion; message: string }> {
    const response = await api.put(`/notificaciones/${id}/leida`);
    return response.data;
  }

  // Marcar todas las notificaciones como leídas
  async marcarTodasNotificacionesLeidas(): Promise<{ success: boolean; message: string }> {
    const response = await api.put('/notificaciones/marcar-todas-leidas');
    return response.data;
  }

  // Eliminar notificación
  async deleteNotificacion(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/notificaciones/${id}`);
    return response.data;
  }

  // Crear notificación (solo para uso interno del sistema)
  async createNotificacion(data: {
    usuario_id: string;
    tipo: Notificacion['tipo'];
    titulo: string;
    mensaje: string;
    restaurante_id?: string;
    datos_adicionales?: Record<string, unknown>;
    acciones?: NotificacionAction[];
  }): Promise<Notificacion | null> {
    try {
      const response = await api.post('/notificaciones', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear notificación:', error);
      return null;
    }
  }

  // Métodos de utilidad para el frontend

  // Formatear tiempo relativo
  formatTimeRelativo(dateString: string | null | undefined): string {
    if (!dateString) return 'Sin fecha';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'ahora';
    } else if (minutes < 60) {
      return `hace ${minutes}m`;
    } else if (hours < 24) {
      return `hace ${hours}h`;
    } else if (days < 7) {
      return `hace ${days}d`;
    } else {
      return date.toLocaleDateString('es-HN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        timeZone: 'America/Tegucigalpa'
      });
    }
  }

  // Obtener color de fondo según tipo
  getNotificationIconBg(tipo: string): string {
    const colors = {
      order: 'bg-orange-100',
      system: 'bg-orange-200',
      user: 'bg-orange-100',
      payment: 'bg-orange-200',
      warning: 'bg-orange-300',
      stock: 'bg-red-100',
      gasto: 'bg-blue-100'
    };
    return colors[tipo as keyof typeof colors] || 'bg-orange-100';
  }

  // Obtener color de icono según tipo
  getNotificationIconColor(tipo: string): string {
    const colors = {
      order: 'text-orange-600',
      system: 'text-orange-700',
      user: 'text-orange-600',
      payment: 'text-orange-700',
      warning: 'text-orange-800',
      stock: 'text-red-600',
      gasto: 'text-blue-600'
    };
    return colors[tipo as keyof typeof colors] || 'text-orange-600';
  }

  // Obtener path del icono según tipo
  getNotificationIconPath(tipo: string): string {
    const paths = {
      order: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      system: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      payment: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
      stock: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      gasto: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    };
    return paths[tipo as keyof typeof paths] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
}

export default new NotificacionesService();
