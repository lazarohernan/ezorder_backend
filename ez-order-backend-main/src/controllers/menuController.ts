import { Request, Response } from "express";
import { getClientWithRLS } from "../utils/supabaseHelpers";
import { cleanUUID, checkRestaurantAccess } from "../utils/restaurantHelpers";

// Obtener todos los menús
export const getMenus = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = await getClientWithRLS(req);
    const id_rol = req.user_info?.rol_id ?? 3;
    let query = client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante), menu_categorias(id, nombre)")
      .eq("activo", true);

    // Filtrar por restaurante según rol
    if (id_rol === 2) {
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        query = query.in("restaurante_id", restaurantIds);
      } else {
        return res.status(200).json({ success: true, data: [] });
      }
    } else if (id_rol !== 1) {
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
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener menús",
    });
  }
};

// Obtener menús por ID de restaurante
export const getMenusByRestauranteId = async (req: Request, res: Response) => {
  const { restaurante_id } = req.params;

  try {
    const client = await getClientWithRLS(req);
    const { data, error } = await client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante), menu_categorias(id, nombre)")
      .eq("restaurante_id", restaurante_id)
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener menús del restaurante",
    });
  }
};

// Obtener un menú por ID
export const getMenuById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = await getClientWithRLS(req);
    const { data, error } = await client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante), menu_categorias(id, nombre)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Menú no encontrado",
        });
      }
      throw error;
    }

    // Verificar permisos
    const hasAccess = await checkRestaurantAccess(
      client,
      req.user_info.id,
      data.restaurante_id,
      req.user_info?.rol_id ?? 3,
      req.user_info.restaurante_id
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a este menú",
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener menú",
    });
  }
};

// Crear un nuevo menú
export const createMenu = async (req: Request, res: Response) => {
  const {
    restaurante_id,
    categoria_id,
    num_menu,
    nombre,
    descripcion,
    otra_info,
    precio,
    imagen,
    porcentaje_impuesto,
    es_para_cocina,
    activo,
    es_exento,
    es_exonerado,
    requiere_inventario,
  } = req.body;

  const cleanRestauranteId = cleanUUID(restaurante_id);
  const cleanCategoriaId = cleanUUID(categoria_id);
  
  // Validar campos obligatorios
  if (!cleanRestauranteId || !nombre?.trim()) {
    return res.status(400).json({
      success: false,
      message: "El restaurante_id y nombre son obligatorios",
    });
  }

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = await getClientWithRLS(req);
    const id_rol = req.user_info?.rol_id ?? 3;

    // Verificar permisos
    if (id_rol !== 1) {
      const hasAccess = await checkRestaurantAccess(
        client,
        req.user_info.id,
        cleanRestauranteId,
        id_rol,
        req.user_info.restaurante_id
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: id_rol === 2 
            ? "No tienes acceso a este restaurante"
            : "No puedes crear menús para este restaurante",
        });
      }
    }

    // Construir objeto de inserción
    const insertData: any = {
      restaurante_id: cleanRestauranteId,
      nombre: nombre.trim(),
      categoria_id: cleanCategoriaId,
    };

    // Agregar campos opcionales solo si tienen valor
    if (num_menu?.trim()) insertData.num_menu = num_menu.trim();
    if (descripcion?.trim()) insertData.descripcion = descripcion.trim();
    if (otra_info?.trim()) insertData.otra_info = otra_info.trim();
    if (imagen?.trim()) insertData.imagen = imagen.trim();
    
    if (precio !== undefined && precio !== null && precio !== '') {
      insertData.precio = Number(precio);
    }
    if (porcentaje_impuesto !== undefined && porcentaje_impuesto !== null && porcentaje_impuesto !== '') {
      insertData.porcentaje_impuesto = Number(porcentaje_impuesto);
    }
    
    if (es_para_cocina !== undefined) insertData.es_para_cocina = Boolean(es_para_cocina);
    if (activo !== undefined) insertData.activo = Boolean(activo);
    if (es_exento !== undefined) insertData.es_exento = Boolean(es_exento);
    if (es_exonerado !== undefined) insertData.es_exonerado = Boolean(es_exonerado);
    if (requiere_inventario !== undefined) insertData.requiere_inventario = Boolean(requiere_inventario);
    
    const { data, error } = await client
      .from("menu")
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Menú creado exitosamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al crear menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear menú",
    });
  }
};

