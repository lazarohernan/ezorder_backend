import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";
import "../types/express"; // Importar tipos personalizados

// Interfaces
interface Notificacion {
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
  datos_adicionales?: Record<string, any>;
  acciones?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary';
    action: string;
  }>;
}

// Obtener notificaciones del usuario
export const getNotificaciones = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const {
      leida,
      tipo,
      pagina = 1,
      limite = 10
    } = req.query;

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    let query = client
      .from('notificaciones')
      .select('*', { count: 'exact' });

    // Filtrar por usuario y rol
    if (id_rol === 1) {
      // Super Admin ve todas las notificaciones
      // No aplicamos filtro de usuario específico
    } else if (id_rol === 2) {
      // Admin ve sus notificaciones y las de sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        // Usar formato correcto para OR en Supabase
        query = query.or(`usuario_id.eq.${req.user_info.id},and(restaurante_id.in.(${restaurantIds.join(',')}),usuario_id.neq.${req.user_info.id})`);
      } else {
        query = query.eq('usuario_id', req.user_info.id);
      }
    } else {
      // Usuarios normales solo ven sus notificaciones
      query = query.eq('usuario_id', req.user_info.id);
    }

    // Aplicar filtros adicionales
    if (leida !== undefined) {
      query = query.eq('leida', leida === 'true');
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    // Paginación
    const offset = (Number(pagina) - 1) * Number(limite);
    query = query.range(offset, offset + Number(limite) - 1);

    // Ordenar por fecha de creación
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error al obtener notificaciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener notificaciones',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: data || [],
      total: count || 0,
      pagina: Number(pagina),
      limite: Number(limite)
    });

  } catch (error: any) {
    console.error('Error en getNotificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Marcar notificación como leída
export const marcarNotificacionLeida = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const { id } = req.params;
    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    // Primero verificar que la notificación pertenezca al usuario o a sus restaurantes
    const { data: notificacion, error: notificacionError } = await client
      .from('notificaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (notificacionError || !notificacion) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Verificar permisos
    if (id_rol === 1) {
      // Super Admin puede marcar cualquier notificación
    } else if (id_rol === 2) {
      // Admin solo puede marcar notificaciones suyas o de sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);
      
      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (notificacion.usuario_id !== req.user_info.id && 
          !restaurantIds.includes(notificacion.restaurante_id)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a esta notificación'
        });
      }
    } else {
      // Usuarios normales solo pueden marcar sus notificaciones
      if (notificacion.usuario_id !== req.user_info.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a esta notificación'
        });
      }
    }

    // Marcar como leída
    const { data, error } = await client
      .from('notificaciones')
      .update({
        leida: true,
        leida_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al marcar notificación como leída:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al marcar notificación como leída',
        error: error.message
      });
    }

    res.json({
      success: true,
      data,
      message: 'Notificación marcada como leída'
    });

  } catch (error: any) {
    console.error('Error en marcarNotificacionLeida:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Marcar todas las notificaciones como leídas
export const marcarTodasNotificacionesLeidas = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    let query = client
      .from('notificaciones')
      .update({
        leida: true,
        leida_at: new Date().toISOString()
      })
      .eq('leida', false);

    // Filtrar según rol
    if (id_rol === 1) {
      // Super Admin marca todas las no leídas
      // No aplicamos filtro adicional
    } else if (id_rol === 2) {
      // Admin marca sus notificaciones y las de sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        // Usar formato correcto para OR en Supabase
        query = query.or(`usuario_id.eq.${req.user_info.id},and(restaurante_id.in.(${restaurantIds.join(',')}),usuario_id.neq.${req.user_info.id})`);
      } else {
        query = query.eq('usuario_id', req.user_info.id);
      }
    } else {
      // Usuarios normales marcan solo sus notificaciones
      query = query.eq('usuario_id', req.user_info.id);
    }

    const { error } = await query;

    if (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al marcar todas las notificaciones como leídas',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Todas las notificaciones han sido marcadas como leídas'
    });

  } catch (error: any) {
    console.error('Error en marcarTodasNotificacionesLeidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear notificación (para uso interno del sistema)
export const createNotificacion = async (
  usuario_id: string,
  tipo: Notificacion['tipo'],
  titulo: string,
  mensaje: string,
  restaurante_id?: string,
  datos_adicionales?: Record<string, any>,
  acciones?: Notificacion['acciones']
) => {
  try {
    const client = supabaseAdmin || supabase;
    
    const { data, error } = await client
      .from('notificaciones')
      .insert({
        usuario_id,
        restaurante_id,
        tipo,
        titulo,
        mensaje,
        datos_adicionales,
        acciones
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear notificación:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en createNotificacion:', error);
    return null;
  }
};

// Eliminar notificación
export const deleteNotificacion = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const { id } = req.params;
    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    // Primero verificar que la notificación pertenezca al usuario
    const { data: notificacion, error: notificacionError } = await client
      .from('notificaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (notificacionError || !notificacion) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Verificar permisos
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier notificación
    } else {
      // Usuarios normales y Admin solo pueden eliminar sus notificaciones
      if (notificacion.usuario_id !== req.user_info.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a esta notificación'
        });
      }
    }

    // Eliminar notificación
    const { error } = await client
      .from('notificaciones')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar notificación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar notificación',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });

  } catch (error: any) {
    console.error('Error en deleteNotificacion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener conteo de notificaciones no leídas
export const getNotificacionesNoLeidasCount = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;

    let query = client
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('leida', false);

    // Filtrar según rol
    if (id_rol === 1) {
      // Super Admin ve todas las no leídas
      // No aplicamos filtro adicional
    } else if (id_rol === 2) {
      // Admin ve sus notificaciones y las de sus restaurantes
      const { data: userRestaurants } = await client
        .from('usuarios_restaurantes')
        .select('restaurante_id')
        .eq('usuario_id', req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        // Usar formato correcto para OR en Supabase
        query = query.or(`usuario_id.eq.${req.user_info.id},and(restaurante_id.in.(${restaurantIds.join(',')}),usuario_id.neq.${req.user_info.id})`);
      } else {
        query = query.eq('usuario_id', req.user_info.id);
      }
    } else {
      // Usuarios normales ven solo sus notificaciones
      query = query.eq('usuario_id', req.user_info.id);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error al obtener conteo de notificaciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener conteo de notificaciones',
        error: error.message
      });
    }

    res.json({
      success: true,
      count: count || 0
    });

  } catch (error: any) {
    console.error('Error en getNotificacionesNoLeidasCount:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};
