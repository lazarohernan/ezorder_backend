import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Lock por restaurante para evitar race conditions al generar tickets
const ticketLocks = new Map<string, Promise<number>>();

// Función para generar el siguiente número de ticket consecutivo
const generarSiguienteTicket = async (restaurante_id: string): Promise<number> => {
  // Esperar a que termine cualquier generación en curso para este restaurante
  const pendingLock = ticketLocks.get(restaurante_id);
  if (pendingLock) {
    await pendingLock.catch(() => {});
  }

  const ticketPromise = (async () => {
    try {
      if (!supabaseAdmin) {
        console.error("❌ supabaseAdmin no está configurado");
        return 1;
      }

      const { data, error } = await supabaseAdmin
        .from("pedidos")
        .select("numero_ticket")
        .eq("restaurante_id", restaurante_id)
        .not("numero_ticket", "is", null)
        .order("numero_ticket", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Si no hay pedidos con ticket o hay error, empezar desde 1
        return 1;
      }

      return (data.numero_ticket || 0) + 1;
    } catch (error) {
      console.error("Error al generar siguiente ticket:", error);
      return 1;
    }
  })();

  ticketLocks.set(restaurante_id, ticketPromise);

  try {
    return await ticketPromise;
  } finally {
    ticketLocks.delete(restaurante_id);
  }
};

// Obtener todos los pedidos
export const getPedidos = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Error de configuración del servidor",
      });
    }

    const id_rol = request.user_info?.rol_id ?? 3;
    let query = supabaseAdmin
      .from("pedidos")
      .select(
        `
        *,
        clientes(*),
        restaurantes(id, nombre_restaurante)
      `
      );

    // Filtrar por restaurante según rol
    if (id_rol === 1) {
      // Super Admin ve todos los pedidos
    } else if (id_rol === 2) {
      // Admin ve pedidos de sus restaurantes
      const { data: userRestaurants } = await supabaseAdmin
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
      // Usuarios normales solo ven pedidos de su restaurante
      const restaurante_id = request.user_info?.restaurante_id;
      if (!restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "El usuario no tiene un restaurante asignado",
        });
      }
      query = query.eq("restaurante_id", restaurante_id);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener los pedidos",
    });
  }
};

// Obtener un pedido por ID
export const getPedidoById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Error de configuración del servidor",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        `
        *,
        clientes(*),
        restaurantes(id, nombre_restaurante)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Pedido no encontrado",
        });
      }
      throw error;
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede ver cualquier pedido
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(data.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
        });
      }
    } else {
      // Usuarios normales solo pueden ver pedidos de su restaurante
      if (request.user_info.restaurante_id !== data.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
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
      message: error.message || "Error al obtener el pedido",
    });
  }
};

// Obtener pedidos por restaurante
export const getPedidosByRestauranteId = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { restaurante_id } = (request.params as any);

  console.log("restaurante_id", restaurante_id);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Error de configuración del servidor",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede ver pedidos de cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
      }
    } else {
      // Usuarios normales solo pueden ver pedidos de su restaurante
      if (request.user_info.restaurante_id !== restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
      }
    }

    // Usar supabaseAdmin para bypass de RLS en operaciones del backend
    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        `
        *,
        clientes(*),
        restaurantes(id, nombre_restaurante)
      `
      )
      .eq("restaurante_id", restaurante_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error al obtener pedidos por restaurante:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener los pedidos del restaurante",
    });
  }
};

