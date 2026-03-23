import type { FastifyRequest, FastifyReply } from "fastify";
import { supabaseAdmin } from "../supabase/supabase";

// Obtener pedidos en preparación para la cocina de un restaurante
export const getPedidosCocina = async (request: FastifyRequest, reply: FastifyReply) => {
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

    const { restaurante_id } = (request.params as any);

    if (!restaurante_id) {
      return reply.code(400).send({
        success: false,
        message: "El ID del restaurante es requerido",
      });
    }

    // Verificar acceso al restaurante según rol
    const id_rol = request.user_info?.rol_id ?? 3;

    if (id_rol === 1) {
      // Super Admin: acceso a todo
    } else if (id_rol === 2) {
      // Admin: verificar que tiene acceso al restaurante
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", request.user_info.id);

      const restaurantIds =
        userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(restaurante_id)) {
        return reply.code(403).send({
          success: false,
          message: "No tiene acceso a este restaurante",
        });
      }
    } else {
      // Usuario normal: solo su restaurante asignado
      const userRestauranteId = request.user_info?.restaurante_id;
      if (userRestauranteId !== restaurante_id) {
        return reply.code(403).send({
          success: false,
          message: "No tiene acceso a este restaurante",
        });
      }
    }

    // Obtener pedidos en preparación con sus items de cocina
    const { data: pedidos, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        `
        id, numero_ticket, tipo_pedido, mesa, notas, created_at, estado_pedido,
        pedido_items(
          id, nombre_menu, cantidad, notas, enviado_a_cocina
        )
      `
      )
      .eq("restaurante_id", restaurante_id)
      .eq("estado_pedido", "en_preparacion")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return reply.code(200).send({
      success: true,
      data: pedidos || [],
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      message: error.message || "Error al obtener pedidos de cocina",
    });
  }
};
