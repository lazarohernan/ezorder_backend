import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

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

// Helper para obtener IDs de restaurantes del usuario (cacheado en request)
const getUserRestaurantIds = async (client: any, userId: string, request: FastifyRequest): Promise<string[]> => {
  // Usar cache en el request si ya se obtuvo
  if ((request as any)._restaurantIds) {
    return (request as any)._restaurantIds;
  }

  const { data: userRestaurants } = await client
    .from('usuarios_restaurantes')
    .select('restaurante_id')
    .eq('usuario_id', userId);

  const ids = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
  (request as any)._restaurantIds = ids;
  return ids;
};

// Obtener notificaciones del usuario
export const getNotificaciones = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const {
      leida,
      tipo,
      pagina = 1,
      limite = 10,
      restaurante_id: restauranteIdParam
    } = request.query as {
      leida?: string;
      tipo?: string;
      pagina?: number;
      limite?: number;
      restaurante_id?: string;
    };

    const client = supabaseAdmin || supabase;
    const id_rol = request.user_info?.rol_id ?? 3;

    let query = client
      .from('notificaciones')
      .select('*', { count: 'exact' });

    // Filtrar por restaurante cuando se indica (evita confusión al mezclar varios)
    const idFiltroRestaurante = typeof restauranteIdParam === 'string' ? restauranteIdParam.trim() : null;
    let usarFiltroRestaurante = false;
    if (idFiltroRestaurante) {
      const restaurantIds = id_rol === 1 ? null : await getUserRestaurantIds(client, request.user_info.id, request);
      usarFiltroRestaurante = restaurantIds === null || restaurantIds.includes(idFiltroRestaurante);
    }

    // Filtrar por usuario y rol
    if (usarFiltroRestaurante && idFiltroRestaurante) {
      query = query.or(`usuario_id.eq.${request.user_info.id},restaurante_id.eq.${idFiltroRestaurante}`);
    } else {
      if (id_rol === 1) {
        // Super Admin ve todas las notificaciones
      } else if (id_rol === 2) {
        const restaurantIds = await getUserRestaurantIds(client, request.user_info.id, request);
        if (restaurantIds.length > 0) {
          query = query.or(`usuario_id.eq.${request.user_info.id},restaurante_id.in.(${restaurantIds.join(',')})`);
        } else {
          query = query.eq('usuario_id', request.user_info.id);
        }
      } else {
        query = query.eq('usuario_id', request.user_info.id);
      }
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
      return reply.code(500).send({
        success: false,
        message: 'Error al obtener notificaciones',
        error: error.message
      });
    }

    reply.send({
      success: true,
      data: data || [],
      total: count || 0,
      pagina: Number(pagina),
      limite: Number(limite)
    });

  } catch (error: any) {
    console.error('Error en getNotificaciones:', error);
    throw error;
  }
};

// Marcar notificación como leída
export const marcarNotificacionLeida = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const { id } = request.params as { id: string };
    const client = supabaseAdmin || supabase;
    const id_rol = request.user_info?.rol_id ?? 3;

    // Primero verificar que la notificación pertenezca al usuario o a sus restaurantes
    const { data: notificacion, error: notificacionError } = await client
      .from('notificaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (notificacionError || !notificacion) {
      return reply.code(404).send({
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
        .eq('usuario_id', request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (notificacion.usuario_id !== request.user_info.id &&
          !restaurantIds.includes(notificacion.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: 'No tienes acceso a esta notificación'
        });
      }
    } else {
      // Usuarios normales solo pueden marcar sus notificaciones
      if (notificacion.usuario_id !== request.user_info.id) {
        return reply.code(403).send({
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
      return reply.code(500).send({
        success: false,
        message: 'Error al marcar notificación como leída',
        error: error.message
      });
    }

    reply.send({
      success: true,
      data,
      message: 'Notificación marcada como leída'
    });

  } catch (error: any) {
    console.error('Error en marcarNotificacionLeida:', error);
    throw error;
  }
};

// Marcar todas las notificaciones como leídas
export const marcarTodasNotificacionesLeidas = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const client = supabaseAdmin || supabase;
    const id_rol = request.user_info?.rol_id ?? 3;

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
    } else if (id_rol === 2) {
      // Admin marca sus notificaciones y las de sus restaurantes
      const restaurantIds = await getUserRestaurantIds(client, request.user_info.id, request);

      if (restaurantIds.length > 0) {
        query = query.or(`usuario_id.eq.${request.user_info.id},restaurante_id.in.(${restaurantIds.join(',')})`);
      } else {
        query = query.eq('usuario_id', request.user_info.id);
      }
    } else {
      // Usuarios normales marcan solo sus notificaciones
      query = query.eq('usuario_id', request.user_info.id);
    }

    const { error } = await query;

    if (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
      return reply.code(500).send({
        success: false,
        message: 'Error al marcar todas las notificaciones como leídas',
        error: error.message
      });
    }

    reply.send({
      success: true,
      message: 'Todas las notificaciones han sido marcadas como leídas'
    });

  } catch (error: any) {
    console.error('Error en marcarTodasNotificacionesLeidas:', error);
    throw error;
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
export const deleteNotificacion = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const { id } = request.params as { id: string };
    const client = supabaseAdmin || supabase;
    const id_rol = request.user_info?.rol_id ?? 3;

    // Primero verificar que la notificación pertenezca al usuario
    const { data: notificacion, error: notificacionError } = await client
      .from('notificaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (notificacionError || !notificacion) {
      return reply.code(404).send({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Verificar permisos
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier notificación
    } else {
      // Usuarios normales y Admin solo pueden eliminar sus notificaciones
      if (notificacion.usuario_id !== request.user_info.id) {
        return reply.code(403).send({
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
      return reply.code(500).send({
        success: false,
        message: 'Error al eliminar notificación',
        error: error.message
      });
    }

    reply.send({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });

  } catch (error: any) {
    console.error('Error en deleteNotificacion:', error);
    throw error;
  }
};

// Obtener conteo de notificaciones no leídas
export const getNotificacionesNoLeidasCount = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: 'No se encontró información del usuario autenticado'
      });
    }

    const client = supabaseAdmin || supabase;
    const id_rol = request.user_info?.rol_id ?? 3;

    let query = client
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('leida', false);

    // Filtrar según rol
    if (id_rol === 1) {
      // Super Admin ve todas las no leídas
    } else if (id_rol === 2) {
      // Admin ve sus notificaciones y las de sus restaurantes
      const restaurantIds = await getUserRestaurantIds(client, request.user_info.id, request);

      if (restaurantIds.length > 0) {
        query = query.or(`usuario_id.eq.${request.user_info.id},restaurante_id.in.(${restaurantIds.join(',')})`);
      } else {
        query = query.eq('usuario_id', request.user_info.id);
      }
    } else {
      // Usuarios normales ven solo sus notificaciones
      query = query.eq('usuario_id', request.user_info.id);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error al obtener conteo de notificaciones:', error);
      return reply.code(500).send({
        success: false,
        message: 'Error al obtener conteo de notificaciones',
        error: error.message
      });
    }

    reply.send({
      success: true,
      count: count || 0
    });

  } catch (error: any) {
    console.error('Error en getNotificacionesNoLeidasCount:', error);
    throw error;
  }
};