// Crear un nuevo pedido
export const createPedido = async (request: FastifyRequest, reply: FastifyReply) => {
  console.log("🛒 Creando pedido - Datos recibidos:", JSON.stringify((request.body as any), null, 2));

  const {
    restaurante_id,
    cliente_id,
    usuario_id,
    mesa,
    tipo_pedido = "local",
    estado_pedido = "pendiente",
    notas,
    total = 0,
    subtotal = 0,
    impuesto = 0,
    descuento = 0,
    metodo_pago_id,
    pagado = false,
    fecha_entrega,
    direccion_entrega,
    importe_gravado,
    importe_exento,
    importe_exonerado,
    numero_ticket,
  } = (request.body as any);

  console.log("🎫 Número de ticket recibido:", numero_ticket);

  if (!metodo_pago_id) {
    console.log("❌ Error: método de pago no proporcionado");
    return reply.code(400).send({
      success: false,
      message: "El método de pago es requerido",
    });
  }

  if (!restaurante_id) {
    return reply.code(400).send({
      success: false,
      message: "El restaurante_id es requerido",
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
      // Super Admin puede crear pedidos en cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      if (!supabaseAdmin) {
        return reply.code(500).send({
          success: false,
          message: "Error de configuración del servidor",
        });
      }
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
      }
    } else {
      // Usuarios normales solo pueden crear pedidos en su restaurante
      if (request.user_info.restaurante_id !== restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No puedes crear pedidos para este restaurante",
        });
      }
    }

    // Validar que la caja esté abierta antes de crear el pedido
    if (!supabaseAdmin) {
      console.error("❌ Error: supabaseAdmin no configurado");
      return reply.code(500).send({
        success: false,
        message: "Error de configuración del servidor",
      });
    }

    console.log("🔍 Verificando estado de caja para restaurante:", restaurante_id);

    // Buscar caja abierta para el restaurante
    const { data: cajasAbiertas, error: cajaError } = await supabaseAdmin
      .from("caja")
      .select("id, estado, fecha_apertura")
      .eq("restaurante_id", restaurante_id)
      .eq("estado", "abierta")
      .limit(1);

    if (cajaError) {
      console.error("❌ Error al verificar estado de caja:", cajaError);
      return reply.code(500).send({
        success: false,
        message: "Error al verificar el estado de la caja",
      });
    }

    if (!cajasAbiertas || cajasAbiertas.length === 0) {
      console.log("❌ Error: No hay caja abierta para el restaurante:", restaurante_id);
      return reply.code(400).send({
        success: false,
        message: "No se puede crear el pedido. La caja debe estar abierta para realizar pedidos.",
      });
    }

    const cajaActual = cajasAbiertas[0];
    console.log("✅ Caja abierta verificada:", cajaActual.id, "Estado:", cajaActual.estado);
    // Si no se proporciona número de ticket, generarlo automáticamente
    let ticketFinal = numero_ticket;
    if (!ticketFinal) {
      console.log("🔄 Generando ticket automáticamente...");
      ticketFinal = await generarSiguienteTicket(restaurante_id);
      console.log("✅ Ticket generado:", ticketFinal);
    }

    // Automatización de estado: si está pagado, cambiar a "en_preparacion"
    let estadoFinal = estado_pedido;
    const ahora = new Date().toISOString();
    let en_preparacion_at: string | null = null;
    if (pagado && estado_pedido === "pendiente") {
      estadoFinal = "en_preparacion";
      en_preparacion_at = ahora;
      console.log("🔄 Pedido pagado, cambiando estado automáticamente a 'en_preparacion'");
    } else if (estado_pedido === "en_preparacion") {
      en_preparacion_at = ahora;
    }

    const pedidoParaInsertar = {
      restaurante_id,
      cliente_id: cliente_id || null,
      usuario_id: usuario_id || null,
      mesa,
      tipo_pedido,
      estado_pedido: estadoFinal,
      notas,
      total,
      subtotal,
      impuesto,
      descuento,
      metodo_pago_id,
      pagado,
      fecha_entrega,
      direccion_entrega,
      importe_gravado,
      importe_exento,
      importe_exonerado,
      numero_ticket: ticketFinal,
      en_preparacion_at,
    };

    console.log("📝 Pedido a insertar:", JSON.stringify(pedidoParaInsertar, null, 2));

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .insert([pedidoParaInsertar])
      .select()
      .single();

    if (error) {
      console.error("❌ Error de Supabase al insertar pedido:", error);
      throw error;
    }

    console.log("✅ Pedido creado exitosamente:", data);

    return reply.code(201).send({
      success: true,
      data,
      message: "Pedido creado exitosamente",
    });
  } catch (error: any) {
    console.error("❌ Error general al crear el pedido:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al crear el pedido",
    });
  }
};

