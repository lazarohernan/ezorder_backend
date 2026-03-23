import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

const aplicarConsumosInventarioPorItems = async (
  client: any,
  userId: string,
  items: Array<{
    pedido_id: string;
    menu_id?: string | null;
    nombre_menu?: string | null;
    cantidad: number;
  }>
) => {
  const menuIds = [...new Set(items.map((i) => i.menu_id).filter(Boolean))] as string[];
  if (!menuIds.length) return;

  const { data: consumosRows, error: consumosError } = await client
    .from("menu_inventario_consumos")
    .select("menu_id, inventario_id, cantidad")
    .in("menu_id", menuIds);
  if (consumosError) throw consumosError;

  const consumosByMenu = new Map<string, Array<{ inventario_id: string; cantidad: number }>>();
  for (const row of consumosRows || []) {
    if (!consumosByMenu.has(row.menu_id)) consumosByMenu.set(row.menu_id, []);
    consumosByMenu.get(row.menu_id)!.push({
      inventario_id: row.inventario_id,
      cantidad: Number(row.cantidad),
    });
  }

  for (const item of items) {
    if (!item.menu_id) continue;
    const relaciones = consumosByMenu.get(item.menu_id) || [];
    if (!relaciones.length) continue;

    for (const relacion of relaciones) {
      const cantidadDescontar = Number(item.cantidad || 0) * Number(relacion.cantidad || 0);
      if (cantidadDescontar <= 0) continue;

      const { error: movError } = await client.from("movimientos_inventario").insert({
        inventario_id: relacion.inventario_id,
        tipo_movimiento: "salida",
        cantidad: cantidadDescontar,
        motivo: `Venta - ${item.nombre_menu || "Menú"} - Pedido ${item.pedido_id}`,
        referencia: item.pedido_id,
        usuario_id: userId,
      });

      if (movError) {
        console.error("Error al registrar salida de inventario:", movError);
      }
    }
  }
};

// Obtener todos los ítems de pedido
export const getPedidoItems = async (request: FastifyRequest, reply: FastifyReply) => {
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
        .eq("usuario_id", request.user_info.id);

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
          return reply.code(200).send({
            success: true,
            data: [],
          });
        }
      } else {
        // Si no tiene restaurantes, devolver vacío
        return reply.code(200).send({
          success: true,
          data: [],
        });
      }
    } else {
      // Usuarios normales solo ven items de pedidos de su restaurante
      const restaurante_id = request.user_info?.restaurante_id;
      if (!restaurante_id) {
        return reply.code(403).send({
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
        return reply.code(200).send({
          success: true,
          data: [],
        });
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener los ítems de pedido",
    });
  }
};

// Obtener un ítem de pedido por ID
export const getPedidoItemById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
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
        return reply.code(404).send({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
      }
      throw error;
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    const pedidoRestauranteId = (data.pedidos as any)?.restaurante_id;

    if (id_rol === 1) {
      // Super Admin puede ver cualquier item
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(pedidoRestauranteId)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
      }
    } else {
      // Usuarios normales solo pueden ver items de pedidos de su restaurante
      if (request.user_info.restaurante_id !== pedidoRestauranteId) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
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
      message: error.message || "Error al obtener el ítem de pedido",
    });
  }
};

// Obtener ítems por pedido
export const getItemsByPedidoId = async (request: FastifyRequest, reply: FastifyReply) => {
  const { pedido_id } = (request.params as any);

  console.log("Buscando items para pedido_id:", pedido_id);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const client = supabaseAdmin || supabase;

    // Primero verificar que el pedido existe y obtener su restaurante_id
    const { data: pedido, error: pedidoError } = await client
      .from("pedidos")
      .select("id, restaurante_id")
      .eq("id", pedido_id)
      .single();

    if (pedidoError || !pedido) {
      return reply.code(404).send({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede ver items de cualquier pedido
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(pedido.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
        });
      }
    } else {
      // Usuarios normales solo pueden ver items de pedidos de su restaurante
      if (request.user_info.restaurante_id !== pedido.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
        });
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

    return reply.code(200).send({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error("Error completo:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener los ítems del pedido",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Crear un nuevo ítem de pedido
export const createPedidoItem = async (request: FastifyRequest, reply: FastifyReply) => {
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
  } = (request.body as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!pedido_id) {
      return reply.code(400).send({
        success: false,
        message: "El pedido_id es requerido",
      });
    }

    const client = supabaseAdmin || supabase;

    // Primero verificar que el pedido existe y obtener su restaurante_id
    const { data: pedido, error: pedidoError } = await client
      .from("pedidos")
      .select("id, restaurante_id")
      .eq("id", pedido_id)
      .single();

    if (pedidoError || !pedido) {
      return reply.code(404).send({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede crear items en cualquier pedido
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(pedido.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
        });
      }
    } else {
      // Usuarios normales solo pueden crear items en pedidos de su restaurante
      if (request.user_info.restaurante_id !== pedido.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
        });
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

    await aplicarConsumosInventarioPorItems(client, request.user_info.id, [
      {
        pedido_id,
        menu_id: menu_id || null,
        nombre_menu: nombre_menu || null,
        cantidad: Number(cantidad || 0),
      },
    ]);

    return reply.code(201).send({
      success: true,
      data,
      message: "Ítem de pedido creado exitosamente",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al crear el ítem de pedido",
    });
  }
};

// Actualizar un ítem de pedido
export const updatePedidoItem = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);
  const updates = (request.body as any);

  // Si se actualiza la cantidad o el precio, recalcular el total
  if (updates.cantidad || updates.precio_unitario) {
    const cantidad = updates.cantidad || updates.cantidad_actual;
    const precio = updates.precio_unitario || updates.precio_actual;
    updates.total_item = cantidad * precio;
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
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
      return reply.code(404).send({
        success: false,
        message: "Ítem de pedido no encontrado",
      });
    }

    const pedidoRestauranteId = (itemExistente.pedidos as any)?.restaurante_id;

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier item
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(pedidoRestauranteId)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
      }
    } else {
      // Usuarios normales solo pueden actualizar items de pedidos de su restaurante
      if (request.user_info.restaurante_id !== pedidoRestauranteId) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
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
        return reply.code(404).send({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      data,
      message: "Ítem de pedido actualizado exitosamente",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al actualizar el ítem de pedido",
    });
  }
};