// Actualizar un menú
export const updateMenu = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    restaurante_id,
    categoria_id,
    num_menu,
    nombre,
    descripcion,
    otra_info,
    precio,
    imagen,
    porcentaje_impuesto,
    es_para_cocina,
    activo,
    es_exento,
    es_exonerado,
    requiere_inventario,
  } = req.body;

  // Verificar que se proporcione al menos un campo para actualizar
  const hasFields = [
    restaurante_id, categoria_id, num_menu, nombre, descripcion,
    otra_info, precio, imagen, porcentaje_impuesto, es_para_cocina,
    activo, es_exento, es_exonerado, requiere_inventario
  ].some(field => field !== undefined);

  if (!hasFields) {
    return res.status(400).json({
      success: false,
      message: "Se debe proporcionar al menos un campo para actualizar",
    });
  }

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = await getClientWithRLS(req);

    // Obtener el menú existente para verificar permisos
    const { data: menuExistente, error: errorBuscar } = await client
      .from("menu")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !menuExistente) {
      return res.status(404).json({
        success: false,
        message: "Menú no encontrado",
      });
    }

    // Verificar permisos
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      const hasAccess = await checkRestaurantAccess(
        client,
        req.user_info.id,
        menuExistente.restaurante_id,
        id_rol,
        req.user_info.restaurante_id
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "No tienes acceso a este menú",
        });
      }
    }

    // Prevenir cambio de restaurante_id
    if (restaurante_id && restaurante_id !== menuExistente.restaurante_id) {
      return res.status(403).json({
        success: false,
        message: "No puedes cambiar el restaurante de un menú",
      });
    }

    // Construir objeto de actualización
    const updateFields: any = {};
    
    if (restaurante_id !== undefined) {
      const cleanRestauranteId = cleanUUID(restaurante_id);
      if (cleanRestauranteId) updateFields.restaurante_id = cleanRestauranteId;
    }
    if (categoria_id !== undefined) {
      updateFields.categoria_id = cleanUUID(categoria_id);
    }
    if (num_menu !== undefined) updateFields.num_menu = num_menu;
    if (nombre !== undefined) updateFields.nombre = nombre;
    if (descripcion !== undefined) updateFields.descripcion = descripcion;
    if (otra_info !== undefined) updateFields.otra_info = otra_info;
    if (precio !== undefined) updateFields.precio = precio;
    if (imagen !== undefined) updateFields.imagen = imagen;
    if (porcentaje_impuesto !== undefined) updateFields.porcentaje_impuesto = porcentaje_impuesto;
    if (es_para_cocina !== undefined) updateFields.es_para_cocina = es_para_cocina;
    if (activo !== undefined) updateFields.activo = activo;
    if (es_exento !== undefined) updateFields.es_exento = es_exento;
    if (es_exonerado !== undefined) updateFields.es_exonerado = es_exonerado;
    if (requiere_inventario !== undefined) updateFields.requiere_inventario = requiere_inventario;

    const { data, error } = await client
      .from("menu")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Menú no encontrado",
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Menú actualizado exitosamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al actualizar menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar menú",
    });
  }
};

// Eliminar un menú
export const deleteMenu = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = await getClientWithRLS(req);

    // Obtener el menú existente para verificar permisos
    const { data: menuExistente, error: errorBuscar } = await client
      .from("menu")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !menuExistente) {
      return res.status(404).json({
        success: false,
        message: "Menú no encontrado",
      });
    }

    // Verificar permisos
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      const hasAccess = await checkRestaurantAccess(
        client,
        req.user_info.id,
        menuExistente.restaurante_id,
        id_rol,
        req.user_info.restaurante_id
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "No tienes acceso a este menú",
        });
      }
    }

    // Verificar pedidos asociados
    const { data: pedidosAsociados } = await client
      .from("pedido_items")
      .select("id")
      .eq("menu_id", id);

    const cantidadPedidos = pedidosAsociados?.length || 0;

    // Eliminar el producto
    const { error } = await client
      .from("menu")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return res.status(400).json({
          success: false,
          message: "No se puede eliminar este producto porque tiene registros relacionados",
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: cantidadPedidos > 0
        ? `Producto eliminado completamente del sistema. El historial se mantiene en ${cantidadPedidos} pedido(s) asociado(s).`
        : "Producto eliminado completamente del sistema",
      pedidosAfectados: cantidadPedidos,
    });
  } catch (error: any) {
    console.error("Error al eliminar menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar menú",
    });
  }
};
