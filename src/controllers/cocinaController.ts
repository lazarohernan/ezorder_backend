import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/supabase";

// Obtener pedidos en preparación para la cocina de un restaurante
export const getPedidosCocina = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    const { restaurante_id } = req.params;

    if (!restaurante_id) {
      res.status(400).json({
        success: false,
        message: "El ID del restaurante es requerido",
      });
      return;
    }

    // Verificar acceso al restaurante según rol
    const id_rol = req.user_info?.rol_id ?? 3;

    if (id_rol === 1) {
      // Super Admin: acceso a todo
    } else if (id_rol === 2) {
      // Admin: verificar que tiene acceso al restaurante
      const { data: userRestaurants } = await supabaseAdmin
        .from("usuarios_restaurantes")
        .select("restaurante_id")
        .eq("usuario_id", req.user_info.id);

      const restaurantIds =
        userRestaurants?.map((ur: any) => ur.restaurante_id) || [];

      if (!restaurantIds.includes(restaurante_id)) {
        res.status(403).json({
          success: false,
          message: "No tiene acceso a este restaurante",
        });
        return;
      }
    } else {
      // Usuario normal: solo su restaurante asignado
      const userRestauranteId = req.user_info?.restaurante_id;
      if (userRestauranteId !== restaurante_id) {
        res.status(403).json({
          success: false,
          message: "No tiene acceso a este restaurante",
        });
        return;
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

    res.status(200).json({
      success: true,
      data: pedidos || [],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener pedidos de cocina",
    });
  }
};
