import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los ítems de pedido
export const getPedidoItems = async (req: Request, res: Response) => {
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
      .from("pedido_items")
      .select(
        `
        *,
        menu(id, nombre, descripcion, imagen),
        pedidos(
          id,
          estado,
          restaurante_id,
          restaurantes(nombre_restaurante)
        )
      `
      );

    // Filtrar por restaurante según rol
    if (id_rol === 1) {
      // Super Admin ve todos los items
    } else if (id_rol === 2) {
      // Admin ve items de pedidos de sus restaurantes
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (restaurantIds.length > 0) {
        // Filtrar items cuyos pedidos pertenezcan a los restaurantes del admin
        const { data: pedidosAdmin } = await client
          .from("pedidos")
          .select("id")
          .in("restaurante_id", restaurantIds);

        const pedidoIds = pedidosAdmin?.map((p: any) => p.id) || [];
        
        if (pedidoIds.length > 0) {
          query = query.in("pedido_id", pedidoIds);
        } else {
          // Si no tiene pedidos, devolver vacío
          return res.status(200).json({
            success: true,
            data: [],
          });
        }
      } else {
        // Si no tiene restaurantes, devolver vacío
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
    } else {
      // Usuarios normales solo ven items de pedidos de su restaurante
      const restaurante_id = req.user_info?.restaurante_id;
      if (!restaurante_id) {
        return res.status(403).json({
          success: false,
          message: "El usuario no tiene un restaurante asignado",
        });
      }

      const { data: pedidosUsuario } = await client
        .from("pedidos")
        .select("id")
        .eq("restaurante_id", restaurante_id);

      const pedidoIds = pedidosUsuario?.map((p: any) => p.id) || [];
      
      if (pedidoIds.length > 0) {
        query = query.in("pedido_id", pedidoIds);
      } else {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los ítems de pedido",
    });
    return;
  }
};

