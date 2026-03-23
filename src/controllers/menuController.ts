import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

type MenuConsumoInput = {
  inventario_id: string;
  cantidad: number;
};

const getMenuWithAccess = async (request: FastifyRequest, menuId: string) => {
  if (!request.user_info) {
    return {
      ok: false,
      status: 403,
      message: "No se encontró información del usuario autenticado",
    } as const;
  }

  const client = supabaseAdmin || supabase;
  const { data: menuData, error } = await client
    .from("menu")
    .select("id, restaurante_id")
    .eq("id", menuId)
    .single();

  if (error || !menuData) {
    return { ok: false, status: 404, message: "Menú no encontrado" } as const;
  }

  const id_rol = request.user_info?.rol_id ?? 3;
  if (id_rol === 1) {
    return { ok: true, menu: menuData, client } as const;
  }

  if (id_rol === 2) {
    const { data: userRestaurants } = await client
      .from("usuarios_restaurantes")
      .select("restaurante_id")
      .eq("usuario_id", request.user_info.id);

    const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
    if (!restaurantIds.includes(menuData.restaurante_id)) {
      return { ok: false, status: 403, message: "No tienes acceso a este menú" } as const;
    }
    return { ok: true, menu: menuData, client } as const;
  }

  if (request.user_info.restaurante_id !== menuData.restaurante_id) {
    return { ok: false, status: 403, message: "No tienes acceso a este menú" } as const;
  }

  return { ok: true, menu: menuData, client } as const;
};

// Obtener todos los menús
export const getMenus = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = supabaseAdmin || supabase;
    const id_rol = request.user_info?.rol_id ?? 3;
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
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (restaurantIds.length > 0) {
        query = query.in("restaurante_id", restaurantIds);
      } else {
        // Si no tiene restaurantes, devolver vacío
        return reply.code(200).send({
          success: true,
          data: [],
        });
      }
    } else {
      // Usuarios normales solo ven menús de su restaurante
      const restaurante_id = request.user_info?.restaurante_id;
      if (!restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "El usuario no tiene un restaurante asignado",
        });
      }
      query = query.eq("restaurante_id", restaurante_id);
    }

    query = query.order("nombre", { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener menús",
    });
  }
};

// Obtener menús por ID de restaurante
export const getMenusByRestauranteId = async (request: FastifyRequest, reply: FastifyReply) => {
  const { restaurante_id } = (request.params as any);

  try {
    console.log(
      `Usuario ${(request.user_info as any)?.id} solicitó los menús del restaurante ${restaurante_id}`
    );

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante), menu_categorias(id, nombre)")
      .eq("restaurante_id", restaurante_id)
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener menús del restaurante",
    });
  }
};

// Obtener un menú por ID
export const getMenuById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    console.log(`Usuario ${request.user_info.id} solicitó el menú ${id}`);

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .select("*, restaurantes(id, nombre_restaurante), menu_categorias(id, nombre)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Menú no encontrado",
        });
      }
      throw error;
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede ver cualquier menú
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del menú
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(data.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este menú",
        });
      }
    } else {
      // Usuarios normales solo pueden ver menús de su restaurante
      if (request.user_info.restaurante_id !== data.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este menú",
        });
      }
    }

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener menú",
    });
  }
};

// Crear un nuevo menú
export const createMenu = async (request: FastifyRequest, reply: FastifyReply) => {
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
  } = (request.body as any);

  // Verificar campos obligatorios
  if (!restaurante_id || !nombre) {
    return reply.code(400).send({
      success: false,
      message: "El restaurante_id y nombre son obligatorios",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Validar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede crear menús en cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const client = supabaseAdmin || supabase;
      const { data: userRestaurants, error: restaurantsError } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      if (restaurantsError) {
        return reply.code(500).send({
          success: false,
          message: "Error al verificar permisos",
        });
      }

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
      }
    } else {
      // Usuarios normales solo pueden crear menús en su restaurante
      if (request.user_info.restaurante_id !== restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No puedes crear menús para este restaurante",
        });
      }
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("menu")
      .insert([
        {
          restaurante_id,
          categoria_id: categoria_id || null, // Convertir string vacío a null
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

    return reply.code(201).send({
      success: true,
      message: "Menú creado exitosamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al crear menú:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al crear menú",
    });
  }
};

// Actualizar un menú
export const updateMenu = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);
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
  } = (request.body as any);

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
    return reply.code(400).send({
      success: false,
      message: "Se debe proporcionar al menos un campo para actualizar",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = supabaseAdmin || supabase;

    // Primero obtener el menú para verificar permisos
    const { data: menuExistente, error: errorBuscar } = await client
      .from("menu")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !menuExistente) {
      return reply.code(404).send({
        success: false,
        message: "Menú no encontrado",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier menú
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del menú
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(menuExistente.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este menú",
        });
      }
    } else {
      // Usuarios normales solo pueden actualizar menús de su restaurante
      if (request.user_info.restaurante_id !== menuExistente.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este menú",
        });
      }
    }

    // Prevenir cambio de restaurante_id si se intenta modificar
    if (restaurante_id && restaurante_id !== menuExistente.restaurante_id) {
      return reply.code(403).send({
        success: false,
        message: "No puedes cambiar el restaurante de un menú",
      });
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
        return reply.code(404).send({
          success: false,
          message: "Menú no encontrado",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      message: "Menú actualizado exitosamente",
      data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al actualizar menú",
    });
  }
};