// Eliminar un ítem de pedido
export const deletePedidoItem = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
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
      return reply.code(404).send({
        success: false,
        message: "Ítem de pedido no encontrado",
      });
    }

    const pedidoRestauranteId = (itemExistente.pedidos as any)?.restaurante_id;

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier item
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(pedidoRestauranteId)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
      }
    } else {
      // Usuarios normales solo pueden eliminar items de pedidos de su restaurante
      if (request.user_info.restaurante_id !== pedidoRestauranteId) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
      }
    }

    const { error } = await client.from("pedido_items").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      message: "Ítem de pedido eliminado exitosamente",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al eliminar el ítem de pedido",
    });
  }
};

// Marcar ítem como enviado a cocina
export const marcarEnviadoACocina = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
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
      return reply.code(404).send({
        success: false,
        message: "Ítem de pedido no encontrado",
      });
    }

    const pedidoRestauranteId = (itemExistente.pedidos as any)?.restaurante_id;

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede marcar cualquier item
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(pedidoRestauranteId)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
      }
    } else {
      // Usuarios normales solo pueden marcar items de pedidos de su restaurante
      if (request.user_info.restaurante_id !== pedidoRestauranteId) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este ítem de pedido",
        });
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
        return reply.code(404).send({
          success: false,
          message: "Ítem de pedido no encontrado",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      data,
      message: "Ítem marcado como enviado a cocina",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al actualizar el estado del ítem",
    });
  }
};

// Crear múltiples ítems de pedido en batch
export const createPedidoItemsBatch = async (request: FastifyRequest, reply: FastifyReply) => {
  const { items } = (request.body as any);

  if (!items || !Array.isArray(items) || items.length === 0) {
    return reply.code(400).send({
      success: false,
      message: "Se requiere un array de items no vacío",
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

    // Obtener todos los pedido_ids únicos de los items
    const pedidoIds = [...new Set(items.map((item: any) => item.pedido_id))];

    if (pedidoIds.length === 0) {
      return reply.code(400).send({
        success: false,
        message: "Todos los items deben tener un pedido_id válido",
      });
    }

    // Verificar que todos los pedidos pertenezcan al restaurante del usuario
    const { data: pedidos, error: pedidosError } = await client
      .from("pedidos")
      .select("id, restaurante_id")
      .in("id", pedidoIds);

    if (pedidosError || !pedidos || pedidos.length !== pedidoIds.length) {
      return reply.code(400).send({
        success: false,
        message: "Uno o más pedidos no fueron encontrados",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede crear items en cualquier pedido
    } else if (id_rol === 2) {
      // Admin debe tener acceso a todos los restaurantes de los pedidos
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      const pedidosRestaurantes = pedidos.map((p: any) => p.restaurante_id);
      const todosPermitidos = pedidosRestaurantes.every((rid: string) => restaurantIds.includes(rid));

      if (!todosPermitidos) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a uno o más de los pedidos especificados",
        });
      }
    } else {
      // Usuarios normales solo pueden crear items en pedidos de su restaurante
      const pedidosRestaurantes = pedidos.map((p: any) => p.restaurante_id);
      const todosDelMismoRestaurante = pedidosRestaurantes.every(
        (rid: string) => rid === request.user_info!.restaurante_id
      );

      if (!todosDelMismoRestaurante) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a uno o más de los pedidos especificados",
        });
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
    await aplicarConsumosInventarioPorItems(client, request.user_info.id, itemsToInsert);

    return reply.code(201).send({
      success: true,
      data,
      message: `${data.length} ítems de pedido creados exitosamente`,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al crear los ítems de pedido",
    });
  }
};
