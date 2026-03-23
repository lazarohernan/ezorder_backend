import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

export const getMenuCategories = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Diagnostic info para el usuario
    const diagnostic: any = {
      user_info: _request.user_info,
      restauranteId: _request.user_info?.restaurante_id,
      client_type: (supabaseAdmin || supabase) === supabaseAdmin ? 'supabaseAdmin' : 'supabase'
    };

    if (!_request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
        diagnostic
      });
    }

    // Obtener el restaurante_id del usuario autenticado
    const restauranteId = _request.user_info.restaurante_id;

    if (!restauranteId) {
      return reply.code(403).send({
        success: false,
        message: "El usuario no tiene un restaurante asignado",
        diagnostic
      });
    }

    // Usar supabaseAdmin para evitar problemas con RLS
    // El filtrado se hace manualmente por restaurante_id
    const client = supabaseAdmin || supabase;

    const { data, error } = await client
      .from("menu_categorias")
      .select("*")
      .order("nombre", { ascending: true });

    // Filtrado manual forzado ya que supabaseAdmin ignora RLS
    const filteredData = data?.filter(cat => cat.restaurante_id === restauranteId) || [];

    // Agregar info de diagnóstico a la respuesta
    diagnostic.data_length = data?.length || 0;
    diagnostic.data = data;
    diagnostic.error = error;
    diagnostic.filtered_data_length = filteredData.length;
    diagnostic.filtered_data = filteredData;
    diagnostic.restaurante_buscado = restauranteId;

    if (error) {
      return reply.code(500).send({
        success: false,
        message: error.message || "Error al obtener categorías del menú",
        diagnostic
      });
    }

    return reply.code(200).send({
      success: true,
      data: filteredData,
      diagnostic
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener categorías del menú",
      diagnostic: {
        error: error,
        stack: error.stack
      }
    });
  }
};

export const createMenuCategory = async (request: FastifyRequest, reply: FastifyReply) => {
  const { nombre, descripcion } = (request.body as any);

  if (!nombre) {
    return reply.code(400).send({
      success: false,
      message: "El nombre de la categoría es obligatorio",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Solo Super Admin y Admin pueden crear categorías
    const id_rol = request.user_info?.rol_id ?? 3;
    const hasCustomRole = request.user_info?.rol_personalizado_id;

    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return reply.code(403).send({
        success: false,
        message: "No tienes permisos para crear categorías",
      });
    }

    // Obtener el restaurante_id del usuario autenticado
    const restauranteId = request.user_info.restaurante_id;

    if (!restauranteId) {
      return reply.code(403).send({
        success: false,
        message: "El usuario no tiene un restaurante asignado",
      });
    }

    const client = supabaseAdmin || supabase;

    // Establecer el contexto del restaurante para RLS
    await client.rpc('set_restaurant_context', { restaurant_id: restauranteId });

    const { data, error } = await client
      .from("menu_categorias")
      .insert([{ nombre, descripcion, restaurante_id: restauranteId }])
      .select()
      .single();

    if (error) throw error;

    return reply.code(201).send({
      success: true,
      message: "Categoría creada correctamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al crear categoría del menú:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al crear categoría del menú",
    });
  }
};

export const updateMenuCategory = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);
  const { nombre, descripcion } = (request.body as any);

  if (!nombre && descripcion === undefined) {
    return reply.code(400).send({
      success: false,
      message: "Debes proporcionar al menos un campo para actualizar",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Solo Super Admin y Admin pueden actualizar categorías
    const id_rol = request.user_info?.rol_id ?? 3;
    const hasCustomRole = request.user_info?.rol_personalizado_id;

    if (id_rol !== 1 && id_rol !== 2 && !hasCustomRole) {
      return reply.code(403).send({
        success: false,
        message: "No tienes permisos para actualizar categorías",
      });
    }

    // Obtener el restaurante_id del usuario autenticado
    const restauranteId = request.user_info.restaurante_id;

    if (!restauranteId) {
      return reply.code(403).send({
        success: false,
        message: "El usuario no tiene un restaurante asignado",
      });
    }

    const updateFields: Record<string, unknown> = {};
    if (nombre !== undefined) updateFields.nombre = nombre;
    if (descripcion !== undefined) updateFields.descripcion = descripcion;

    const client = supabaseAdmin || supabase;

    // Establecer el contexto del restaurante para RLS
    await client.rpc('set_restaurant_context', { restaurant_id: restauranteId });

    const { data, error } = await client
      .from("menu_categorias")
      .update(updateFields)
      .eq("id", id)
      .eq("restaurante_id", restauranteId) // Solo puede actualizar categorías de su restaurante
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Categoría no encontrada o no tienes permisos para editarla",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      message: "Categoría actualizada correctamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al actualizar categoría del menú:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al actualizar categoría del menú",
    });
  }
};

export const deleteMenuCategory = async (request: FastifyRequest, reply: FastifyReply) => {
  console.log('🔥 deleteMenuCategory llamado (CÓDIGO NUEVO CARGADO)');
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Obtener el restaurante_id del usuario autenticado
    const restauranteId = request.user_info.restaurante_id;

    if (!restauranteId) {
      return reply.code(403).send({
        success: false,
        message: "El usuario no tiene un restaurante asignado",
      });
    }

    const client = supabaseAdmin || supabase;

    // Primero verificar si la categoría existe y pertenece al restaurante
    const { data: categoria, error: categoriaError } = await client
      .from("menu_categorias")
      .select("*")
      .eq("id", id)
      .eq("restaurante_id", restauranteId)
      .single();

    if (categoriaError || !categoria) {
      return reply.code(404).send({
        success: false,
        message: "Categoría no encontrada o no tienes permisos para eliminarla",
      });
    }

    // Mover productos asociados a "Sin categoría" (categoria_id = null)
    const { error: updateError } = await client
      .from("menu")
      .update({ categoria_id: null })
      .eq("categoria_id", id)
      .eq("restaurante_id", restauranteId);

    if (updateError) {
      console.error("Error al mover productos:", updateError);
      // Si no se pueden mover los productos, no eliminar la categoría
      return reply.code(400).send({
        success: false,
        message: "No se puede eliminar la categoría porque tiene productos asociados que no se pueden mover",
      });
    }

    // Ahora eliminar la categoría
    const { error: deleteError } = await client
      .from("menu_categorias")
      .delete()
      .eq("id", id)
      .eq("restaurante_id", restauranteId);

    if (deleteError) {
      console.error("Error al eliminar categoría:", deleteError);
      return reply.code(500).send({
        success: false,
        message: "Error al eliminar la categoría",
      });
    }

    return reply.code(200).send({
      success: true,
      message: "✅ Categoría eliminada correctamente. Los productos asociados se movieron a 'Sin categoría' (BACKEND MODIFICADO)",
    });
  } catch (error: any) {
    console.error("Error al eliminar categoría del menú:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al eliminar categoría del menú",
    });
  }
};
