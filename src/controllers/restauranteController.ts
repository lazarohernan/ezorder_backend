import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los restaurantes
export const getRestaurantes = async (request: FastifyRequest, reply: FastifyReply) => {
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

    // Verificar si es Super Admin (rol_id=1)
    const esSuperAdmin = request.user_info?.rol_id === 1 || request.user_info?.es_super_admin;

    // Verificar si es Admin/Propietario (rol_id=2)
    const esAdmin = request.user_info?.rol_id === 2;

    // Parámetro opcional para incluir restaurantes administrativos (ej. vista de caja)
    const { incluir_administrativo } = request.query as { incluir_administrativo?: string };
    const incluirAdministrativo = incluir_administrativo === "true";

    let data: any;
    let error: any;

    // Si el usuario es Super Admin, obtener todos los restaurantes
    if (esSuperAdmin) {
      let query = supabaseAdmin
        .from("restaurantes")
        .select("*")
        .order("nombre_restaurante", { ascending: true });
      if (!incluirAdministrativo) {
        query = query.eq("es_administrativo", false);
      }
      const { data: adminData, error: adminError } = await query;
      data = adminData;
      error = adminError;
    }
    // Si es Admin/Propietario, obtener solo los restaurantes donde es propietario
    else if (esAdmin) {
      const { data: userRestaurants, error: userError } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select(`
          restaurante_id,
          restaurantes (
            id,
            nombre_restaurante,
            direccion_restaurante,
            logo_restaurante,
            propietario_id,
            created_at,
            es_administrativo
          )
        `)
        .eq("usuario_id", request.user_info.id)
        .eq("es_propietario", true);

      if (userError) {
        error = userError;
        data = null;
      } else {
        data = userRestaurants
          ?.map((ur: any) => ur.restaurantes)
          .filter((r: any) => r && (incluirAdministrativo || !r.es_administrativo)) || [];
      }
    }
    // Staff (roles personalizados, cajero, etc.): restaurante en usuarios_info y/o usuarios_restaurantes
    else {
      const ids = new Set<string>();
      const restauranteDirecto = request.user_info?.restaurante_id;
      if (restauranteDirecto) {
        ids.add(restauranteDirecto);
      }

      const { data: userRestaurantRows, error: urError } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      if (urError) {
        console.error("getRestaurantes usuarios_restaurantes:", urError);
      } else {
        for (const row of userRestaurantRows || []) {
          if (row.restaurante_id) {
            ids.add(row.restaurante_id);
          }
        }
      }

      if (ids.size === 0) {
        return reply.code(403).send({
          success: false,
          message: "El usuario no tiene un restaurante asignado",
        });
      }

      let staffQuery = supabaseAdmin
        .from("restaurantes")
        .select("*")
        .in("id", [...ids])
        .order("nombre_restaurante", { ascending: true });
      if (!incluirAdministrativo) {
        staffQuery = staffQuery.eq("es_administrativo", false);
      }
      const { data: userRestaurantsData, error: listError } = await staffQuery;
      data = userRestaurantsData;
      error = listError;
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

// Obtener un restaurante por ID
export const getRestauranteById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };

  try {
    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Error de configuración del servidor",
      });
    }

    // Permitir acceso a su propio restaurante sin permiso especial
    const esSuperAdmin = request.user_info?.rol_id === 1 || request.user_info?.es_super_admin;
    const esAdmin = request.user_info?.rol_id === 2;
    let esPropio = request.user_info?.restaurante_id === id;

    if (!esPropio && !esSuperAdmin && !esAdmin && request.user_info?.id) {
      const { data: urRow } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id)
        .eq("restaurante_id", id)
        .maybeSingle();
      esPropio = Boolean(urRow);
    }

    if (!esPropio && !esSuperAdmin && !esAdmin) {
      return reply.code(403).send({
        success: false,
        message: "No tienes permiso para ver este restaurante",
      });
    }

    console.log(`Usuario ${request.user?.id} solicitó el restaurante ${id}`);

    const { data, error } = await supabaseAdmin
      .from("restaurantes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Restaurante no encontrado",
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

// Crear un nuevo restaurante
export const createRestaurante = async (request: FastifyRequest, reply: FastifyReply) => {
  const { nombre_restaurante, direccion_restaurante, logo_restaurante } =
    request.body as {
      nombre_restaurante?: string;
      direccion_restaurante?: string;
      logo_restaurante?: string;
    };

  // Verificar que el nombre del restaurante sea proporcionado
  if (!nombre_restaurante || nombre_restaurante.trim() === '') {
    return reply.code(400).send({
      success: false,
      message: "El nombre del restaurante es obligatorio",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(401).send({
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

    console.log(`Usuario ${request.user_info.id} (rol_id: ${request.user_info.rol_id}) está creando un restaurante`);

    // Insertar el restaurante con los datos limpios
    const restauranteData: any = {
      nombre_restaurante: nombre_restaurante.trim(),
    };

    // Solo agregar campos opcionales si tienen valor
    if (direccion_restaurante && direccion_restaurante.trim() !== '') {
      restauranteData.direccion_restaurante = direccion_restaurante.trim();
    }

    if (logo_restaurante && logo_restaurante.trim() !== '') {
      restauranteData.logo_restaurante = logo_restaurante.trim();
    }

    // Si el usuario es Admin/Propietario (rol_id=2), asignar como propietario
    if (request.user_info.rol_id === 2) {
      restauranteData.propietario_id = request.user_info.id;
      console.log(`Asignando propietario_id: ${request.user_info.id}`);
    }

    const { data, error } = await supabaseAdmin
      .from("restaurantes")
      .insert([restauranteData])
      .select()
      .single();

    if (error) {
      console.error("Error de Supabase al crear restaurante:", error);
      throw error;
    }

    console.log("Restaurante creado exitosamente:", data);

    // Si el usuario es Admin/Propietario (rol_id=2), crear relación en usuarios_restaurantes
    if (request.user_info.rol_id === 2 && data.id) {
      const { error: relacionError } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .insert([
          {
            usuario_id: request.user_info.id,
            restaurante_id: data.id,
            es_propietario: true,
          },
        ]);

      if (relacionError) {
        console.error("Error al crear relación usuario-restaurante:", relacionError);
        // No lanzamos error aquí, solo lo registramos, porque el restaurante ya se creó
      } else {
        console.log("Relación usuario-restaurante creada exitosamente");
      }
    }

    return reply.code(201).send({
      success: true,
      message: "Restaurante creado exitosamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al crear restaurante:", error);

    // Manejar errores específicos de Supabase
    if (error.code === '23505') { // Violación de unique constraint
      return reply.code(400).send({
        success: false,
        message: "Ya existe un restaurante con este nombre",
      });
    }

    if (error.code === 'PGRST116') { // No encontrado
      return reply.code(404).send({
        success: false,
        message: "Recurso no encontrado",
      });
    }

    throw error;
  }
};

// Actualizar un restaurante
export const updateRestaurante = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const { nombre_restaurante, direccion_restaurante, logo_restaurante } =
    request.body as {
      nombre_restaurante?: string;
      direccion_restaurante?: string;
      logo_restaurante?: string;
    };

  // Verificar que se proporcione al menos un campo para actualizar
  if (
    !nombre_restaurante &&
    direccion_restaurante === undefined &&
    logo_restaurante === undefined
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

    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Error de configuración del servidor",
      });
    }

    // Primero obtener el restaurante para verificar permisos
    const { data: restauranteExistente, error: errorBuscar } = await supabaseAdmin
      .from("restaurantes")
      .select("id, propietario_id")
      .eq("id", id)
      .single();

    if (errorBuscar || !restauranteExistente) {
      return reply.code(404).send({
        success: false,
        message: "Restaurante no encontrado",
      });
    }

    // Verificar permisos según rol
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol === 1) {
      // Super Admin puede actualizar cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
      }
    } else {
      // Usuarios normales no pueden actualizar restaurantes
      return reply.code(403).send({
        success: false,
        message: "No tienes permisos para actualizar restaurantes",
      });
    }

    console.log(
      `Usuario ${request.user_info.id} está actualizando el restaurante ${id}`
    );

    // Crear objeto con solo los campos proporcionados
    const updateFields: any = {};
    if (nombre_restaurante)
      updateFields.nombre_restaurante = nombre_restaurante;
    if (direccion_restaurante !== undefined)
      updateFields.direccion_restaurante = direccion_restaurante;
    if (logo_restaurante !== undefined)
      updateFields.logo_restaurante = logo_restaurante;

    const { data, error } = await supabaseAdmin
      .from("restaurantes")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Restaurante no encontrado",
        });
      }
      throw error;
    }

    return reply.send({
      success: true,
      message: "Restaurante actualizado exitosamente",
      data,
    });
  } catch (error: any) {
    throw error;
  }
};

// Eliminar un restaurante
export const deleteRestaurante = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };

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
      // Super Admin puede eliminar cualquier restaurante
    } else if (id_rol === 2) {
      // Admin debe tener acceso al restaurante
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds = userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(id)) {
        return reply.code(403).send({
          success: false,
          message: "No tienes acceso a este restaurante",
        });
      }
    } else {
      // Usuarios normales no pueden eliminar restaurantes
      return reply.code(403).send({
        success: false,
        message: "No tienes permisos para eliminar restaurantes",
      });
    }

    console.log(`Usuario ${request.user_info.id} está eliminando el restaurante ${id}`);

    const { error } = await supabaseAdmin.from("restaurantes").delete().eq("id", id);

    if (error) throw error;

    return reply.send({
      success: true,
      message: "Restaurante eliminado exitosamente",
    });
  } catch (error: any) {
    throw error;
  }
};
