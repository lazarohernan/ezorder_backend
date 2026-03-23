import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los clientes
export const getClientes = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Obtener el rol del usuario
    const id_rol = request.user_info?.rol_id ?? 3;

    let data: any;
    let error: any;

    // USAR supabaseAdmin para bypassear RLS - el backend controla los permisos
    const client = supabaseAdmin || supabase;

    // Si el usuario es Super Admin (rol_id=1), obtener todos los clientes
    if (id_rol === 1) {
      const { data: adminData, error: adminError } = await client
        .from("clientes")
        .select("*, restaurantes(nombre_restaurante)")
        .order("nombre_cliente", { ascending: true });
      data = adminData;
      error = adminError;
    }
    // Si es Admin/Propietario (rol_id=2), obtener clientes de TODOS sus restaurantes
    else if (id_rol === 2) {
      // Obtener los IDs de todos los restaurantes del Admin
      const { data: userRestaurants, error: restaurantsError } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      if (restaurantsError) {
        error = restaurantsError;
        data = null;
      } else {
        const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

        if (restaurantIds.length === 0) {
          data = [];
          error = null;
        } else {
          // Obtener clientes de todos los restaurantes del Admin
          const { data: clientesData, error: clientesError } = await client
            .from("clientes")
            .select("*, restaurantes(nombre_restaurante)")
            .in("restaurante_id", restaurantIds)
            .order("nombre_cliente", { ascending: true });
          data = clientesData;
          error = clientesError;
        }
      }
    }
    // Usuarios normales solo ven clientes de su restaurante asignado
    else {
      const restaurante_id = request.user_info?.restaurante_id;

      if (!restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "El usuario no tiene un restaurante asignado",
        });
      }

      const { data: userClientes, error: userError } = await client
        .from("clientes")
        .select("*, restaurantes(nombre_restaurante)")
        .eq("restaurante_id", restaurante_id)
        .order("nombre_cliente", { ascending: true });
      data = userClientes;
      error = userError;
    }

    if (error) {
      console.log("error:", error);
      throw error;
    }

    return reply.send({
      success: true,
      data,
    });
  } catch (error: any) {
    throw error;
  }
};

// Obtener todos los clientes por restaurante
export const getClientesByRestauranteId = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const { restaurante_id } = request.params as { restaurante_id: string };
    const id_rol = request.user_info?.rol_id ?? 3;

    // Verificar permisos según rol
    if (id_rol === 1) {
      // Super Admin puede ver todos los clientes
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const adminClient = supabaseAdmin || supabase;
      const { data: userRestaurants, error: restaurantsError } = await adminClient
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
      // Usuarios normales solo pueden ver su restaurante
      if (request.user_info.restaurante_id !== restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
      }
    }

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("clientes")
      .select("*, restaurantes(nombre_restaurante)")
      .eq("restaurante_id", restaurante_id)
      .order("nombre_cliente", { ascending: true });

    if (error) {
      console.log("error:", error);
      throw error;
    }

    return reply.send({
      success: true,
      data,
    });
  } catch (error: any) {
    throw error;
  }
};

// Obtener un cliente por ID
export const getClienteById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };

  try {
    console.log(`Usuario ${request.user?.id} solicitó el cliente ${id}`);

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("clientes")
      .select("*, restaurantes(nombre_restaurante)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Cliente no encontrado",
        });
      }
      throw error;
    }

    return reply.send({
      success: true,
      data,
    });
  } catch (error: any) {
    throw error;
  }
};

