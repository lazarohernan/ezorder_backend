import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase, supabaseAdmin } from "../supabase/supabase";

export const getMetodosPago = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin no está configurado");
    }

    const { data, error } = await supabaseAdmin
      .from("metodos_de_pago")
      .select("*")
      .order("metodo", { ascending: true });

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error al obtener métodos de pago:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener los métodos de pago",
    });
  }
};

export const getMetodoPagoById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin no está configurado");
    }

    const { data, error } = await supabaseAdmin
      .from("metodos_de_pago")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Método de pago no encontrado",
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
      message: error.message || "Error al obtener el método de pago",
    });
  }
};

export const createMetodoPago = async (request: FastifyRequest, reply: FastifyReply) => {
  const { metodo, descripcion } = (request.body as any);

  if (!metodo) {
    return reply.code(400).send({
      success: false,
      message: "El campo 'metodo' es requerido",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      return reply.code(403).send({
        success: false,
        message: "Solo el Super Admin puede crear métodos de pago",
      });
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("metodos_de_pago")
      .insert([
        {
          metodo: metodo.trim(),
          descripcion: descripcion?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return reply.code(201).send({
      success: true,
      data,
      message: "Método de pago creado exitosamente",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al crear el método de pago",
    });
  }
};

export const updateMetodoPago = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);
  const { metodo, descripcion } = (request.body as any);

  if (!metodo) {
    return reply.code(400).send({
      success: false,
      message: "El campo 'metodo' es requerido",
    });
  }

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      return reply.code(403).send({
        success: false,
        message: "Solo el Super Admin puede actualizar métodos de pago",
      });
    }

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from("metodos_de_pago")
      .update({
        metodo: metodo.trim(),
        descripcion: descripcion?.trim() || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Método de pago no encontrado",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      data,
      message: "Método de pago actualizado exitosamente",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al actualizar el método de pago",
    });
  }
};

export const deleteMetodoPago = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = (request.params as any);

  try {
    if (!request.user_info) {
      return reply.code(403).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const id_rol = request.user_info?.rol_id ?? 3;
    if (id_rol !== 1) {
      return reply.code(403).send({
        success: false,
        message: "Solo el Super Admin puede eliminar métodos de pago",
      });
    }

    const client = supabaseAdmin || supabase;
    const { data: pedidosConMetodo, error: errorVerificacion } = await client
      .from("pedidos")
      .select("id")
      .eq("metodo_pago_id", id)
      .limit(1);

    if (errorVerificacion) throw errorVerificacion;

    if (pedidosConMetodo && pedidosConMetodo.length > 0) {
      return reply.code(400).send({
        success: false,
        message:
          "No se puede eliminar el método de pago porque está siendo usado en pedidos existentes",
      });
    }

    const { error } = await client
      .from("metodos_de_pago")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return reply.code(404).send({
          success: false,
          message: "Método de pago no encontrado",
        });
      }
      throw error;
    }

    return reply.code(200).send({
      success: true,
      message: "Método de pago eliminado exitosamente",
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al eliminar el método de pago",
    });
  }
};
