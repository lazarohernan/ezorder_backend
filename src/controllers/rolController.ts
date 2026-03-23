import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

// Obtener todos los roles
export const getRoles = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("rol")
      .select("*")
      .order("rol", { ascending: true });

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener roles",
    });
  }
};

// Obtener un rol por ID
export const getRolById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    console.log(`Usuario ${request.user?.id} solicitó el rol ${id}`);

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("rol")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Rol no encontrado",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener rol",
    });
  }
};

// Crear un nuevo rol
export const createRol = async (request: FastifyRequest, reply: FastifyReply) => {
  const { rol } = (request.body as any);

  // Verificar que el nombre del rol sea proporcionado
  if (!rol) {
    return reply.code(400).send({
      success: false,
      message: "El nombre del rol es obligatorio",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Solo Super Admin puede crear roles básicos
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      return reply.code(403).send({
        success: false,
        message: "Solo el Super Admin puede crear roles",
      });
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("rol")
      .insert([{ rol }])
      .select()
      .single();

    if (error) throw error;

    return reply.code(201).send({
      success: true,
      message: "Rol creado exitosamente",
      data,
    });
  } catch (error: any) {
    console.error("Error al crear rol:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al crear rol",
    });
  }
};

// Actualizar un rol
export const updateRol = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);
  const { rol } = (request.body as any);

  // Verificar que se proporcione el campo para actualizar
  if (!rol) {
    return reply.code(400).send({
      success: false,
      message: "Se debe proporcionar el nombre del rol para actualizar",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Solo Super Admin puede actualizar roles básicos
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      return reply.code(403).send({
        success: false,
        message: "Solo el Super Admin puede actualizar roles",
      });
    }

    console.log(`Usuario ${request.user_info.id} está actualizando el rol ${id}`);

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("rol")
      .update({ rol })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Rol no encontrado",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      message: "Rol actualizado exitosamente",
      data,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al actualizar rol",
    });
  }
};

// Eliminar un rol
export const deleteRol = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    // Solo Super Admin puede eliminar roles básicos
    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      return reply.code(403).send({
        success: false,
        message: "Solo el Super Admin puede eliminar roles",
      });
    }

    console.log(`Usuario ${request.user_info.id} está eliminando el rol ${id}`);

    const client = supabaseAdmin || supabase;
    const { error } = await client.from("rol").delete().eq("id", id);

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      message: "Rol eliminado exitosamente",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al eliminar rol",
    });
  }
};
