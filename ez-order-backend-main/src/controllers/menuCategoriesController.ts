import { Request, Response } from "express";
import { getClientWithRLS } from "../utils/supabaseHelpers";
import { checkRestaurantAccess, getUserRestaurants } from "../utils/restaurantHelpers";

export const getMenuCategories = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = await getClientWithRLS(req);
    const id_rol = req.user_info?.rol_id ?? 3;
    let query = client.from("menu_categorias").select("*");

    // Filtrar por restaurante según rol
    if (id_rol === 1) {
      if (req.query.restaurante_id) {
        query = query.eq("restaurante_id", req.query.restaurante_id);
      }
    } else if (id_rol === 2) {
      const restaurantIds = await getUserRestaurants(client, req.user_info.id);
      
      if (restaurantIds.length > 0) {
        query = query.in("restaurante_id", restaurantIds);
      } else {
        return res.status(200).json({ success: true, data: [] });
      }
    } else {
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          success: false,
          message: "El usuario no tiene un restaurante asignado",
        });
      }
      query = query.eq("restaurante_id", restaurante_id);
    }

    const { data, error } = await query.order("nombre", { ascending: true });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Error al obtener categorías del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener categorías del menú",
    });
  }
};

export const createMenuCategory = async (req: Request, res: Response) => {
  const { nombre, descripcion, restaurante_id: bodyRestauranteId } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({
      success: false,
      message: "El nombre de la categoría es obligatorio",
    });
  }

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para crear categorías",
      });
    }

    const client = await getClientWithRLS(req);
    let restauranteId: string | null = null;

    if (id_rol === 1) {
      restauranteId = bodyRestauranteId || req.user_info.restaurante_id || null;
    } else {
      const restaurantIds = await getUserRestaurants(client, req.user_info.id);
      
      if (restaurantIds.length > 0) {
        restauranteId = bodyRestauranteId || restaurantIds[0];
        
        if (bodyRestauranteId && !restaurantIds.includes(bodyRestauranteId)) {
          return res.status(403).json({
            success: false,
            message: "No tienes permisos para crear categorías en este restaurante",
          });
        }
      } else {
        restauranteId = req.user_info.restaurante_id || null;
      }
    }

    if (!restauranteId) {
      return res.status(403).json({
        success: false,
        message: "El usuario no tiene un restaurante asignado",
      });
    }

    const { data, error } = await client
      .from("menu_categorias")
      .insert([{ nombre: nombre.trim(), descripcion, restaurante_id: restauranteId }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Categoría creada correctamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al crear categoría del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear categoría del menú",
    });
  }
};

export const updateMenuCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  if (!nombre && descripcion === undefined) {
    return res.status(400).json({
      success: false,
      message: "Debes proporcionar al menos un campo para actualizar",
    });
  }

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para actualizar categorías",
      });
    }

    const client = await getClientWithRLS(req);
    const updateFields: Record<string, unknown> = {};
    
    if (nombre !== undefined) updateFields.nombre = nombre;
    if (descripcion !== undefined) updateFields.descripcion = descripcion;

    const { data, error } = await client
      .from("menu_categorias")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Categoría no encontrada",
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Categoría actualizada correctamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al actualizar categoría del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar categoría del menú",
    });
  }
};

export const deleteMenuCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1 && id_rol !== 2) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para eliminar categorías",
      });
    }

    const client = await getClientWithRLS(req);

    // Obtener la categoría para verificar permisos
    const { data: categoria, error: categoriaError } = await client
      .from("menu_categorias")
      .select("id, restaurante_id, nombre")
      .eq("id", id)
      .single();

    if (categoriaError || !categoria) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    // Verificar permisos
    if (id_rol !== 1) {
      const hasAccess = await checkRestaurantAccess(
        client,
        req.user_info.id,
        categoria.restaurante_id,
        id_rol,
        req.user_info.restaurante_id
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para eliminar esta categoría",
        });
      }
    }

    // Verificar y mover productos asociados
    const { data: menuItems } = await client
      .from("menu")
      .select("id")
      .eq("categoria_id", id)
      .eq("restaurante_id", categoria.restaurante_id);

    const productosAsociados = menuItems?.length || 0;

    if (productosAsociados > 0) {
      const { error: updateError } = await client
        .from("menu")
        .update({ categoria_id: null })
        .eq("categoria_id", id)
        .eq("restaurante_id", categoria.restaurante_id);

      if (updateError) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar la categoría porque tiene ${productosAsociados} producto(s) asociado(s) que no se pudieron mover automáticamente.`,
          productosAsociados,
        });
      }
    }

    // Eliminar la categoría
    const { error: deleteError } = await client
      .from("menu_categorias")
      .delete()
      .eq("id", id)
      .eq("restaurante_id", categoria.restaurante_id);

    if (deleteError) {
      if (deleteError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Categoría no encontrada",
        });
      }
      throw deleteError;
    }

    res.status(200).json({
      success: true,
      message: productosAsociados > 0
        ? `Categoría eliminada correctamente. ${productosAsociados} producto(s) fueron movidos a "Sin categoría".`
        : "Categoría eliminada correctamente",
      productosMovidos: productosAsociados,
    });
  } catch (error: any) {
    console.error("Error al eliminar categoría del menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar categoría del menú",
    });
  }
};