// Crear un nuevo cliente
export const createCliente = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const {
      restaurante_id,
      nombre_cliente,
      rtn_cliente,
      tel_cliente,
      correo_cliente,
    } = request.body as {
      restaurante_id?: string;
      nombre_cliente?: string;
      rtn_cliente?: string;
      tel_cliente?: string;
      correo_cliente?: string;
    };

    // Verificar que los campos obligatorios sean proporcionados
    if (!nombre_cliente || !restaurante_id) {
      return reply.code(400).send({
        success: false,
        message: "El nombre del cliente y el id del restaurante son obligatorios",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;

    if (id_rol === 1) {
      // Super Admin puede crear clientes en cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const adminClient = supabaseAdmin || supabase;
      const { data: userRestaurants, error: restaurantsError } = await adminClient
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
      // Usuarios normales solo pueden crear clientes en su restaurante
      if (request.user_info.restaurante_id !== restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No puedes crear clientes para este restaurante",
        });
      }
    }

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("clientes")
      .insert([
        {
          restaurante_id,
          nombre_cliente,
          rtn_cliente,
          tel_cliente,
          correo_cliente,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return reply.code(201).send({
      success: true,
      message: "Cliente creado exitosamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al crear cliente:", error);
    throw error;
  }
};

// Actualizar un cliente
export const updateCliente = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const {
    restaurante_id,
    nombre_cliente,
    rtn_cliente,
    tel_cliente,
    correo_cliente,
  } = request.body as {
    restaurante_id?: string;
    nombre_cliente?: string;
    rtn_cliente?: string;
    tel_cliente?: string;
    correo_cliente?: string;
  };

  // Verificar que se proporcione al menos un campo para actualizar
  if (
    !nombre_cliente &&
    restaurante_id === undefined &&
    rtn_cliente === undefined &&
    tel_cliente === undefined &&
    correo_cliente === undefined
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

    console.log(`Usuario ${request.user_info.id} está actualizando el cliente ${id}`);

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;

    // Primero obtener el cliente para verificar permisos
    const { data: clienteExistente, error: errorBuscar } = await client
      .from("clientes")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !clienteExistente) {
      return reply.code(404).send({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier cliente
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del cliente
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(clienteExistente.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este cliente",
        });
      }
    } else {
      // Usuarios normales solo pueden actualizar clientes de su restaurante
      if (request.user_info.restaurante_id !== clienteExistente.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este cliente",
        });
      }
    }

    // Prevenir cambio de restaurante_id si se intenta modificar
    if (restaurante_id && restaurante_id !== clienteExistente.restaurante_id) {
      return reply.code(403).send({
        success: false,
        message: "No puedes cambiar el restaurante de un cliente",
      });
    }

    // Crear objeto con solo los campos proporcionados
    const updateFields: any = {};
    if (nombre_cliente) updateFields.nombre_cliente = nombre_cliente;
    if (rtn_cliente !== undefined) updateFields.rtn_cliente = rtn_cliente;
    if (tel_cliente !== undefined) updateFields.tel_cliente = tel_cliente;
    if (correo_cliente !== undefined)
      updateFields.correo_cliente = correo_cliente;

    const { data, error } = await client
      .from("clientes")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Cliente no encontrado",
        });
      }
      throw error;
    }

    return reply.send({
      success: true,
      message: "Cliente actualizado exitosamente",
      data,
    });
  } catch (error: any) {
    throw error;
  }
};

// Eliminar un cliente
export const deleteCliente = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    console.log(`Usuario ${request.user_info.id} está eliminando el cliente ${id}`);

    // Usar supabaseAdmin para bypassear RLS
    const client = supabaseAdmin || supabase;

    // Primero obtener el cliente para verificar permisos
    const { data: clienteExistente, error: errorBuscar } = await client
      .from("clientes")
      .select("id, restaurante_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !clienteExistente) {
      return reply.code(404).send({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede eliminar cualquier cliente
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante del cliente
      const { data: userRestaurants } = await client
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(clienteExistente.restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este cliente",
        });
      }
    } else {
      // Usuarios normales solo pueden eliminar clientes de su restaurante
      if (request.user_info.restaurante_id !== clienteExistente.restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este cliente",
        });
      }
    }

    const { error } = await client.from("clientes").delete().eq("id", id);

    if (error) throw error;

    return reply.send({
      success: true,
      message: "Cliente eliminado exitosamente",
    });
  } catch (error: any) {
    throw error;
  }
};