// Obtener un ítem de pedido por ID
export const getPedidoItemById = async (req: Request, res: Response) => {
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
    const { data, error } = await client
      .from("pedido_items")
      .select(
        `
        *,
        menu(id, nombre, descripcion, imagen),
        pedidos(
          id,
          estado,
          restaurante_id,
          restaurantes(nombre_restaurante)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
        return;
      }
      throw error;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    const pedidoRestauranteId = (data.pedidos as any)?.restaurante_id;

    if (id_rol === 1) {
      // Super Admin puede ver cualquier item
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(pedidoRestauranteId)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden ver items de pedidos de su restaurante
      if (req.user_info.restaurante_id !== pedidoRestauranteId) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
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
      message: error.message || "Error al obtener el ítem de pedido",
    });
    return;
  }
};

// Obtener ítems por pedido
export const getItemsByPedidoId = async (req: Request, res: Response) => {
  const { pedido_id } = req.params;

  console.log("Buscando items para pedido_id:", pedido_id);

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    const client = supabaseAdmin || supabase;

    // Primero verificar que el pedido existe y obtener su restaurante_id
    const { data: pedido, error: pedidoError } = await client
      .from("pedidos")
      .select("id, restaurante_id")
      .eq("id", pedido_id)
      .single();

    if (pedidoError || !pedido) {
      res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede ver items de cualquier pedido
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(pedido.restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este pedido",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden ver items de pedidos de su restaurante
      if (req.user_info.restaurante_id !== pedido.restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este pedido",
        });
        return;
      }
    }

    // Obtener items del pedido
    const { data, error } = await client
      .from("pedido_items")
      .select("*")
      .eq("pedido_id", pedido_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error de Supabase:", error);
      throw error;
    }

    console.log("Items encontrados:", data?.length || 0);

    res.status(200).json({
      success: true,
      data: data || [],
    });
    return;
  } catch (error: any) {
    console.error("Error completo:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los ítems del pedido",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
    return;
  }
};

// Crear un nuevo ítem de pedido
export const createPedidoItem = async (req: Request, res: Response) => {
  const {
    pedido_id,
    menu_id,
    nombre_menu,
    cantidad = 1,
    precio_unitario,
    impuesto_unitario = 0,
    total_item,
    notas,
    enviado_a_cocina = false,
  } = req.body;

  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    if (!pedido_id) {
      res.status(400).json({
        success: false,
        message: "El pedido_id es requerido",
      });
      return;
    }

    const client = supabaseAdmin || supabase;

    // Primero verificar que el pedido existe y obtener su restaurante_id
    const { data: pedido, error: pedidoError } = await client
      .from("pedidos")
      .select("id, restaurante_id")
      .eq("id", pedido_id)
      .single();

    if (pedidoError || !pedido) {
      res.status(404).json({
        success: false,
        message: "Pedido no encontrado",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede crear items en cualquier pedido
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(pedido.restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este pedido",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden crear items en pedidos de su restaurante
      if (req.user_info.restaurante_id !== pedido.restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este pedido",
        });
        return;
      }
    }

    const { data, error } = await client
      .from("pedido_items")
      .insert([
        {
          pedido_id,
          menu_id,
          nombre_menu,
          cantidad,
          precio_unitario,
          impuesto_unitario,
          total_item: total_item || precio_unitario * cantidad,
          notas,
          enviado_a_cocina,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: "Ítem de pedido creado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear el ítem de pedido",
    });
    return;
  }
};

// Actualizar un ítem de pedido
export const updatePedidoItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  // Si se actualiza la cantidad o el precio, recalcular el total
  if (updates.cantidad || updates.precio_unitario) {
    const cantidad = updates.cantidad || req.body.cantidad_actual;
    const precio = updates.precio_unitario || req.body.precio_actual;
    updates.total_item = cantidad * precio;
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

    // Primero obtener el item y su pedido para verificar permisos
    const { data: itemExistente, error: itemError } = await client
      .from("pedido_items")
      .select(`
        id,
        pedido_id,
        pedidos:pedido_id (
          id,
          restaurante_id
        )
      `)
      .eq("id", id)
      .single();

    if (itemError || !itemExistente) {
      res.status(404).json({
        success: false,
        message: "Ítem de pedido no encontrado",
      });
      return;
    }

    const pedidoRestauranteId = (itemExistente.pedidos as any)?.restaurante_id;

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier item
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(pedidoRestauranteId)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden actualizar items de pedidos de su restaurante
      if (req.user_info.restaurante_id !== pedidoRestauranteId) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
        return;
      }
    }

    const { data, error } = await client
      .from("pedido_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
      message: "Ítem de pedido actualizado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar el ítem de pedido",
    });
    return;
  }
};

// Eliminar un ítem de pedido
export const deletePedidoItem = async (req: Request, res: Response) => {
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

    // Primero obtener el item y su pedido para verificar permisos
    const { data: itemExistente, error: itemError } = await client
      .from("pedido_items")
      .select(`
        id,
        pedido_id,
        pedidos:pedido_id (
          id,
          restaurante_id
        )
      `)
      .eq("id", id)
      .single();

    if (itemError || !itemExistente) {
      res.status(404).json({
        success: false,
        message: "Ítem de pedido no encontrado",
      });
      return;
    }

    const pedidoRestauranteId = (itemExistente.pedidos as any)?.restaurante_id;

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier item
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(pedidoRestauranteId)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden eliminar items de pedidos de su restaurante
      if (req.user_info.restaurante_id !== pedidoRestauranteId) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
        return;
      }
    }

    const { error } = await client.from("pedido_items").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Ítem de pedido eliminado exitosamente",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar el ítem de pedido",
    });
    return;
  }
};

// Marcar ítem como enviado a cocina
export const marcarEnviadoACocina = async (req: Request, res: Response) => {
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

    // Primero obtener el item y su pedido para verificar permisos
    const { data: itemExistente, error: itemError } = await client
      .from("pedido_items")
      .select(`
        id,
        pedido_id,
        pedidos:pedido_id (
          id,
          restaurante_id
        )
      `)
      .eq("id", id)
      .single();

    if (itemError || !itemExistente) {
      res.status(404).json({
        success: false,
        message: "Ítem de pedido no encontrado",
      });
      return;
    }

    const pedidoRestauranteId = (itemExistente.pedidos as any)?.restaurante_id;

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede marcar cualquier item
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      if (!restaurantIds.includes(pedidoRestauranteId)) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden marcar items de pedidos de su restaurante
      if (req.user_info.restaurante_id !== pedidoRestauranteId) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
        return;
      }
    }

    const { data, error } = await client
      .from("pedido_items")
      .update({ enviado_a_cocina: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
      message: "Ítem marcado como enviado a cocina",
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar el estado del ítem",
    });
    return;
  }
};

// Crear múltiples ítems de pedido en batch
export const createPedidoItemsBatch = async (req: Request, res: Response) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      success: false,
      message: "Se requiere un array de items no vacío",
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

    // Obtener todos los pedido_ids únicos de los items
    const pedidoIds = [...new Set(items.map((item: any) => item.pedido_id))];

    if (pedidoIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Todos los items deben tener un pedido_id válido",
      });
      return;
    }

    // Verificar que todos los pedidos pertenezcan al restaurante del usuario
    const { data: pedidos, error: pedidosError } = await client
      .from("pedidos")
      .select("id, restaurante_id")
      .in("id", pedidoIds);

    if (pedidosError || !pedidos || pedidos.length !== pedidoIds.length) {
      res.status(400).json({
        success: false,
        message: "Uno o más pedidos no fueron encontrados",
      });
      return;
    }

    // Verificar permisos según rol
    const id_rol = req.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede crear items en cualquier pedido
    } else if (id_rol === 2) {
      // Admin debe tener acceso a todos los restaurantes de los pedidos
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];
      
      const pedidosRestaurantes = pedidos.map((p: any) => p.restaurante_id);
      const todosPermitidos = pedidosRestaurantes.every((rid: string) => restaurantIds.includes(rid));
      
      if (!todosPermitidos) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a uno o más de los pedidos especificados",
        });
        return;
      }
    } else {
      // Usuarios normales solo pueden crear items en pedidos de su restaurante
      const pedidosRestaurantes = pedidos.map((p: any) => p.restaurante_id);
      const todosDelMismoRestaurante = pedidosRestaurantes.every(
        (rid: string) => rid === req.user_info.restaurante_id
      );
      
      if (!todosDelMismoRestaurante) {
        res.status(403).json({
          success: false,
          message: "No tienes acceso a uno o más de los pedidos especificados",
        });
        return;
      }
    }
    
    // Preparar los items para inserción, calculando totales si no se proporcionan
    const itemsToInsert = items.map((item: any) => {
      const {
        pedido_id,
        menu_id,
        nombre_menu,
        cantidad = 1,
        precio_unitario,
        impuesto_unitario = 0,
        total_item,
        notas,
        enviado_a_cocina = false,
      } = item;

      return {
        pedido_id,
        menu_id,
        nombre_menu,
        cantidad,
        precio_unitario,
        impuesto_unitario,
        total_item:
          total_item ||
          precio_unitario * cantidad + impuesto_unitario * cantidad,
        notas,
        enviado_a_cocina,
      };
    });

    // Insertar items de pedido
    const { data, error } = await client
      .from("pedido_items")
      .insert(itemsToInsert)
      .select();

    if (error) throw error;

    // Descontar stock para productos que requieren inventario
    for (const item of itemsToInsert) {
      // Verificar si el producto requiere inventario
      const { data: menu, error: menuError } = await client
        .from("menu")
        .select("requiere_inventario")
        .eq("id", item.menu_id)
        .single();

      if (!menuError && menu?.requiere_inventario) {
        // Obtener el inventario
        const { data: inventario, error: inventarioError } = await client
          .from("inventario")
          .select("id, stock_actual")
          .eq("menu_id", item.menu_id)
          .eq("activo", true)
          .single();

        if (!inventarioError && inventario) {
          // Verificar stock suficiente
          if (inventario.stock_actual < item.cantidad) {
            console.warn(
              `Stock insuficiente para ${item.nombre_menu}. Stock: ${inventario.stock_actual}, Solicitado: ${item.cantidad}`
            );
            // Continuar pero registrar el problema
          }

          // Crear movimiento de salida
          const { error: movimientoError } = await client
            .from("movimientos_inventario")
            .insert({
              inventario_id: inventario.id,
              tipo_movimiento: "salida",
              cantidad: item.cantidad,
              motivo: `Venta - Pedido ${item.pedido_id}`,
              referencia: item.pedido_id,
              usuario_id: req.user_info.id,
            });

          if (movimientoError) {
            console.error(
              `Error al crear movimiento de inventario para ${item.nombre_menu}:`,
              movimientoError
            );
            // No fallar el pedido por esto, solo registrar
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      data,
      message: `${data.length} ítems de pedido creados exitosamente`,
    });
    return;
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear los ítems de pedido",
    });
    return;
  }
};
