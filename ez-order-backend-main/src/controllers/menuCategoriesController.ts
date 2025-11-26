import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";
import "../types/express"; // Importar tipos personalizados

export const getMenuCategories = async (_req: Request, res: Response) => {
  try {
    // Diagnostic info para el usuario
    const diagnostic: any = {
      user_info: _req.user_info,
      restauranteId: _req.user_info?.restaurante_id,
      client_type: (supabaseAdmin || supabase) === supabaseAdmin ? 'supabaseAdmin' : 'supabase'
    };
    
    if (!_req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
        diagnostic
      });
    }

    // Obtener el restaurante_id del usuario autenticado
    const restauranteId = _req.user_info.restaurante_id;
    
    if (!restauranteId) {
      return res.status(403).json({
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
      return res.status(500).json({
        success: false,
        message: error.message || "Error al obtener categorías del menú",
        diagnostic
      });
    }

    res.status(200).json({
      success: true,
      data: filteredData,
      diagnostic
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener categorías del menú",
      diagnostic: {
        error: error,
        stack: error.stack
      }
    });
    return;
  }
};

export const createMenuCategory = async (req: Request, res: Response) => {
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    res.status(400).json({
      success: false,
      message: "El nombre de la categoría es obligatorio",
    });
    return;
  }

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    // Solo Super Admin y Admin pueden crear categorías
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      res.status(403).json({
        success: false,
        message: "No tienes permisos para crear categorías",
      });
      return;
    }

    // Obtener el restaurante_id del usuario autenticado
    const restauranteId = req.user_info.restaurante_id;
    
    if (!restauranteId) {
      return res.status(403).json({
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

    res.status(201).json({
      success: true,
      message: "Categoría creada correctamente",
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al crear categoría del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear categoría del menú",
    });
    return;
  }
};

export const updateMenuCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  if (!nombre && descripcion === undefined) {
    res.status(400).json({
      success: false,
      message: "Debes proporcionar al menos un campo para actualizar",
    });
    return;
  }

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    // Solo Super Admin y Admin pueden actualizar categorías
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      res.status(403).json({
        success: false,
        message: "No tienes permisos para actualizar categorías",
      });
      return;
    }

    // Obtener el restaurante_id del usuario autenticado
    const restauranteId = req.user_info.restaurante_id;
    
    if (!restauranteId) {
      return res.status(403).json({
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
        res.status(404).json({
          success: false,
          message: "Categoría no encontrada o no tienes permisos para editarla",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Categoría actualizada correctamente",
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al actualizar categoría del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar categoría del menú",
    });
    return;
  }
};

export const deleteMenuCategory = async (req: Request, res: Response) => {
  console.log('🔥 deleteMenuCategory llamado (CÓDIGO NUEVO CARGADO)');
  const { id } = req.params;

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    // Obtener el restaurante_id del usuario autenticado
    const restauranteId = req.user_info.restaurante_id;
    
    if (!restauranteId) {
      res.status(403).json({
        success: false,
        message: "El usuario no tiene un restaurante asignado",
      });
      return;
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
      res.status(404).json({
        success: false,
        message: "Categoría no encontrada o no tienes permisos para eliminarla",
      });
      return;
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
      res.status(400).json({
        success: false,
        message: "No se puede eliminar la categoría porque tiene productos asociados que no se pueden mover",
      });
      return;
    }

    // Ahora eliminar la categoría
    const { error: deleteError } = await client
      .from("menu_categorias")
      .delete()
      .eq("id", id)
      .eq("restaurante_id", restauranteId);

    if (deleteError) {
      console.error("Error al eliminar categoría:", deleteError);
      res.status(500).json({
        success: false,
        message: "Error al eliminar la categoría",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "✅ Categoría eliminada correctamente. Los productos asociados se movieron a 'Sin categoría' (BACKEND MODIFICADO)",
    });
    return;
  } catch (error: any) {
    console.error("Error al eliminar categoría del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar categoría del menú",
    });
    return;
  }
};