// Actualizar un pedido
export const updatePedido = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);
  const updates = (request.body as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Error de configuración del servidor",
      });
    }

    // Primero obtener el pedido para verificar permisos
    const { data: pedidoExistente, error: errorBuscar } = await supabaseAdmin
      .from("pedidos")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !pedidoExistente) {
      return reply.code(404).send({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier pedido
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(pedidoExistente.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
        });
      }
    } else {
      // Usuarios normales solo pueden actualizar pedidos de su restaurante
      if (request.user_info.restaurante_id !== pedidoExistente.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
        });
      }
    }

    // Prevenir cambio de restaurante_id si se intenta modificar
    if (updates.restaurante_id && updates.restaurante_id !== pedidoExistente.restaurante_id) {
      return reply.code(403).send({
        success: false,
        message: "No puedes cambiar el restaurante de un pedido",
      });
    }

    // Registrar timestamps automáticos en cambios de estado
    if (updates.estado_pedido) {
      const ahora = new Date().toISOString();
      if (updates.estado_pedido === 'en_preparacion' && !updates.en_preparacion_at) {
        updates.en_preparacion_at = ahora;
      } else if (updates.estado_pedido === 'listo' && !updates.listo_at) {
        updates.listo_at = ahora;
      } else if (updates.estado_pedido === 'entregado' && !updates.entregado_at) {
        updates.entregado_at = ahora;
      }
    }

    console.log(`🔄 Actualizando pedido ${id} con:`, updates);

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.log(`❌ Pedido no encontrado: ${id}`);
        return reply.code(404).send({
          success: false,
          message: "Pedido no encontrado",
        });
      }
      console.error("❌ Error al actualizar pedido:", error);
      throw error;
    }

    console.log(`✅ Pedido actualizado exitosamente: ${id}`);
    return reply.code(200).send({
      success: true,
      data,
      message: "Pedido actualizado exitosamente",
    });
  } catch (error: any) {
    console.error("❌ Error general al actualizar el pedido:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al actualizar el pedido",
    });
  }
};

// Eliminar un pedido
export const deletePedido = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Error de configuración del servidor",
      });
    }

    // Primero verificar que el pedido existe y obtener su restaurante_id
    const { data: pedidoExistente, error: errorBuscar } = await supabaseAdmin
      .from("pedidos")
      .select("id, restaurante_id, estado_pedido")
      .eq("id", id)
      .single();

    if (errorBuscar || !pedidoExistente) {
      return reply.code(404).send({
        success: false,
        message: "Pedido no encontrado",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier pedido
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del pedido
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(pedidoExistente.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
        });
      }
    } else {
      // Usuarios normales solo pueden eliminar pedidos de su restaurante
      if (request.user_info.restaurante_id !== pedidoExistente.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este pedido",
        });
      }
    }

    // Opcional: Validar reglas de negocio (por ejemplo, no permitir eliminar pedidos entregados)
    // Descomentar si es necesario:
    // if (pedidoExistente.estado_pedido === 'entregado') {
    //   return reply.code(400).send({
    //     success: false,
    //     message: "No se puede eliminar un pedido que ya fue entregado",
    //   });
    // }

    // Eliminar el pedido (los items del pedido se eliminan en cascada por la BD)
    const { error } = await supabaseAdmin.from("pedidos").delete().eq("id", id);

    if (error) {
      console.error('Error al eliminar pedido:', error);
      return reply.code(500).send({
        success: false,
        message: error.message || "Error al eliminar el pedido",
      });
    }

    return reply.code(200).send({
      success: true,
      message: "Pedido eliminado exitosamente",
      data: null,
    });
  } catch (error: any) {
    console.error('Error en deletePedido:', error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al eliminar el pedido",
    });
  }
};