// Eliminar un menú
export const deleteMenu = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = supabaseAdmin || supabase;

    // Primero obtener el menú para verificar permisos
    const { data: menuExistente, error: errorBuscar } = await client
      .from("menu")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !menuExistente) {
      return reply.code(404).send({
        success: false,
        message: "Menú no encontrado",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier menú
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del menú
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(menuExistente.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este menú",
        });
      }
    } else {
      // Usuarios normales solo pueden eliminar menús de su restaurante
      if (request.user_info.restaurante_id !== menuExistente.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este menú",
        });
      }
    }

    // Cambiar el estado activo a false
    const { error } = await client
      .from("menu")
      .update({ activo: false })
      .eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return reply.code(400).send({
          success: false,
          message:
            "No se puede eliminar este menú porque tiene registros relacionados",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      message: "Menú eliminado exitosamente",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al eliminar menú",
    });
  }
};

export const getMenuConsumos = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    const menuAccess = await getMenuWithAccess(request, id);
    if (!menuAccess.ok) {
      return reply.code(menuAccess.status).send({
        success: false,
        message: menuAccess.message,
      });
    }

    const { data, error } = await menuAccess.client
      .from("menu_inventario_consumos")
      .select(
        "id, inventario_id, cantidad, inventario:inventario_id(id, nombre, unidad_medida, restaurante_id, activo)"
      )
      .eq("menu_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener consumos del menú",
    });
  }
};

export const updateMenuConsumos = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);
  const { consumos } = (request.body as any) as { consumos?: MenuConsumoInput[] };

  try {
    const menuAccess = await getMenuWithAccess(request, id);
    if (!menuAccess.ok) {
      return reply.code(menuAccess.status).send({
        success: false,
        message: menuAccess.message,
      });
    }

    if (!Array.isArray(consumos)) {
      return reply.code(400).send({
        success: false,
        message: "Debes enviar consumos como un array",
      });
    }

    const invalid = consumos.find(
      (c) =>
        !c?.inventario_id ||
        Number.isNaN(Number(c.cantidad)) ||
        Number(c.cantidad) <= 0
    );
    if (invalid) {
      return reply.code(400).send({
        success: false,
        message: "Cada consumo requiere inventario_id y cantidad > 0",
      });
    }

    const inventarioIds = [...new Set(consumos.map((c) => c.inventario_id))];
    if (inventarioIds.length > 0) {
      const { data: inventarioRows, error: inventarioError } = await menuAccess.client
        .from("inventario")
        .select("id, restaurante_id, activo")
        .in("id", inventarioIds);

      if (inventarioError) throw inventarioError;
      if ((inventarioRows || []).length !== inventarioIds.length) {
        return reply.code(400).send({
          success: false,
          message: "Uno o más productos de inventario no existen",
        });
      }

      const fueraDeRestaurante = (inventarioRows || []).find(
        (row: any) => row.restaurante_id !== menuAccess.menu.restaurante_id
      );
      if (fueraDeRestaurante) {
        return reply.code(400).send({
          success: false,
          message: "Todos los productos deben pertenecer al mismo restaurante del menú",
        });
      }
    }

    const { error: deleteError } = await menuAccess.client
      .from("menu_inventario_consumos")
      .delete()
      .eq("menu_id", id);
    if (deleteError) throw deleteError;

    if (consumos.length > 0) {
      const rows = consumos.map((c) => ({
        menu_id: id,
        inventario_id: c.inventario_id,
        cantidad: Number(c.cantidad),
      }));

      const { error: insertError } = await menuAccess.client
        .from("menu_inventario_consumos")
        .insert(rows);
      if (insertError) throw insertError;
    }

    return reply.code(200).send({
      success: true,
      message: "Consumos de inventario actualizados",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al actualizar consumos del menú",
    });
  }
};
