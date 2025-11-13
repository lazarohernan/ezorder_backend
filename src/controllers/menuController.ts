import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los menús
export const getMenus = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    const client = supabaseAdmin || supabase;
    const id_rol = req.user_info?.rol_id ?? 3;
    let query = client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante), menu_categorias(id, nombre)")
      .eq("activo", true);

    // Filtrar por restaurante según rol
    if (id_rol === 1) {
      // Super Admin ve todos los menús
    } else if (id_rol === 2) {
      // Admin ve menús de sus restaurantes
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        query = query.in("restaurante_id", restaurantIds);
      } else {
        // Si no tiene restaurantes, devolver vacío
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
    } else {
      // Usuarios normales solo ven menús de su restaurante
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        res.status(403).json({
          success: false,
          message: "El usuario no tiene un restaurante asignado",
        });
        return;
      }
      query = query.eq("restaurante_id", restaurante_id);
    }

    query = query.order("nombre", { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener menús",
    });
    return;
  }
};

// Obtener menús por ID de restaurante
export const getMenusByRestauranteId = async (req: Request, res: Response) => {
  const { restaurante_id } = req.params;

  try {
    console.log(
      `Usuario ${req.user?.id} solicitó los menús del restaurante ${restaurante_id}`
    );

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante), menu_categorias(id, nombre)")
      .eq("restaurante_id", restaurante_id)
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener menús del restaurante",
    });
    return;
  }
};

// Obtener un menú por ID
export const getMenuById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    console.log(`Usuario ${req.user_info.id} solicitó el menú ${id}`);

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante), menu_categorias(id, nombre)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Menú no encontrado",
        });
        return;
      }
      throw error;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede ver cualquier menú
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del menú
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(data.restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este menú",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden ver menús de su restaurante
      if (req.user_info.restaurante_id !== data.restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este menú",
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener menú",
    });
    return;
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
  } = req.body;

  // Verificar campos obligatorios
  if (!restaurante_id || !nombre) {
    res.status(400).json({
      success: false,
      message: "El restaurante_id y nombre son obligatorios",
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

    // Validar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede crear menús en cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const client = supabaseAdmin || supabase;
      const { data: userRestaurants, error: restaurantsError } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      if (restaurantsError) {
        res.status(500).json({
          success: false,
          message: "Error al verificar permisos",
        });
        return;
      }

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden crear menús en su restaurante
      if (req.user_info.restaurante_id !== restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No puedes crear menús para este restaurante",
        });
        return;
      }
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .insert([
        {
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
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Menú creado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    console.error("Error al crear menú:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear menú",
    });
    return;
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
  } = req.body;

  // Verificar que se proporcione al menos un campo para actualizar
  if (
    !restaurante_id &&
    categoria_id === undefined &&
    !num_menu &&
    !nombre &&
    !descripcion &&
    otra_info === undefined &&
    precio === undefined &&
    !imagen &&
    porcentaje_impuesto === undefined &&
    es_para_cocina === undefined &&
    activo === undefined
  ) {
    res.status(400).json({
      success: false,
      message: "Se debe proporcionar al menos un campo para actualizar",
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

    const client = supabaseAdmin || supabase;

    // Primero obtener el menú para verificar permisos
    const { data: menuExistente, error: errorBuscar } = await client
      .from("menu")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !menuExistente) {
      res.status(404).json({
        success: false,
        message: "Menú no encontrado",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier menú
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del menú
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(menuExistente.restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este menú",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden actualizar menús de su restaurante
      if (req.user_info.restaurante_id !== menuExistente.restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este menú",
        });
        return;
      }
    }

    // Prevenir cambio de restaurante_id si se intenta modificar
    if (restaurante_id && restaurante_id !== menuExistente.restaurante_id) {
      res.status(403).json({
        success: false,
        message: "No puedes cambiar el restaurante de un menú",
      });
      return;
    }

    // Crear objeto con solo los campos proporcionados
    const updateFields: any = {};
    if (categoria_id !== undefined) updateFields.categoria_id = categoria_id;
    if (num_menu !== undefined) updateFields.num_menu = num_menu;
    if (nombre) updateFields.nombre = nombre;
    if (descripcion !== undefined) updateFields.descripcion = descripcion;
    if (otra_info !== undefined) updateFields.otra_info = otra_info;
    if (precio !== undefined) updateFields.precio = precio;
    if (imagen !== undefined) updateFields.imagen = imagen;
    if (porcentaje_impuesto !== undefined)
      updateFields.porcentaje_impuesto = porcentaje_impuesto;
    if (es_para_cocina !== undefined)
      updateFields.es_para_cocina = es_para_cocina;
    if (activo !== undefined) updateFields.activo = activo;
    if (es_exento !== undefined) updateFields.es_exento = es_exento;
    if (es_exonerado !== undefined) updateFields.es_exonerado = es_exonerado;

    const { data, error } = await client
      .from("menu")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Menú no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Menú actualizado exitosamente",
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar menú",
    });
    return;
  }
};

// Eliminar un menú
export const deleteMenu = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    const client = supabaseAdmin || supabase;

    // Primero obtener el menú para verificar permisos
    const { data: menuExistente, error: errorBuscar } = await client
      .from("menu")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !menuExistente) {
      res.status(404).json({
        success: false,
        message: "Menú no encontrado",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier menú
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del menú
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(menuExistente.restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este menú",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden eliminar menús de su restaurante
      if (req.user_info.restaurante_id !== menuExistente.restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este menú",
        });
        return;
      }
    }

    // Cambiar el estado activo a false
    const { error } = await client
      .from("menu")
      .update({ activo: false })
      .eq("id", id);

    if (error) {
      if (error.code === "23503") {
        res.status(400).json({
          success: false,
          message:
            "No se puede eliminar este menú porque tiene registros relacionados",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Menú eliminado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar menú",
    });
    return;
  }
};
